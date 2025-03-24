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

module.exports.disconnect = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    
    // Get user info before removing
    const userParams = {
      TableName: TABLE_NAME,
      Key: { connectionId },
    };
    
    const connectionData = await dynamoDb.get(userParams).promise();
    
    // Delete the connection
    await dynamoDb.delete(userParams).promise();
    
    // If user had a display name, broadcast they left
    if (connectionData.Item && connectionData.Item.displayName) {
      await sendSystemMessage(
        event, 
        `${connectionData.Item.displayName} left the room`
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
    const { displayName } = JSON.parse(event.body);
    
    if (!displayName || displayName.trim() === '') {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Display name is required' }) 
      };
    }
    
    // Store the user's display name
    const params = {
      TableName: TABLE_NAME,
      Key: { connectionId },
      UpdateExpression: 'set displayName = :displayName',
      ExpressionAttributeValues: {
        ':displayName': displayName.trim()
      }
    };
    
    await dynamoDb.update(params).promise();
    
    // Broadcast a system message that user joined
    await sendSystemMessage(event, `${displayName} joined the room`);
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Join error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to join chat' }) };
  }
};

// Send a regular chat message
module.exports.sendMessage = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const { message, displayName, roomId } = JSON.parse(event.body);
    const timestamp = new Date().toISOString();
    
    if (!message || message.trim() === '') {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Message is required' }) 
      };
    }
    
    // Get connections (can filter by roomId if implemented)
    let scanParams = {
      TableName: TABLE_NAME
    };
    
    if (roomId) {
      scanParams.FilterExpression = 'roomId = :roomId';
      scanParams.ExpressionAttributeValues = { ':roomId': roomId };
    }
    
    const connections = await dynamoDb.scan(scanParams).promise();
    
    // Broadcast message to all relevant connections
    const messageData = {
      type: 'message',
      message: message.trim(),
      displayName,
      timestamp,
      roomId
    };
    
    await broadcastMessage(event, connections.Items, messageData);
    
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Send message error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send message' }) };
  }
};

// Helper function to send system messages
async function sendSystemMessage(event, content) {
  try {
    const connections = await dynamoDb.scan({ TableName: TABLE_NAME }).promise();
    
    const systemMessage = {
      type: 'system',
      content,
      timestamp: new Date().toISOString()
    };
    
    await broadcastMessage(event, connections.Items, systemMessage);
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