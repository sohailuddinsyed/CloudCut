const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB DocumentClient
const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Get an item from DynamoDB table
 * @param {string} tableName - Name of the DynamoDB table
 * @param {Object} key - Primary key of the item to retrieve
 * @returns {Promise<Object|null>} The item if found, null otherwise
 */
async function getItem(tableName, key) {
  const command = new GetCommand({
    TableName: tableName,
    Key: key
  });
  
  const response = await docClient.send(command);
  return response.Item || null;
}

/**
 * Put an item into DynamoDB table
 * @param {string} tableName - Name of the DynamoDB table
 * @param {Object} item - Item to store in the table
 * @returns {Promise<void>}
 */
async function putItem(tableName, item) {
  const command = new PutCommand({
    TableName: tableName,
    Item: item
  });
  
  await docClient.send(command);
}

/**
 * Atomically increment a counter in DynamoDB
 * @param {string} tableName - Name of the DynamoDB table
 * @param {string} counterName - Name of the counter to increment
 * @returns {Promise<number>} The new counter value after increment
 */
async function incrementCounter(tableName, counterName) {
  const command = new UpdateCommand({
    TableName: tableName,
    Key: { counterName },
    UpdateExpression: 'ADD #value :inc',
    ExpressionAttributeNames: { '#value': 'value' },
    ExpressionAttributeValues: { ':inc': 1 },
    ReturnValues: 'UPDATED_NEW'
  });
  
  const response = await docClient.send(command);
  return response.Attributes.value;
}

/**
 * Atomically increment click count for a short code
 * @param {string} tableName - Name of the DynamoDB table
 * @param {string} shortCode - Short code to increment click count for
 * @returns {Promise<void>}
 */
async function incrementClickCount(tableName, shortCode) {
  const command = new UpdateCommand({
    TableName: tableName,
    Key: { shortCode },
    UpdateExpression: 'ADD clickCount :inc',
    ExpressionAttributeValues: { ':inc': 1 },
    ReturnValues: 'NONE'
  });
  
  await docClient.send(command);
}

module.exports = {
  getItem,
  putItem,
  incrementCounter,
  incrementClickCount
};
