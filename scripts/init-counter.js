#!/usr/bin/env node

/**
 * Initialize URL Counter Script
 * 
 * This script initializes the url_counter in the counters DynamoDB table.
 * It should be run once before the first deployment to set up the initial counter value.
 * 
 * Usage: node scripts/init-counter.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Configuration
const REGION = 'us-east-1';
const COUNTER_TABLE = 'counters';
const COUNTER_NAME = 'url_counter';
const INITIAL_VALUE = 1;

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Check if the counter already exists
 */
async function counterExists() {
  try {
    const command = new GetCommand({
      TableName: COUNTER_TABLE,
      Key: { counterName: COUNTER_NAME }
    });
    
    const response = await docClient.send(command);
    return !!response.Item;
  } catch (error) {
    console.error('Error checking if counter exists:', error.message);
    throw error;
  }
}

/**
 * Initialize the counter in DynamoDB
 */
async function initializeCounter() {
  try {
    const command = new PutCommand({
      TableName: COUNTER_TABLE,
      Item: {
        counterName: COUNTER_NAME,
        value: INITIAL_VALUE
      }
    });
    
    await docClient.send(command);
    console.log(`✓ Successfully initialized ${COUNTER_NAME} with value ${INITIAL_VALUE}`);
  } catch (error) {
    console.error('Error initializing counter:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('URL Counter Initialization Script');
  console.log('==================================');
  console.log(`Region: ${REGION}`);
  console.log(`Table: ${COUNTER_TABLE}`);
  console.log(`Counter Name: ${COUNTER_NAME}`);
  console.log(`Initial Value: ${INITIAL_VALUE}`);
  console.log('');
  
  try {
    // Check if counter already exists
    const exists = await counterExists();
    
    if (exists) {
      console.log(`⚠ Counter "${COUNTER_NAME}" already exists in table "${COUNTER_TABLE}"`);
      console.log('Skipping initialization to avoid overwriting existing counter.');
      console.log('If you want to reset the counter, delete it manually first.');
      process.exit(0);
    }
    
    // Initialize the counter
    console.log(`Initializing counter "${COUNTER_NAME}"...`);
    await initializeCounter();
    
    console.log('');
    console.log('✓ Initialization complete!');
    console.log('The URL shortener service is now ready to generate short codes.');
    
  } catch (error) {
    console.error('');
    console.error('✗ Initialization failed!');
    console.error('Error:', error.message);
    console.error('');
    console.error('Please ensure:');
    console.error('1. The DynamoDB table "counters" exists in us-east-1');
    console.error('2. Your AWS credentials are configured correctly');
    console.error('3. You have permissions to write to the DynamoDB table');
    process.exit(1);
  }
}

// Run the script
main();
