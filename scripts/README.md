# Scripts Directory

This directory contains utility scripts for managing the URL Shortener Service.

## init-counter.js

Initializes the `url_counter` in the DynamoDB `counters` table.

### Purpose

This script sets up the initial counter value that the URL shortener service uses to generate unique short codes via Base62 encoding. It must be run once before the first deployment.

### Prerequisites

1. AWS credentials configured (via AWS CLI, environment variables, or IAM role)
2. DynamoDB table `counters` exists in `us-east-1` region
3. Permissions to write to the DynamoDB table

### Usage

```bash
node scripts/init-counter.js
```

### What it does

1. Checks if the `url_counter` already exists in the `counters` table
2. If it exists, skips initialization to avoid overwriting
3. If it doesn't exist, creates a new counter item:
   ```json
   {
     "counterName": "url_counter",
     "value": 1
   }
   ```

### Expected Output

**Success (first run):**
```
URL Counter Initialization Script
==================================
Region: us-east-1
Table: counters
Counter Name: url_counter
Initial Value: 1

Initializing counter "url_counter"...
✓ Successfully initialized url_counter with value 1

✓ Initialization complete!
The URL shortener service is now ready to generate short codes.
```

**Success (counter already exists):**
```
URL Counter Initialization Script
==================================
Region: us-east-1
Table: counters
Counter Name: url_counter
Initial Value: 1

⚠ Counter "url_counter" already exists in table "counters"
Skipping initialization to avoid overwriting existing counter.
If you want to reset the counter, delete it manually first.
```

**Failure (missing credentials or table):**
```
URL Counter Initialization Script
==================================
Region: us-east-1
Table: counters
Counter Name: url_counter
Initial Value: 1

✗ Initialization failed!
Error: [error message]

Please ensure:
1. The DynamoDB table "counters" exists in us-east-1
2. Your AWS credentials are configured correctly
3. You have permissions to write to the DynamoDB table
```

### Troubleshooting

**Error: "ResourceNotFoundException"**
- The `counters` table doesn't exist in us-east-1
- Create the table with partition key `counterName` (String)

**Error: "Your session has expired"**
- AWS credentials are not configured or have expired
- Run `aws configure` to set up credentials
- Or set environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

**Error: "AccessDeniedException"**
- Your AWS user/role doesn't have permissions to write to DynamoDB
- Ensure your IAM policy includes `dynamodb:PutItem` and `dynamodb:GetItem` permissions

### When to run

- **Before first deployment**: Run this script once to initialize the counter
- **After counter reset**: If you manually delete the counter, run this script again
- **Never run in production**: This script should only be run during initial setup

### Safety Features

- **Idempotent**: Safe to run multiple times - won't overwrite existing counter
- **Validation**: Checks if counter exists before attempting to create
- **Error handling**: Provides clear error messages and troubleshooting steps
- **Exit codes**: Returns 0 on success, 1 on failure (for CI/CD integration)
