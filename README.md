# CloudCut

CloudCut turns long URLs into short, shareable links — and captures the full story behind every click. Each redirect records the visitor's IP address, user agent, and referrer in real time, building a per-click attribution trail you can query through the analytics API. Short links support custom aliases and optional expiration, with DynamoDB TTL handling automatic cleanup. The entire stack runs serverless on AWS — Lambda, API Gateway, and DynamoDB — deployed and managed with CDK.


## Features

- URL shortening with Base62-encoded short codes
- Custom aliases (e.g. `/my-link`)
- URL expiration with automatic DynamoDB TTL cleanup
- Click tracking (count + per-click attribution events)
- Analytics endpoint with recent click history
- Structured JSON logging to CloudWatch
- 77 unit and property-based tests (Jest + fast-check)

## API Endpoints

### Create short URL

```bash
POST /shorten
Content-Type: application/json

{ "longUrl": "https://example.com/some/long/url" }
```

Optional fields:

```json
{
  "longUrl": "https://example.com/some/long/url",
  "customAlias": "my-link",
  "expiresAt": 1800000000
}
```

Response `201`:

```json
{
  "shortUrl": "https://<your-api-id>.execute-api.us-east-1.amazonaws.com/prod/abc123",
  "shortCode": "abc123",
  "longUrl": "https://example.com/some/long/url"
}
```

### Redirect

```bash
GET /{shortCode}
```

Returns `302` with `Location` header, `404` if not found, `410` if expired.

### Analytics

```bash
GET /analytics/{shortCode}
```

Response `200`:

```json
{
  "shortCode": "abc123",
  "longUrl": "https://example.com/some/long/url",
  "createdAt": 1712345678,
  "clickCount": 42,
  "recentClicks": [
    { "timestamp": 1712345999, "ipAddress": "1.2.3.4", "userAgent": "...", "referrer": "" }
  ]
}
```

## Architecture

```
Client → API Gateway → Lambda → DynamoDB
                       ├─ CreateShortUrl  (POST /shorten)
                       ├─ Redirect        (GET /{shortCode})
                       └─ GetAnalytics    (GET /analytics/{shortCode})
```

**DynamoDB tables**

| Table | Partition key | Sort key | Notes |
|---|---|---|---|
| `url_mappings` | `shortUrl` (String) | — | TTL on `expiresAt` |
| `counters` | `counterName` (String) | — | Atomic counter for ID gen |
| `click_events` | `shortCode` (String) | `timestamp` (Number) | Per-click attribution |

## Setup

### Prerequisites

- Node.js 18+
- AWS CLI configured for `us-east-1`

### Install dependencies

```bash
npm install
```

### Run tests

```bash
npx jest
```

### Deploy

CDK manages the Lambda functions (`CreateShortUrl-CDK`, `Redirect-CDK`, `GetAnalytics-CDK`), the `click_events` DynamoDB table, and the `/analytics/{shortCode}` API Gateway endpoint. The existing `url_mappings` and `counters` tables are imported by reference and not touched by CDK.

```bash
# First time only — bootstrap CDK in your AWS account/region
npx cdk bootstrap

# Preview what will change before deploying
npx cdk diff

# Deploy all changes
npx cdk deploy
```

The `.env` file is loaded automatically by the CDK app. Make sure `API_GATEWAY_ID` and `API_ROOT_RESOURCE_ID` are set before deploying — CDK uses them to attach new resources to the existing API Gateway.

## Environment variables

| Variable | Value |
|---|---|
| `URL_TABLE` | `url_mappings` |
| `COUNTER_TABLE` | `counters` |
| `CLICK_EVENTS_TABLE` | `click_events` |
| `BASE_URL` | API Gateway invoke URL |
| `AWS_REGION` | `us-east-1` |

## Project structure

```
src/
  handlers/
    createShortUrl.js   # POST /shorten
    redirect.js         # GET /{shortCode}
    getAnalytics.js     # GET /analytics/{shortCode}
  utils/
    base62.js           # Base62 encode/decode
    dynamodb.js         # DynamoDB helpers
    validation.js       # URL and alias validation
    errors.js           # Standardized error responses
    logger.js           # Structured JSON logging
tests/                  # Jest + fast-check test suite (77 tests)
scripts/                # Utility scripts (counter init, env setup)
frontend/               # Static frontend (Amplify)
```
