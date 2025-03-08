const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
  UpdateCommand
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require('uuid');

// Initialize DynamoDB client
const client = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(client);

// Table name from environment variables
const QUESTIONS_TABLE = process.env.QUESTIONS_TABLE;

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Content-Type': 'application/json'
};

// Create a new question
module.exports.createQuestion = async (event) => {
    try {
      const body = JSON.parse(event.body);
      const { question, choices, correctAnswerIndex } = body;
      
      // Validate required fields
      if (!question || !choices || correctAnswerIndex === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: "Question, choices, and correctAnswerIndex are required fields" 
          })
        };
      }
      
      // Validate choices is an array with at least 2 options
      if (!Array.isArray(choices) || choices.length < 2) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: "Choices must be an array with at least 2 options" 
          })
        };
      }
      
      // Validate correctAnswerIndex is within the choices array bounds
      if (correctAnswerIndex < 0 || correctAnswerIndex >= choices.length) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: "correctAnswerIndex must be a valid index within the choices array" 
          })
        };
      }
      
      // Generate a unique ID for the question
      const questionId = uuidv4();
      const timestamp = new Date().toISOString();
      
      const params = {
        TableName: QUESTIONS_TABLE,
        Item: {
          id: questionId,
          question,
          choices,
          correctAnswerIndex,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      };
      
      await docClient.send(new PutCommand(params));
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          message: "Question created successfully",
          questionId 
        })
      };
      
    } catch (error) {
      console.error('Error creating question:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Could not create question" })
      };
    }
  };

// Get all questions
module.exports.getQuestions = async (event) => {
    try {
      const params = {
        TableName: QUESTIONS_TABLE
      };
      
      const { Items } = await docClient.send(new ScanCommand(params));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(Items)
      };
      
    } catch (error) {
      console.error('Error getting questions:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Could not retrieve questions" })
      };
    }
  };

// Get a single question by ID
module.exports.getQuestion = async (event) => {
  try {
    const questionId = event.pathParameters.id;
    
    const params = {
      TableName: QUESTIONS_TABLE,
      Key: { id: questionId }
    };
    
    const { Item } = await docClient.send(new GetCommand(params));
    
    if (!Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Question not found" })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(Item)
    };
    
  } catch (error) {
    console.error('Error getting question:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Could not retrieve question" })
    };
  }
};

// Update a question
module.exports.updateQuestion = async (event) => {
    try {
      const questionId = event.pathParameters.id;
      const body = JSON.parse(event.body);
      const { question, choices, correctAnswerIndex } = body;
      
      // Check if question exists
      const checkParams = {
        TableName: QUESTIONS_TABLE,
        Key: { id: questionId }
      };
      
      const { Item } = await docClient.send(new GetCommand(checkParams));
      
      if (!Item) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Question not found" })
        };
      }
      
      // Validate correctAnswerIndex if both it and choices are provided
      if (choices && correctAnswerIndex !== undefined) {
        if (correctAnswerIndex < 0 || correctAnswerIndex >= choices.length) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: "correctAnswerIndex must be a valid index within the choices array" 
            })
          };
        }
      }
      
      // Update the question
      const timestamp = new Date().toISOString();
      
      const updateParams = {
        TableName: QUESTIONS_TABLE,
        Key: { id: questionId },
        UpdateExpression: "set updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":updatedAt": timestamp
        },
        ReturnValues: "ALL_NEW"
      };
      
      // Add optional fields to update expression if provided
      if (question) {
        updateParams.UpdateExpression += ", question = :question";
        updateParams.ExpressionAttributeValues[":question"] = question;
      }
      
      if (choices) {
        updateParams.UpdateExpression += ", choices = :choices";
        updateParams.ExpressionAttributeValues[":choices"] = choices;
      }
      
      if (correctAnswerIndex !== undefined) {
        updateParams.UpdateExpression += ", correctAnswerIndex = :correctAnswerIndex";
        updateParams.ExpressionAttributeValues[":correctAnswerIndex"] = correctAnswerIndex;
      }
      
      const result = await docClient.send(new UpdateCommand(updateParams));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: "Question updated successfully",
          question: result.Attributes
        })
      };
      
    } catch (error) {
      console.error('Error updating question:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Could not update question" })
      };
    }
  };

// Delete a question
module.exports.deleteQuestion = async (event) => {
  try {
    const questionId = event.pathParameters.id;
    
    const params = {
      TableName: QUESTIONS_TABLE,
      Key: { id: questionId },
      ReturnValues: "ALL_OLD"
    };
    
    const result = await docClient.send(new DeleteCommand(params));
    
    if (!result.Attributes) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Question not found" })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Question deleted successfully" })
    };
    
  } catch (error) {
    console.error('Error deleting question:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Could not delete question" })
    };
  }
};