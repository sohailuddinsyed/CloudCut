const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Lazily initialized to avoid keeping open connections during tests
let docClient = null;

function getDocClient() {
  if (!docClient) {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    docClient = DynamoDBDocumentClient.from(client);
  }
  return docClient;
}

/**
 * Get an item from DynamoDB table
 * @param {string} tableName - Name of the DynamoDB table
 * @param {Object} key - Primary key of the item to retrieve
 * @returns {Promise<Object|null>} The item if found, null otherwise
 */
async function getItem(tableName, key) {
  const command = new GetCommand({ TableName: tableName, Key: key });
  const response = await getDocClient().send(command);
  return response.Item || null;
}

async function putItem(tableName, item) {
  const command = new PutCommand({ TableName: tableName, Item: item });
  await getDocClient().send(command);
}

async function incrementCounter(tableName, counterName) {
  const command = new UpdateCommand({
    TableName: tableName,
    Key: { counterName },
    UpdateExpression: 'ADD #value :inc',
    ExpressionAttributeNames: { '#value': 'value' },
    ExpressionAttributeValues: { ':inc': 1 },
    ReturnValues: 'UPDATED_NEW'
  });
  const response = await getDocClient().send(command);
  return response.Attributes.value;
}

async function incrementClickCount(tableName, shortCode) {
  const command = new UpdateCommand({
    TableName: tableName,
    Key: { shortUrl: shortCode },  // shortUrl is the actual DynamoDB partition key
    UpdateExpression: 'ADD clickCount :inc',
    ExpressionAttributeValues: { ':inc': 1 },
    ReturnValues: 'NONE'
  });
  await getDocClient().send(command);
}

async function putClickEvent(tableName, item) {
  const command = new PutCommand({ TableName: tableName, Item: item });
  await getDocClient().send(command);
}

async function queryClickEvents(tableName, shortCode, limit = 100) {
  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'shortCode = :shortCode',
    ExpressionAttributeValues: { ':shortCode': shortCode },
    ScanIndexForward: false,
    Limit: limit
  });
  const response = await getDocClient().send(command);
  return response.Items || [];
}

module.exports = {
  getItem,
  putItem,
  incrementCounter,
  incrementClickCount,
  putClickEvent,
  queryClickEvents
};
