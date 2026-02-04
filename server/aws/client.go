// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package aws

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/costexplorer"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ecs"
	"github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/aws-sdk-go-v2/service/rds"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/sts"
)

type Client struct {
	config    aws.Config
	region    string
	accessKey string
	secretKey string
}

func NewClient(region, accessKey, secretKey string) (*Client, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, err
	}

	return &Client{
		config:    cfg,
		region:    region,
		accessKey: accessKey,
		secretKey: secretKey,
	}, nil
}

func (c *Client) VerifyCredentials() error {
	client := sts.NewFromConfig(c.config)
	_, err := client.GetCallerIdentity(context.TODO(), &sts.GetCallerIdentityInput{})
	return err
}

func (c *Client) GetEC2Client() *ec2.Client {
	return ec2.NewFromConfig(c.config)
}

func (c *Client) GetS3Client() *s3.Client {
	return s3.NewFromConfig(c.config)
}

func (c *Client) GetLambdaClient() *lambda.Client {
	return lambda.NewFromConfig(c.config)
}

func (c *Client) GetRDSClient() *rds.Client {
	return rds.NewFromConfig(c.config)
}

func (c *Client) GetECSClient() *ecs.Client {
	return ecs.NewFromConfig(c.config)
}

func (c *Client) GetCostExplorerClient() *costexplorer.Client {
	return costexplorer.NewFromConfig(c.config)
}
