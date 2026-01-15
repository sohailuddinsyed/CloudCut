# CloudCut

A production-ready, serverless URL shortener service built on AWS infrastructure.

## Overview

CloudCut converts long URLs into short, shareable links using AWS Lambda, DynamoDB, and API Gateway. The system uses counter-based ID generation with Base62 encoding to ensure collision-free URL generation.

## Features

- **URL Shortening**: Convert long URLs to short codes
- **Fast Redirects**: Sub-200ms redirect latency
- **Serverless Architecture**: Auto-scaling with AWS Lambda
- **Free Tier Optimized**: Designed to run within AWS Free Tier limits
- **RESTful API**: Simple HTTP endpoints for integration

## Quick Start

### Prerequisites

- AWS CLI installed and configured
- Node.js 18.x or later
- AWS account with appropriate permissions

## API Endpoints

### Create Short URL

```bash
POST /shorten
Content-Type: application/json

{
  "longUrl": "https://www.example.com/very/long/url"
}
```

### Access Short URL

```bash
GET /{shortCode}
```

## Architecture

```
Client → API Gateway → Lambda Functions → DynamoDB
                       ├─ CreateShortUrl
                       └─ Redirect
```

- **API Gateway**: HTTP endpoints
- **Lambda Functions**: Serverless compute
- **DynamoDB**: NoSQL storage for URL mappings
- **CloudWatch**: Logging and monitoring
