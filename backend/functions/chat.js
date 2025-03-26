const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'WebSocketConnections2025';

module.exports.connect = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const params = {
    TableName: TABLE_NAME,
    Item: { connectionId },
  };

  await dynamoDb.put(params).promise();
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
    
    const connectionData = await dynamoDb.get(userParams).promise();
    const userData = connectionData.Item || {};
    
    // Delete the connection
    await dynamoDb.delete(userParams).promise();
    
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
    
    await dynamoDb.update(params).promise();
    
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
  
  const result = await dynamoDb.scan(params).promise();
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

// Update system message function to be room-specific
async function sendSystemMessage(event, content, roomId) {
  try {
    // Only get connections for this room
    const roomConnections = roomId 
      ? await getRoomConnections(roomId)
      : await dynamoDb.scan({ TableName: TABLE_NAME }).promise().then(data => data.Items || []);
    
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

// Helper function to broadcast messages to connections
async function broadcastMessage(event, connections, messageData) {
  const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
  });
  
  const postToConnection = async ({ connectionId }) => {
    try {
      await apiGateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(messageData),
      }).promise();
    } catch (error) {
      if (error.statusCode === 410) {
        // Connection is stale, remove it
        await dynamoDb.delete({
          TableName: TABLE_NAME,
          Key: { connectionId },
        }).promise();
      } else {
        console.error(`Error sending to connection ${connectionId}:`, error);
      }
    }
  };
  
  // Send message to all connections in parallel
  await Promise.all(connections.map(postToConnection));
}