const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const jwt = require('jsonwebtoken');

const ROOMS_TABLE = process.env.ROOMS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

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

module.exports.createRoom = async (event) => {
  // Dynamically import nanoid
  const { nanoid } = await import('nanoid');
  
  const body = JSON.parse(event.body);
  const { name } = body;

  if (!name) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Room name is required." }),
    };
  }

  // Generate a shorter ID using nanoid
  const roomId = `room-${nanoid(10)}`;
  const createdAt = new Date().toISOString();

  const params = {
    TableName: ROOMS_TABLE,
    Item: {
      roomId,
      name,
      players: [],
      createdAt,
    },
    ConditionExpression: "attribute_not_exists(roomId)",
  };

  try {
    await docClient.send(new PutCommand(params));
    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ roomId, name, players: [], createdAt }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create room." }),
    };
  }
};

module.exports.listRooms = async () => {
  const params = {
    TableName: ROOMS_TABLE,
  };

  try {
    const { Items } = await docClient.send(new ScanCommand(params));
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ rooms: Items }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not list rooms." }),
    };
  }
};

module.exports.getRoom = async (event) => {
  const { roomId } = event.pathParameters;

  try {
    const params = {
      TableName: ROOMS_TABLE,
      Key: { roomId },
    };

    const { Item } = await docClient.send(new GetCommand(params));

    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Room not found' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(Item),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not retrieve room details' }),
    };
  }
};

module.exports.joinRoom = async (event) => {
  const { roomId } = event.pathParameters;
  const body = JSON.parse(event.body);
  const { token } = body; // Changed from email to token

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Token is required to join a room." }),
    };
  }

  try {
    // Decode the token to get the email
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const params = {
      TableName: ROOMS_TABLE,
      Key: { roomId },
      UpdateExpression: "SET players = list_append(if_not_exists(players, :empty_list), :newPlayer)",
      ExpressionAttributeValues: {
        ":newPlayer": [email],
        ":empty_list": []
      },
      ReturnValues: "ALL_NEW"
    };

    const { Attributes } = await docClient.send(new UpdateCommand(params));
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(Attributes),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not join room." }),
    };
  }
};

module.exports.leaveRoom = async (event) => {
  const { roomId } = event.pathParameters;
  const body = JSON.parse(event.body);
  const { token } = body;
  
  // Get token from Authorization header if not in body
  const authHeader = event.headers.Authorization || event.headers.authorization;
  const tokenFromHeader = authHeader ? authHeader.replace('Bearer ', '') : null;
  
  // Use token from body or header
  const userToken = token || tokenFromHeader;

  if (!userToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Authentication token is required to leave a room." }),
    };
  }

  try {
    // Decode the token to get the email
    const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
    const email = decoded.email;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Valid email not found in token." }),
      };
    }

    const getParams = {
      TableName: ROOMS_TABLE,
      Key: { roomId }
    };
    const { Item } = await docClient.send(new GetCommand(getParams));
    if (!Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Room not found." }),
      };
    }

    const updatedPlayers = Item.players.filter(p => p !== email);

    const updateParams = {
      TableName: ROOMS_TABLE,
      Key: { roomId },
      UpdateExpression: "SET players = :updatedPlayers",
      ExpressionAttributeValues: {
        ":updatedPlayers": updatedPlayers
      },
      ReturnValues: "ALL_NEW"
    };

    const { Attributes } = await docClient.send(new UpdateCommand(updateParams));
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(Attributes),
    };
  } catch (error) {
    console.error(error);
    
    // Provide more detailed error for token verification failures
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid token." }),
      };
    }
    
    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Token expired." }),
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not leave room." }),
    };
  }
};

module.exports.deleteRoom = async (event) => {
  const admin = await isAdmin(event);
  if (!admin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Access denied. Admin only." }),
    };
  }

  const { roomId } = event.pathParameters;
  if (!roomId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "roomId is required." }),
    };
  }

  const params = {
    TableName: ROOMS_TABLE,
    Key: { roomId: roomId }, // Kontrollera att DynamoDB-tabellen använder 'id' som primärnyckel
  };

  try {
    await docClient.send(new DeleteCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Room deleted successfully." }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not delete room." }),
    };
  }
};
