# AWS Resources and Costs Explorer Plugin

A Mattermost plugin that displays AWS account resources and costs in a right-hand sidebar panel.

## Features

- **Resource Explorer**: View AWS resources grouped by service (EC2, S3, Lambda, RDS, EFS, ELB, ECS)
- **Cost Dashboard**: Display costs per service for the last calendar month with delta indicators
- **Multi-Platform Support**: Builds for Linux, macOS, and Windows (AMD64 and ARM64)

## Configuration

The plugin requires AWS credentials to be configured in the plugin settings:

1. **AWS Access Key ID**: Your AWS access key ID
2. **AWS Secret Access Key**: Your AWS secret access key (stored securely)
3. **AWS Region**: Select the AWS region to query

## Required IAM Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "ce:GetCostAndUsage",
        "ec2:Describe*",
        "s3:List*",
        "s3:GetBucket*",
        "lambda:List*",
        "lambda:GetFunction*",
        "rds:Describe*",
        "rds:List*",
        "elasticfilesystem:Describe*",
        "elasticloadbalancing:Describe*",
        "ecs:List*",
        "ecs:Describe*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Development

### Prerequisites

- Go 1.23+
- Node.js 20+
- Make

### Building

```bash
make dist
```

### Development

```bash
make watch
```

## Installation

1. Build the plugin: `make dist`
2. Upload the generated tarball to your Mattermost server
3. Configure AWS credentials in the plugin settings

## License

Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
