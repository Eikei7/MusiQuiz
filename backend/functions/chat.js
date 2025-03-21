const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Table to store connection IDs and user information
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

// Connect handler - called when a client connects
exports.connectHandler = async (event) => {
  console.log('Connect event received:', event);
  
  // Don't do any complex processing during connection
  // Just accept the connection with a 200 status code
  return { statusCode: 200 };
};

// Disconnect handler - called when a client disconnects
exports.disconnectHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    // Get user info before deleting
    const connection = await dynamoDB.get({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }).promise();
    
    // Remove the connection ID from DynamoDB
    await dynamoDB.delete({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }).promise();
    
    // If the user had a username, notify other users that they left
    if (connection.Item && connection.Item.username) {
      await broadcastUserLeft(event.requestContext, connection.Item.username, connectionId);
      await refreshUsersList(event.requestContext);
    }
    
    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { statusCode: 500, body: 'Failed to disconnect: ' + JSON.stringify(error) };
  }
};

// Default message handler - routes messages based on action
exports.defaultHandler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }
  
  const connectionId = event.requestContext.connectionId;
  
  // Route based on action
  switch (body.action) {
    case 'join':
      return handleJoin(event.requestContext, connectionId, body);
    case 'message':
      return handleMessage(event.requestContext, connectionId, body);
    default:
      return { statusCode: 400, body: `Unsupported action: ${body.action}` };
  }
};

// Handle join action
async function handleJoin(requestContext, connectionId, body) {
  if (!body.username || body.username.trim() === '') {
    return { statusCode: 400, body: 'Username is required' };
  }
  
  const username = body.username.trim();
  
  try {
    // Update connection in DynamoDB with username
    await dynamoDB.update({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
      UpdateExpression: 'SET username = :username',
      ExpressionAttributeValues: {
        ':username': username
      }
    }).promise();
    
    // Broadcast system message that user joined
    await broadcastSystemMessage(requestContext, `${username} joined the chat`);
    
    // Refresh users list for all connected clients
    await refreshUsersList(requestContext);
    
    return { statusCode: 200, body: 'Joined' };
  } catch (error) {
    console.error('Join error:', error);
    return { statusCode: 500, body: 'Failed to join: ' + JSON.stringify(error) };
  }
}

// Handle message action
async function handleMessage(requestContext, connectionId, body) {
  if (!body.content || body.content.trim() === '') {
    return { statusCode: 400, body: 'Message content is required' };
  }
  
  try {
    // Get sender username from DynamoDB
    const connection = await dynamoDB.get({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }).promise();
    
    if (!connection.Item || !connection.Item.username) {
      return { statusCode: 400, body: 'You must join with a username first' };
    }
    
    const username = connection.Item.username;
    const messageData = {
      type: 'message',
      sender: username,
      content: body.content.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Broadcast message to all connected clients
    await broadcastMessage(requestContext, messageData);
    
    return { statusCode: 200, body: 'Message sent' };
  } catch (error) {
    console.error('Message error:', error);
    return { statusCode: 500, body: 'Failed to send message: ' + JSON.stringify(error) };
  }
}

// Broadcast message to all connected clients
async function broadcastMessage(requestContext, message) {
  return broadcastToAll(requestContext, message);
}

// Broadcast system message to all connected clients
async function broadcastSystemMessage(requestContext, content) {
  const message = {
    type: 'system',
    content,
    timestamp: new Date().toISOString()
  };
  
  return broadcastToAll(requestContext, message);
}

// Notify others when a user leaves
async function broadcastUserLeft(requestContext, username, skipConnectionId) {
  const message = {
    type: 'system',
    content: `${username} left the chat`,
    timestamp: new Date().toISOString()
  };
  
  return broadcastToAll(requestContext, message, skipConnectionId);
}

// Send updated users list to all clients
async function refreshUsersList(requestContext) {
  try {
    // Get all connections with usernames
    const connections = await dynamoDB.scan({
      TableName: CONNECTIONS_TABLE,
      ProjectionExpression: 'username',
      FilterExpression: 'attribute_exists(username)'
    }).promise();
    
    // Extract unique usernames
    const users = connections.Items
      .map(item => item.username)
      .filter((username, index, self) => 
        username && self.indexOf(username) === index
      );
    
    const message = {
      type: 'users',
      users
    };
    
    return broadcastToAll(requestContext, message);
  } catch (error) {
    console.error('Error refreshing users list:', error);
  }
}

// Utility function to broadcast to all connections
async function broadcastToAll(requestContext, message, skipConnectionId = null) {
  const apiGateway = new AWS.ApiGatewayManagementApi({
    endpoint: `${requestContext.domainName}/${requestContext.stage}`
  });
  
  // Get all connection IDs
  const connections = await dynamoDB.scan({
    TableName: CONNECTIONS_TABLE,
    ProjectionExpression: 'connectionId'
  }).promise();
  
  const messageString = JSON.stringify(message);
  
  // Send message to each connection
  const sendPromises = connections.Items
    .filter(item => item.connectionId !== skipConnectionId)
    .map(async ({ connectionId }) => {
      try {
        await apiGateway.postToConnection({
          ConnectionId: connectionId,
          Data: messageString
        }).promise();
      } catch (error) {
        // Handle stale connections
        if (error.statusCode === 410) {
          console.log(`Stale connection: ${connectionId}`);
          await dynamoDB.delete({
            TableName: CONNECTIONS_TABLE,
            Key: { connectionId }
          }).promise();
        } else {
          console.error(`Error sending to connection ${connectionId}:`, error);
        }
      }
    });
  
  await Promise.all(sendPromises);
}