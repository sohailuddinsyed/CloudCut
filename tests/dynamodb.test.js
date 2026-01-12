/**
 * Unit Tests for DynamoDB Operations Module
 * 
 * Tests error handling and edge cases for DynamoDB operations
 */

const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { getItem, putItem, incrementCounter, incrementClickCount } = require('../src/utils/dynamodb');

// Create mock for DynamoDB DocumentClient
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('DynamoDB Operations - Unit Tests', () => {
  
  beforeEach(() => {
    // Reset mock before each test
    ddbMock.reset();
  });

  describe('getItem', () => {
    
    test('should return null when item is not found', async () => {
      // Mock GetCommand to return empty response (no Item)
      ddbMock.on(GetCommand).resolves({});
      
      const result = await getItem('test-table', { id: 'nonexistent' });
      
      expect(result).toBeNull();
    });

    test('should throw error when DynamoDB operation fails', async () => {
      // Mock GetCommand to throw an error
      ddbMock.on(GetCommand).rejects(new Error('DynamoDB service error'));
      
      await expect(getItem('test-table', { id: 'test' }))
        .rejects
        .toThrow('DynamoDB service error');
    });

    test('should throw error when table does not exist', async () => {
      // Mock ResourceNotFoundException
      const error = new Error('Requested resource not found');
      error.name = 'ResourceNotFoundException';
      ddbMock.on(GetCommand).rejects(error);
      
      await expect(getItem('nonexistent-table', { id: 'test' }))
        .rejects
        .toThrow('Requested resource not found');
    });

  });

  describe('putItem', () => {
    
    test('should throw error when DynamoDB operation fails', async () => {
      // Mock PutCommand to throw an error
      ddbMock.on(PutCommand).rejects(new Error('DynamoDB service error'));
      
      await expect(putItem('test-table', { id: 'test', data: 'value' }))
        .rejects
        .toThrow('DynamoDB service error');
    });

    test('should throw error when table does not exist', async () => {
      // Mock ResourceNotFoundException
      const error = new Error('Requested resource not found');
      error.name = 'ResourceNotFoundException';
      ddbMock.on(PutCommand).rejects(error);
      
      await expect(putItem('nonexistent-table', { id: 'test' }))
        .rejects
        .toThrow('Requested resource not found');
    });

    test('should throw error when item validation fails', async () => {
      // Mock ValidationException
      const error = new Error('One or more parameter values were invalid');
      error.name = 'ValidationException';
      ddbMock.on(PutCommand).rejects(error);
      
      await expect(putItem('test-table', { invalid: 'data' }))
        .rejects
        .toThrow('One or more parameter values were invalid');
    });

  });

  describe('incrementCounter', () => {
    
    test('should throw error when DynamoDB operation fails', async () => {
      // Mock UpdateCommand to throw an error
      ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB service error'));
      
      await expect(incrementCounter('test-table', 'test-counter'))
        .rejects
        .toThrow('DynamoDB service error');
    });

    test('should throw error when table does not exist', async () => {
      // Mock ResourceNotFoundException
      const error = new Error('Requested resource not found');
      error.name = 'ResourceNotFoundException';
      ddbMock.on(UpdateCommand).rejects(error);
      
      await expect(incrementCounter('nonexistent-table', 'test-counter'))
        .rejects
        .toThrow('Requested resource not found');
    });

  });

  describe('incrementClickCount', () => {
    
    test('should throw error when DynamoDB operation fails', async () => {
      // Mock UpdateCommand to throw an error
      ddbMock.on(UpdateCommand).rejects(new Error('DynamoDB service error'));
      
      await expect(incrementClickCount('test-table', 'test-code'))
        .rejects
        .toThrow('DynamoDB service error');
    });

    test('should throw error when table does not exist', async () => {
      // Mock ResourceNotFoundException
      const error = new Error('Requested resource not found');
      error.name = 'ResourceNotFoundException';
      ddbMock.on(UpdateCommand).rejects(error);
      
      await expect(incrementClickCount('nonexistent-table', 'test-code'))
        .rejects
        .toThrow('Requested resource not found');
    });

  });

});
