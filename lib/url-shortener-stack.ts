import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

export class UrlShortenerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import existing DynamoDB Tables
    const urlTable = dynamodb.Table.fromTableName(this, 'UrlMappingsTable', 'url_mappings');
    const counterTable = dynamodb.Table.fromTableName(this, 'CountersTable', 'counters');

    // Import existing API Gateway
    const apiGatewayId = process.env.API_GATEWAY_ID || 'your-api-gateway-id';
    const api = apigateway.RestApi.fromRestApiId(
      this, 
      'UrlShortenerApi', 
      apiGatewayId
    );

    // Create NEW CDK-managed Lambda Functions (with different names to avoid conflicts)
    const createShortUrlFunction = new lambda.Function(this, 'CreateShortUrlFunctionV2', {
      functionName: 'CreateShortUrl-CDK',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/createShortUrl.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        URL_TABLE: urlTable.tableName,
        COUNTER_TABLE: counterTable.tableName,
        BASE_URL: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod`,
      },
    });

    const redirectFunction = new lambda.Function(this, 'RedirectFunctionV2', {
      functionName: 'Redirect-CDK',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/redirect.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      environment: {
        URL_TABLE: urlTable.tableName,
      },
    });

    // Grant DynamoDB permissions
    urlTable.grantReadWriteData(createShortUrlFunction);
    urlTable.grantReadData(redirectFunction);
    counterTable.grantReadWriteData(createShortUrlFunction);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod`,
      description: 'URL Shortener API Gateway endpoint',
    });

    new cdk.CfnOutput(this, 'UrlTableName', {
      value: urlTable.tableName,
      description: 'DynamoDB table for URL mappings',
    });

    new cdk.CfnOutput(this, 'CounterTableName', {
      value: counterTable.tableName,
      description: 'DynamoDB table for counters',
    });

    new cdk.CfnOutput(this, 'CreateFunctionName', {
      value: createShortUrlFunction.functionName,
      description: 'CreateShortUrl Lambda function (CDK-managed)',
    });

    new cdk.CfnOutput(this, 'RedirectFunctionName', {
      value: redirectFunction.functionName,
      description: 'Redirect Lambda function (CDK-managed)',
    });

    new cdk.CfnOutput(this, 'CreateFunctionArn', {
      value: createShortUrlFunction.functionArn,
      description: 'CreateShortUrl Lambda ARN',
    });

    new cdk.CfnOutput(this, 'RedirectFunctionArn', {
      value: redirectFunction.functionArn,
      description: 'Redirect Lambda ARN',
    });
  }
}
