// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package aws

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewClient(t *testing.T) {
	tests := []struct {
		name        string
		region      string
		accessKey   string
		secretKey   string
		expectError bool
	}{
		{
			name:        "valid credentials",
			region:      "us-east-1",
			accessKey:   "AKIAIOSFODNN7EXAMPLE",
			secretKey:   "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
			expectError: false,
		},
		{
			name:        "empty region",
			region:      "",
			accessKey:   "AKIAIOSFODNN7EXAMPLE",
			secretKey:   "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
			expectError: false,
		},
		{
			name:        "empty access key",
			region:      "us-east-1",
			accessKey:   "",
			secretKey:   "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
			expectError: false,
		},
		{
			name:        "empty secret key",
			region:      "us-east-1",
			accessKey:   "AKIAIOSFODNN7EXAMPLE",
			secretKey:   "",
			expectError: false,
		},
		{
			name:        "all empty",
			region:      "",
			accessKey:   "",
			secretKey:   "",
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client, err := NewClient(tt.region, tt.accessKey, tt.secretKey)

			if tt.expectError {
				assert.Error(t, err)
				assert.Nil(t, client)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, client)
				assert.Equal(t, tt.region, client.region)
				assert.Equal(t, tt.accessKey, client.accessKey)
				assert.Equal(t, tt.secretKey, client.secretKey)
			}
		})
	}
}

func TestClientGetters(t *testing.T) {
	client, err := NewClient("us-east-1", "test-key", "test-secret")
	assert.NoError(t, err)
	assert.NotNil(t, client)

	// Test that all client getters return non-nil clients
	assert.NotNil(t, client.GetEC2Client())
	assert.NotNil(t, client.GetS3Client())
	assert.NotNil(t, client.GetLambdaClient())
	assert.NotNil(t, client.GetRDSClient())
	assert.NotNil(t, client.GetECSClient())
	assert.NotNil(t, client.GetCostExplorerClient())
}
