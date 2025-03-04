const AWS = require('aws-sdk');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const jwt = require('jsonwebtoken');

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
