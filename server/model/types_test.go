// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResourceGroup(t *testing.T) {
	t.Run("valid resource group", func(t *testing.T) {
		group := ResourceGroup{
			Service: "EC2",
			Count:   2,
			Resources: []Resource{
				{
					ID:    "i-1234567890abcdef0",
					Type:  "t2.micro",
					State: "running",
					Details: map[string]interface{}{
						"availability_zone": "us-east-1a",
					},
				},
				{
					ID:    "i-0987654321fedcba0",
					Type:  "t3.small",
					State: "stopped",
					Details: map[string]interface{}{
						"availability_zone": "us-east-1b",
					},
				},
			},
		}

		assert.Equal(t, "EC2", group.Service)
		assert.Equal(t, 2, group.Count)
		assert.Len(t, group.Resources, 2)
		assert.Equal(t, "i-1234567890abcdef0", group.Resources[0].ID)
	})

	t.Run("empty resource group", func(t *testing.T) {
		group := ResourceGroup{
			Service:   "S3",
			Count:     0,
			Resources: []Resource{},
		}

		assert.Equal(t, "S3", group.Service)
		assert.Equal(t, 0, group.Count)
		assert.Empty(t, group.Resources)
	})

	t.Run("resource group serialization", func(t *testing.T) {
		group := ResourceGroup{
			Service: "Lambda",
			Count:   1,
			Resources: []Resource{
				{
					ID:    "my-function",
					Type:  "python3.9",
					State: "Active",
				},
			},
		}

		data, err := json.Marshal(group)
		assert.NoError(t, err)
		assert.Contains(t, string(data), "Lambda")
		assert.Contains(t, string(data), "my-function")

		var decoded ResourceGroup
		err = json.Unmarshal(data, &decoded)
		assert.NoError(t, err)
		assert.Equal(t, group.Service, decoded.Service)
		assert.Equal(t, group.Count, decoded.Count)
	})
}

func TestResource(t *testing.T) {
	t.Run("resource with details", func(t *testing.T) {
		resource := Resource{
			ID:    "db-instance-1",
			Type:  "mysql",
			State: "available",
			Details: map[string]interface{}{
				"version":        "8.0.35",
				"instance_class": "db.t3.micro",
			},
		}

		assert.Equal(t, "db-instance-1", resource.ID)
		assert.Equal(t, "mysql", resource.Type)
		assert.Equal(t, "available", resource.State)
		assert.NotNil(t, resource.Details)
		assert.Equal(t, "8.0.35", resource.Details["version"])
	})

	t.Run("resource without optional fields", func(t *testing.T) {
		resource := Resource{
			ID:   "bucket-name",
			Type: "Bucket",
		}

		assert.Equal(t, "bucket-name", resource.ID)
		assert.Equal(t, "Bucket", resource.Type)
		assert.Empty(t, resource.State)
		assert.Nil(t, resource.Details)
	})

	t.Run("resource serialization", func(t *testing.T) {
		resource := Resource{
			ID:    "test-resource",
			Type:  "test-type",
			State: "running",
			Details: map[string]interface{}{
				"key1": "value1",
				"key2": 123,
			},
		}

		data, err := json.Marshal(resource)
		assert.NoError(t, err)
		assert.Contains(t, string(data), "test-resource")

		var decoded Resource
		err = json.Unmarshal(data, &decoded)
		assert.NoError(t, err)
		assert.Equal(t, resource.ID, decoded.ID)
		assert.Equal(t, resource.Type, decoded.Type)
		assert.Equal(t, resource.State, decoded.State)
	})
}

func TestCostData(t *testing.T) {
	t.Run("cost data with increase", func(t *testing.T) {
		cost := CostData{
			Service:   "EC2",
			Amount:    150.50,
			Delta:     25.5,
			DeltaType: "increase",
		}

		assert.Equal(t, "EC2", cost.Service)
		assert.Equal(t, 150.50, cost.Amount)
		assert.Equal(t, 25.5, cost.Delta)
		assert.Equal(t, "increase", cost.DeltaType)
	})

	t.Run("cost data with decrease", func(t *testing.T) {
		cost := CostData{
			Service:   "S3",
			Amount:    80.25,
			Delta:     15.3,
			DeltaType: "decrease",
		}

		assert.Equal(t, "S3", cost.Service)
		assert.Equal(t, 80.25, cost.Amount)
		assert.Equal(t, 15.3, cost.Delta)
		assert.Equal(t, "decrease", cost.DeltaType)
	})

	t.Run("cost data with neutral delta", func(t *testing.T) {
		cost := CostData{
			Service:   "Lambda",
			Amount:    50.0,
			Delta:     0.0,
			DeltaType: "neutral",
		}

		assert.Equal(t, "Lambda", cost.Service)
		assert.Equal(t, 50.0, cost.Amount)
		assert.Equal(t, 0.0, cost.Delta)
		assert.Equal(t, "neutral", cost.DeltaType)
	})

	t.Run("cost data serialization", func(t *testing.T) {
		cost := CostData{
			Service:   "RDS",
			Amount:    200.75,
			Delta:     10.0,
			DeltaType: "increase",
		}

		data, err := json.Marshal(cost)
		assert.NoError(t, err)
		assert.Contains(t, string(data), "RDS")

		var decoded CostData
		err = json.Unmarshal(data, &decoded)
		assert.NoError(t, err)
		assert.Equal(t, cost.Service, decoded.Service)
		assert.Equal(t, cost.Amount, decoded.Amount)
		assert.Equal(t, cost.Delta, decoded.Delta)
		assert.Equal(t, cost.DeltaType, decoded.DeltaType)
	})
}

func TestCostDataEdgeCases(t *testing.T) {
	t.Run("zero cost", func(t *testing.T) {
		cost := CostData{
			Service:   "ECS",
			Amount:    0.0,
			Delta:     0.0,
			DeltaType: "neutral",
		}

		assert.Equal(t, 0.0, cost.Amount)
		assert.Equal(t, 0.0, cost.Delta)
	})

	t.Run("large delta percentage", func(t *testing.T) {
		cost := CostData{
			Service:   "CloudFront",
			Amount:    500.0,
			Delta:     300.0,
			DeltaType: "increase",
		}

		assert.Equal(t, 300.0, cost.Delta)
	})
}
