import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class UrlShortenerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import existing DynamoDB Tables
    const urlTable = dynamodb.Table.fromTableName(this, 'UrlMappingsTable', 'url_mappings');
    const counterTable = dynamodb.Table.fromTableName(this, 'CountersTable', 'counters');

    // Create click_events table for detailed click attribution tracking
    const clickEventsTable = new dynamodb.Table(this, 'ClickEventsTable', {
      tableName: 'click_events',
      partitionKey: { name: 'shortCode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Import existing API Gateway with root resource to allow adding new resources
    const apiGatewayId = process.env.API_GATEWAY_ID || 'your-api-gateway-id';
    const apiRootResourceId = process.env.API_ROOT_RESOURCE_ID || 'your-root-resource-id';
    const api = apigateway.RestApi.fromRestApiAttributes(this, 'UrlShortenerApi', {
      restApiId: apiGatewayId,
      rootResourceId: apiRootResourceId,
    });

    // Create NEW CDK-managed Lambda Functions (with different names to avoid conflicts)
    const createShortUrlFunction = new lambda.Function(this, 'CreateShortUrlFunctionV2', {
      functionName: 'CreateShortUrl-CDK',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/createShortUrl.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        URL_TABLE: urlTable.tableName,
        COUNTER_TABLE: counterTable.tableName,
        BASE_URL: `https://${apiGatewayId}.execute-api.${this.region}.amazonaws.com/prod`,
      },
    });

    const redirectFunction = new lambda.Function(this, 'RedirectFunctionV2', {
      functionName: 'Redirect-CDK',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/redirect.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      environment: {
        URL_TABLE: urlTable.tableName,
        CLICK_EVENTS_TABLE: clickEventsTable.tableName,
      },
    });

    // GetAnalytics Lambda function
    const getAnalyticsFunction = new lambda.Function(this, 'GetAnalyticsFunctionV2', {
      functionName: 'GetAnalytics-CDK',
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'handlers/getAnalytics.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../src')),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        URL_TABLE: urlTable.tableName,
        CLICK_EVENTS_TABLE: clickEventsTable.tableName,
      },
    });

    // Grant DynamoDB permissions
    urlTable.grantReadWriteData(createShortUrlFunction);
    urlTable.grantReadData(redirectFunction);
    counterTable.grantReadWriteData(createShortUrlFunction);
    clickEventsTable.grantWriteData(redirectFunction);
    urlTable.grantReadData(getAnalyticsFunction);
    clickEventsTable.grantReadData(getAnalyticsFunction);

    // Add GET /analytics/{shortCode} endpoint to API Gateway
    const analyticsResource = api.root.addResource('analytics');
    const analyticsShortCodeResource = analyticsResource.addResource('{shortCode}');

    const corsOptions: apigateway.CorsOptions = {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ['GET', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    };

    analyticsShortCodeResource.addCorsPreflight(corsOptions);

    analyticsShortCodeResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getAnalyticsFunction, { proxy: true }),
    );

    // Grant API Gateway permission to invoke the GetAnalytics Lambda
    getAnalyticsFunction.addPermission('ApiGatewayInvokeGetAnalytics', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${apiGatewayId}/*/GET/analytics/*`,
    });

    // Deploy to prod stage
    new apigateway.Deployment(this, 'AnalyticsDeployment', {
      api: api as apigateway.RestApi,
      description: 'Deploy analytics endpoint to prod stage',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${apiGatewayId}.execute-api.${this.region}.amazonaws.com/prod`,
      description: 'URL Shortener API Gateway endpoint',
    });

    new cdk.CfnOutput(this, 'AnalyticsEndpoint', {
      value: `https://${apiGatewayId}.execute-api.${this.region}.amazonaws.com/prod/analytics/{shortCode}`,
      description: 'Analytics endpoint URL',
    });

    new cdk.CfnOutput(this, 'UrlTableName', {
      value: urlTable.tableName,
      description: 'DynamoDB table for URL mappings',
    });

    new cdk.CfnOutput(this, 'CounterTableName', {
      value: counterTable.tableName,
      description: 'DynamoDB table for counters',
    });

    new cdk.CfnOutput(this, 'ClickEventsTableName', {
      value: clickEventsTable.tableName,
      description: 'DynamoDB table for click event attribution records',
    });

    new cdk.CfnOutput(this, 'CreateFunctionName', {
      value: createShortUrlFunction.functionName,
      description: 'CreateShortUrl Lambda function (CDK-managed)',
    });

    new cdk.CfnOutput(this, 'RedirectFunctionName', {
      value: redirectFunction.functionName,
      description: 'Redirect Lambda function (CDK-managed)',
    });

    new cdk.CfnOutput(this, 'GetAnalyticsFunctionName', {
      value: getAnalyticsFunction.functionName,
      description: 'GetAnalytics Lambda function (CDK-managed)',
    });

    new cdk.CfnOutput(this, 'CreateFunctionArn', {
      value: createShortUrlFunction.functionArn,
      description: 'CreateShortUrl Lambda ARN',
    });

    new cdk.CfnOutput(this, 'RedirectFunctionArn', {
      value: redirectFunction.functionArn,
      description: 'Redirect Lambda ARN',
    });

    new cdk.CfnOutput(this, 'GetAnalyticsFunctionArn', {
      value: getAnalyticsFunction.functionArn,
      description: 'GetAnalytics Lambda ARN',
    });
  }
}
