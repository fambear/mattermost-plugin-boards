// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package aws

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ecs"
	"github.com/aws/aws-sdk-go-v2/service/lambda"
	"github.com/aws/aws-sdk-go-v2/service/rds"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/mattermost/mattermost-plugin-aws-explorer/server/model"
)

type EC2Instance struct {
	ID    string
	Type  string
	State string
	AZ    string
}

type S3Bucket struct {
	Name         string
	CreationDate string
}

type LambdaFunction struct {
	Name    string
	Runtime string
	State   string
}

type RDSInstance struct {
	ID               string
	Engine           string
	EngineVersion    string
	InstanceClass    string
	DBInstanceStatus string
}

type ECSCluster struct {
	Name   string
	Status string
}

func (c *Client) GetEC2Instances() ([]EC2Instance, error) {
	client := c.GetEC2Client()
	resp, err := client.DescribeInstances(context.TODO(), &ec2.DescribeInstancesInput{})
	if err != nil {
		return nil, err
	}

	var instances []EC2Instance
	for _, reservation := range resp.Reservations {
		for _, instance := range reservation.Instances {
			state := "unknown"
			if instance.State != nil {
				state = string(instance.State.Name)
			}
			instances = append(instances, EC2Instance{
				ID:    aws.ToString(instance.InstanceId),
				Type:  string(instance.InstanceType),
				State: state,
				AZ:    aws.ToString(instance.Placement.AvailabilityZone),
			})
		}
	}
	return instances, nil
}

func (c *Client) GetS3Buckets() ([]S3Bucket, error) {
	client := c.GetS3Client()
	resp, err := client.ListBuckets(context.TODO(), &s3.ListBucketsInput{})
	if err != nil {
		return nil, err
	}

	var buckets []S3Bucket
	for _, bucket := range resp.Buckets {
		buckets = append(buckets, S3Bucket{
			Name:         aws.ToString(bucket.Name),
			CreationDate: bucket.CreationDate.Format("2006-01-02"),
		})
	}
	return buckets, nil
}

func (c *Client) GetLambdaFunctions() ([]LambdaFunction, error) {
	client := c.GetLambdaClient()
	resp, err := client.ListFunctions(context.TODO(), &lambda.ListFunctionsInput{})
	if err != nil {
		return nil, err
	}

	var functions []LambdaFunction
	for _, fn := range resp.Functions {
		state := "Active"
		if fn.State != nil {
			state = string(fn.State)
		}
		functions = append(functions, LambdaFunction{
			Name:    aws.ToString(fn.FunctionName),
			Runtime: aws.ToString(fn.Runtime),
			State:   state,
		})
	}
	return functions, nil
}

func (c *Client) GetRDSInstances() ([]RDSInstance, error) {
	client := c.GetRDSClient()
	resp, err := client.DescribeDBInstances(context.TODO(), &rds.DescribeDBInstancesInput{})
	if err != nil {
		return nil, err
	}

	var instances []RDSInstance
	for _, db := range resp.DBInstances {
		instances = append(instances, RDSInstance{
			ID:               aws.ToString(db.DBInstanceIdentifier),
			Engine:           aws.ToString(db.Engine),
			EngineVersion:    aws.ToString(db.EngineVersion),
			InstanceClass:    string(db.DBInstanceClass),
			DBInstanceStatus: aws.ToString(db.DBInstanceStatus),
		})
	}
	return instances, nil
}

func (c *Client) GetECSClusters() ([]ECSCluster, error) {
	client := c.GetECSClient()
	resp, err := client.ListClusters(context.TODO(), &ecs.ListClustersInput{})
	if err != nil {
		return nil, err
	}

	if len(resp.ClusterArns) == 0 {
		return []ECSCluster{}, nil
	}

	describeResp, err := client.DescribeClusters(context.TODO(), &ecs.DescribeClustersInput{
		Clusters: resp.ClusterArns,
	})
	if err != nil {
		return nil, err
	}

	var clusters []ECSCluster
	for _, cluster := range describeResp.Clusters {
		clusters = append(clusters, ECSCluster{
			Name:   aws.ToString(cluster.ClusterName),
			Status: string(cluster.Status),
		})
	}
	return clusters, nil
}

func (c *Client) GetAllResources() ([]model.ResourceGroup, error) {
	var groups []model.ResourceGroup

	ec2Instances, err := c.GetEC2Instances()
	if err == nil && len(ec2Instances) > 0 {
		resources := make([]model.Resource, len(ec2Instances))
		for i, inst := range ec2Instances {
			resources[i] = model.Resource{
				ID:    inst.ID,
				Type:  inst.Type,
				State: inst.State,
				Details: map[string]interface{}{
					"availability_zone": inst.AZ,
				},
			}
		}
		groups = append(groups, model.ResourceGroup{
			Service:   "EC2",
			Count:     len(ec2Instances),
			Resources: resources,
		})
	}

	s3Buckets, err := c.GetS3Buckets()
	if err == nil && len(s3Buckets) > 0 {
		resources := make([]model.Resource, len(s3Buckets))
		for i, bucket := range s3Buckets {
			resources[i] = model.Resource{
				ID:   bucket.Name,
				Type: "Bucket",
				Details: map[string]interface{}{
					"creation_date": bucket.CreationDate,
				},
			}
		}
		groups = append(groups, model.ResourceGroup{
			Service:   "S3",
			Count:     len(s3Buckets),
			Resources: resources,
		})
	}

	lambdaFunctions, err := c.GetLambdaFunctions()
	if err == nil && len(lambdaFunctions) > 0 {
		resources := make([]model.Resource, len(lambdaFunctions))
		for i, fn := range lambdaFunctions {
			resources[i] = model.Resource{
				ID:    fn.Name,
				Type:  fn.Runtime,
				State: fn.State,
			}
		}
		groups = append(groups, model.ResourceGroup{
			Service:   "Lambda",
			Count:     len(lambdaFunctions),
			Resources: resources,
		})
	}

	rdsInstances, err := c.GetRDSInstances()
	if err == nil && len(rdsInstances) > 0 {
		resources := make([]model.Resource, len(rdsInstances))
		for i, db := range rdsInstances {
			resources[i] = model.Resource{
				ID:    db.ID,
				Type:  db.Engine,
				State: db.DBInstanceStatus,
				Details: map[string]interface{}{
					"version":        db.EngineVersion,
					"instance_class": db.InstanceClass,
				},
			}
		}
		groups = append(groups, model.ResourceGroup{
			Service:   "RDS",
			Count:     len(rdsInstances),
			Resources: resources,
		})
	}

	ecsClusters, err := c.GetECSClusters()
	if err == nil && len(ecsClusters) > 0 {
		resources := make([]model.Resource, len(ecsClusters))
		for i, cluster := range ecsClusters {
			resources[i] = model.Resource{
				ID:    cluster.Name,
				Type:  "Cluster",
				State: cluster.Status,
			}
		}
		groups = append(groups, model.ResourceGroup{
			Service:   "ECS",
			Count:     len(ecsClusters),
			Resources: resources,
		})
	}

	return groups, nil
}
