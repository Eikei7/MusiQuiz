const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const bcrypt = require("bcryptjs");
const AWS = require("aws-sdk");
const jwt = require('jsonwebtoken');

const USERS_TABLE = process.env.USERS_TABLE;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

module.exports.registerUser = async (event) => {
  const body = JSON.parse(event.body);
  const { firstName, lastName, email, password, role } = body;

  if (!email || !password || !firstName || !lastName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "All fields are required." }),
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const params = {
    TableName: USERS_TABLE,
    Item: {
      email,
      firstName,
      lastName,
      password: hashedPassword,
      role: role && role === "admin" ? "admin" : "user",
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
      },
      body: JSON.stringify({ message: "User registered successfully." }),
    };
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "User already exists." }),
      };
    }
    console.error(error);
    return {
      statusCode: 500,
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