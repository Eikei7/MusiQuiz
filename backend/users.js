const AWS = require('aws-sdk');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  GetCommand, 
  PutCommand,
  DeleteCommand,
  UpdateCommand } = require("@aws-sdk/lib-dynamodb");
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

module.exports.deleteUser = async (event) => {
  // Check if requester is admin
  const admin = await isAdmin(event);
  if (!admin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Access denied. Admin only." }),
    };
  }

  // Get email from path parameters
  const { email } = event.pathParameters;
  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email is required." }),
    };
  }

  const params = {
    TableName: USERS_TABLE,
    Key: { email },
  };

  try {
    // First, check if the user exists
    const { Item } = await docClient.send(new GetCommand(params));
    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found." }),
      };
    }

    // Delete the user
    await docClient.send(new DeleteCommand(params));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: "User deleted successfully." }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not delete user." }),
    };
  }
};

module.exports.updateUser = async (event) => {
  // Verify the user is authenticated
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Authentication required." }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  let userEmail;
  
  try {
    // Decode the token to get the user's email
    const decoded = jwt.verify(token, JWT_SECRET);
    userEmail = decoded.email;
  } catch (error) {
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Invalid token." }),
    };
  }

  const body = JSON.parse(event.body);
  console.log('Parsed body:', JSON.stringify(body));
  const { firstName, lastName, currentPassword, newPassword } = body;

  // First, get the current user data to verify the current password if needed
  const getUserParams = {
    TableName: USERS_TABLE,
    Key: { email: userEmail }
  };

  try {
    const { Item: user } = await docClient.send(new GetCommand(getUserParams));
    
    if (!user) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: "User not found." }),
      };
    }

    // If user is trying to change password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: "Current password is required to set a new password." }),
        };
      }

      const passwordValid = await bcrypt.compare(currentPassword, user.password);
      if (!passwordValid) {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ error: "Current password is incorrect." }),
        };
      }
    }

    // Prepare update expression and attribute values
    let updateExpression = "SET ";
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    if (firstName !== undefined) {
      updateExpression += "#fn = :firstName, ";
      expressionAttributeValues[":firstName"] = firstName;
      expressionAttributeNames["#fn"] = "firstName";
    }
    
    if (lastName !== undefined) {
      updateExpression += "#ln = :lastName, ";
      expressionAttributeValues[":lastName"] = lastName;
      expressionAttributeNames["#ln"] = "lastName";
    }
    
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateExpression += "#pw = :password, ";
      expressionAttributeValues[":password"] = hashedPassword;
      expressionAttributeNames["#pw"] = "password";
    }

    // Remove trailing comma and space
    updateExpression = updateExpression.slice(0, -2);
    
    // If nothing to update, return early
    if (Object.keys(expressionAttributeValues).length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: "No fields to update." }),
      };
    }

    const updateParams = {
      TableName: USERS_TABLE,
      Key: { email: userEmail },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: "UPDATED_NEW"
    };

    const result = await docClient.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: "User updated successfully.",
        updatedAttributes: result.Attributes
      }),
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: "Could not update user information." }),
    };
  }
};
const getUserFromEvent = async (event) => {
  try {
    // Check if Authorization header exists
    const authHeader = event.headers && (event.headers.Authorization || event.headers.authorization);
    if (!authHeader) {
      console.log('No authorization header found');
      return null;
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!decoded || !decoded.email) {
      console.log('Invalid token payload:', decoded);
      return null;
    }
    
    // Get user from database to ensure they exist
    const params = {
      TableName: USERS_TABLE,
      Key: { email: decoded.email }
    };
    
    const result = await docClient.send(new GetCommand(params));
    
    if (!result.Item) {
      console.log('User not found in database:', decoded.email);
      return null;
    }
    
    return result.Item;
  } catch (error) {
    console.error('Error getting user from event:', error);
    return null;
  }
};
module.exports.updateUserStats = async (event) => {
  const { email, gameWon } = JSON.parse(event.body);
  
  // Verify user authentication
  const user = await getUserFromEvent(event);
  if (!user || user.email !== email) {
    return {
      statusCode: 403,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }

  try {
    // Get current user data
    const getUserParams = {
      TableName: USERS_TABLE,
      Key: { email }
    };
    
    const userData = await docClient.send(new GetCommand(getUserParams));
    const currentUser = userData.Item;
    
    // Initialize stats if they don't exist
    if (!currentUser.stats) {
      currentUser.stats = {
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0
      };
    }
    
    // Update stats
    currentUser.stats.gamesPlayed += 1;
    
    if (gameWon) {
      currentUser.stats.gamesWon += 1;
    } else {
      currentUser.stats.gamesLost += 1;
    }
    
    // Calculate win rate
    currentUser.stats.winRate = Math.round(
      (currentUser.stats.gamesWon / currentUser.stats.gamesPlayed) * 100
    );
    
    // Save updated user
    const updateParams = {
      TableName: USERS_TABLE,
      Item: currentUser
    };
    
    await docClient.send(new PutCommand(updateParams));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ 
        message: "Stats updated successfully",
        stats: currentUser.stats
      })
    };
  } catch (error) {
    console.error('Error updating stats:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: "Failed to update stats" })
    };
  }
};

module.exports.getUserStats = async (event) => {
  // Verify user authentication
  const user = await getUserFromEvent(event);
  if (!user) {
    return {
      statusCode: 403,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }

  try {
    // Get current user data
    const getUserParams = {
      TableName: USERS_TABLE,
      Key: { email: user.email }
    };
    
    const userData = await docClient.send(new GetCommand(getUserParams));
    const currentUser = userData.Item;
    
    // Return default stats if none exist yet
    if (!currentUser.stats) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify({
          stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            winRate: 0
          }
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ stats: currentUser.stats })
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: "Failed to get stats" })
    };
  }
};

module.exports.getAllUserStats = async (event) => {
  // Verify admin access
  const user = await getUserFromEvent(event);
  if (!user || user.role !== 'admin') {
    return {
      statusCode: 403,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: "Access denied. Admin only." })
    };
  }

  try {
    // Scan the users table to get all users
    const params = {
      TableName: USERS_TABLE,
      ProjectionExpression: "email, firstName, lastName, stats, #role",
      ExpressionAttributeNames: {
        "#role": "role" // 'role' is a reserved word in DynamoDB
      }
    };
    
    const data = await docClient.send(new ScanCommand(params));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ users: data.Items })
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({ error: "Failed to fetch user statistics" })
    };
  }
};
