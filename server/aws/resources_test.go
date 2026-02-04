// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package aws

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestEC2Instance(t *testing.T) {
	t.Run("valid EC2 instance", func(t *testing.T) {
		instance := EC2Instance{
			ID:    "i-1234567890abcdef0",
			Type:  "t2.micro",
			State: "running",
			AZ:    "us-east-1a",
		}

		assert.Equal(t, "i-1234567890abcdef0", instance.ID)
		assert.Equal(t, "t2.micro", instance.Type)
		assert.Equal(t, "running", instance.State)
		assert.Equal(t, "us-east-1a", instance.AZ)
	})

	t.Run("empty EC2 instance", func(t *testing.T) {
		instance := EC2Instance{}
		assert.Equal(t, "", instance.ID)
		assert.Equal(t, "", instance.Type)
		assert.Equal(t, "", instance.State)
		assert.Equal(t, "", instance.AZ)
	})
}

func TestS3Bucket(t *testing.T) {
	t.Run("valid S3 bucket", func(t *testing.T) {
		bucket := S3Bucket{
			Name:         "my-bucket",
			CreationDate: "2025-01-15",
		}

		assert.Equal(t, "my-bucket", bucket.Name)
		assert.Equal(t, "2025-01-15", bucket.CreationDate)
	})
}

func TestLambdaFunction(t *testing.T) {
	t.Run("valid Lambda function", func(t *testing.T) {
		fn := LambdaFunction{
			Name:    "my-function",
			Runtime: "python3.9",
			State:   "Active",
		}

		assert.Equal(t, "my-function", fn.Name)
		assert.Equal(t, "python3.9", fn.Runtime)
		assert.Equal(t, "Active", fn.State)
	})

	t.Run("Lambda function with different state", func(t *testing.T) {
		fn := LambdaFunction{
			Name:    "my-function",
			Runtime: "nodejs18.x",
			State:   "Pending",
		}

		assert.Equal(t, "Pending", fn.State)
	})
}

func TestRDSInstance(t *testing.T) {
	t.Run("valid RDS instance", func(t *testing.T) {
		db := RDSInstance{
			ID:               "my-db-instance",
			Engine:           "mysql",
			EngineVersion:    "8.0.35",
			InstanceClass:    "db.t3.micro",
			DBInstanceStatus: "available",
		}

		assert.Equal(t, "my-db-instance", db.ID)
		assert.Equal(t, "mysql", db.Engine)
		assert.Equal(t, "8.0.35", db.EngineVersion)
		assert.Equal(t, "db.t3.micro", db.InstanceClass)
		assert.Equal(t, "available", db.DBInstanceStatus)
	})
}

func TestECSCluster(t *testing.T) {
	t.Run("valid ECS cluster", func(t *testing.T) {
		cluster := ECSCluster{
			Name:   "my-cluster",
			Status: "ACTIVE",
		}

		assert.Equal(t, "my-cluster", cluster.Name)
		assert.Equal(t, "ACTIVE", cluster.Status)
	})

	t.Run("ECS cluster with different status", func(t *testing.T) {
		cluster := ECSCluster{
			Name:   "my-cluster",
			Status: "PROVISIONING",
		}

		assert.Equal(t, "PROVISIONING", cluster.Status)
	})
}
