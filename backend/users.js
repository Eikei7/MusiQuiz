const AWS = require('aws-sdk');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  GetCommand, 
  PutCommand } = require("@aws-sdk/lib-dynamodb");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const USERS_TABLE = process.env.USERS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

// Middleware för att kontrollera admin
async function isAdmin(event) {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.role === 'admin';
  } catch (e) {
    return false;
  }
}

module.exports.listUsers = async (event) => {
  const admin = await isAdmin(event);
  if (!admin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Access denied. Admin only." }),
    };
  }

  const params = {
    TableName: USERS_TABLE,
  };

  try {
    const data = await docClient.send(new ScanCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ users: data.Items }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not retrieve users." }),
    };
  }
};
module.exports.registerUser = async (event) => {
  const body = JSON.parse(event.body);
  console.log('Parsed body:', JSON.stringify(body));
  const { firstName, lastName, email, password, confirmPassword } = body;

  // Check for required frontend fields
  if (!email || !password) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Email and password are required." }),
    };
  }

  // Check if passwords match (accepting confirmPassword from frontend)
  if (confirmPassword && password !== confirmPassword) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Passwords do not match." }),
    };
  }

  // Set default values for firstName and lastName if not provided
  const userFirstName = firstName || email.split('@')[0];
  const userLastName = lastName || '';

  const hashedPassword = await bcrypt.hash(password, 10);

  const params = {
    TableName: USERS_TABLE,
    Item: {
      email,
      firstName: userFirstName,
      lastName: userLastName,
      password: hashedPassword,
      role: body.role && body.role === "admin" ? "admin" : "user",
    },
    ConditionExpression: "attribute_not_exists(email)",
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: "User registered successfully." }),
    };
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: "User already exists." }),
      };
    }
    console.error(error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Could not register user." }),
    };
  }
};

module.exports.loginUser = async (event) => {
  const secret = process.env.JWT_SECRET;
  const body = JSON.parse(event.body);
  const { email, password } = body;

  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email and password are required." }),
    };
  }

  const params = {
    TableName: USERS_TABLE,
    Key: { email },
  };

  try {
    const { Item } = await docClient.send(new GetCommand(params));
    if (!Item) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid credentials." }),
      };
    }

    const valid = await bcrypt.compare(password, Item.password);
    if (!valid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid credentials." }),
      };
    }

    const token = jwt.sign({
      email: Item.email,
      id: Item.id,
      role: Item.role
    }, secret, { expiresIn: '1h' });

    const { password: _, ...userData } = Item;
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ token, userData }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not log in." }),
    };
  }
};
