// Import DynamoDB from SDK v3
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

// Initialize the DynamoDB client
const dynamoClient = new DynamoDBClient();
const dynamoDb = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = 'WebSocketConnections2025';

module.exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const params = {
    TableName: TABLE_NAME,
    Item: { connectionId },
  };

  await dynamoDb.send(new PutCommand(params));
  return { statusCode: 200 };
};

// Update disconnect handler to only notify the specific room
module.exports.disconnect = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    
    // Get user info before removing
    const userParams = {
      TableName: TABLE_NAME,
      Key: { connectionId },
    };
    
    const connectionData = await dynamoDb.send(new GetCommand(userParams));
    const userData = connectionData.Item || {};
    
    // Delete the connection
    await dynamoDb.send(new DeleteCommand(userParams));
    
    // If user had a display name and room, broadcast they left to that room only
    if (userData.displayName && userData.roomId) {
      await sendSystemMessage(
        event, 
        `${userData.displayName} left the room`,
        userData.roomId
      );
    }
    
    return { statusCode: 200 };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to disconnect' }) };
  }
};

// Handle user joining the chat room
module.exports.joinChat = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const body = JSON.parse(event.body);
    const { displayName, roomId } = body; // Extract roomId from the request
    
    if (!displayName || displayName.trim() === '') {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Display name is required' }) 
      };
    }
    
    // Store both the display name AND room ID
    const params = {
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: 'set displayName = :displayName, roomId = :roomId',
      ExpressionAttributeValues: {
        ':displayName': displayName.trim(),
        ':roomId': roomId || 'global' // Default to 'global' if no roomId provided
      }
    };
    
    await dynamoDb.send(new UpdateCommand(params));
    
    // Only broadcast to connections in the same room
    const roomConnections = await getRoomConnections(roomId);
    
    const systemMessage = {
      type: 'system',
      content: `${displayName} joined the room`,
      timestamp: new Date().toISOString(),
      roomId: roomId
    };
    
    await broadcastMessage(event, roomConnections, systemMessage);
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Join error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to join chat' }) };
  }
};

// Helper function to get connections for a specific room
async function getRoomConnections(roomId) {
  if (!roomId) return [];
  
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'roomId = :roomId',
    ExpressionAttributeValues: {
      ':roomId': roomId
    }
  };
  
  const result = await dynamoDb.send(new ScanCommand(params));
  return result.Items || [];
}

// Send a regular chat message
module.exports.sendMessage = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const body = JSON.parse(event.body);
    const { message, displayName, roomId } = body;
    const timestamp = new Date().toISOString();
    
    if (!message || message.trim() === '') {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Message is required' }) 
      };
    }
    
    // Get ONLY connections for this room
    const roomConnections = await getRoomConnections(roomId);
    
    // Broadcast message to room connections
    const messageData = {
      type: 'message',
      message: message.trim(),
      displayName,
      timestamp,
      roomId
    };
    
    await broadcastMessage(event, roomConnections, messageData);
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Send message error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send message' }) };
  }
};

async function sendGameStartedMessage(event, displayName, roomId) {
  try {
    // Get connections for this specific room
    const roomConnections = await getRoomConnections(roomId);
    
    const systemMessage = {
      type: 'system',
      content: `${displayName} started the game`,
      timestamp: new Date().toISOString(),
      roomId: roomId
    };
    
    await broadcastMessage(event, roomConnections, systemMessage);
  } catch (error) {
    console.error('Game started message error:', error);
  }
}

module.exports.gameStarted = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const body = JSON.parse(event.body);
    const { displayName, roomId } = body;
    
    if (!displayName || !roomId) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Display name and room ID are required' }) 
      };
    }
    
    // Use the new function to send the game started message
    await sendGameStartedMessage(event, displayName, roomId);
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Game started error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send game started message' }) };
  }
};

// Update system message function to be room-specific
async function sendSystemMessage(event, content, roomId) {
  try {
    // Only get connections for this room
    const roomConnections = roomId 
      ? await getRoomConnections(roomId)
      : await getAllConnections();
    
    const systemMessage = {
      type: 'system',
      content,
      timestamp: new Date().toISOString(),
      roomId
    };
    
    await broadcastMessage(event, roomConnections, systemMessage);
  } catch (error) {
    console.error('System message error:', error);
  }
}

// Helper function to get all connections
async function getAllConnections() {
  const params = {
    TableName: TABLE_NAME
  };
  
  const result = await dynamoDb.send(new ScanCommand(params));
  return result.Items || [];
}

// Helper function to broadcast messages to connections
async function broadcastMessage(event, connections, messageData) {
  const endpoint = event.requestContext.domainName + '/' + event.requestContext.stage;
  
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${endpoint}`
  });
  
  const postToConnection = async ({ connectionId }) => {
    try {
      await apiGatewayClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: JSON.stringify(messageData),
      }));
    } catch (error) {
      if (error.statusCode === 410) {
        // Connection is stale, remove it
        await dynamoDb.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { connectionId },
        }));
      } else {
        console.error(`Error sending to connection ${connectionId}:`, error);
      }
    }
  };
  
  // Send message to all connections in parallel
  await Promise.all(connections.map(postToConnection));
}