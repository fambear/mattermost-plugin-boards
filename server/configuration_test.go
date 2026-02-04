// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConfigurationClone(t *testing.T) {
	t.Run("clone creates independent copy", func(t *testing.T) {
		original := &configuration{
			AWSAccessKeyID:     "AKIAIOSFODNN7EXAMPLE",
			AWSSecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
			AWSRegion:          "us-west-2",
		}

		cloned := original.Clone()

		// Values should be equal
		assert.Equal(t, original.AWSAccessKeyID, cloned.AWSAccessKeyID)
		assert.Equal(t, original.AWSSecretAccessKey, cloned.AWSSecretAccessKey)
		assert.Equal(t, original.AWSRegion, cloned.AWSRegion)

		// But they should be different instances
		assert.NotSame(t, original, cloned)

		// Modifying clone should not affect original
		cloned.AWSAccessKeyID = "MODIFIED"
		assert.Equal(t, "AKIAIOSFODNN7EXAMPLE", original.AWSAccessKeyID)
		assert.Equal(t, "MODIFIED", cloned.AWSAccessKeyID)
	})

	t.Run("clone empty configuration", func(t *testing.T) {
		original := &configuration{}
		cloned := original.Clone()

		assert.Equal(t, original.AWSAccessKeyID, cloned.AWSAccessKeyID)
		assert.Equal(t, original.AWSSecretAccessKey, cloned.AWSSecretAccessKey)
		assert.Equal(t, original.AWSRegion, cloned.AWSRegion)
	})
}

func TestConfiguration(t *testing.T) {
	t.Run("full configuration", func(t *testing.T) {
		config := configuration{
			AWSAccessKeyID:     "test-key-id",
			AWSSecretAccessKey: "test-secret-key",
			AWSRegion:          "eu-central-1",
		}

		assert.Equal(t, "test-key-id", config.AWSAccessKeyID)
		assert.Equal(t, "test-secret-key", config.AWSSecretAccessKey)
		assert.Equal(t, "eu-central-1", config.AWSRegion)
	})

	t.Run("empty configuration", func(t *testing.T) {
		config := configuration{}

		assert.Equal(t, "", config.AWSAccessKeyID)
		assert.Equal(t, "", config.AWSSecretAccessKey)
		assert.Equal(t, "", config.AWSRegion)
	})

	t.Run("configuration with partial data", func(t *testing.T) {
		config := configuration{
			AWSAccessKeyID: "test-key",
			// Secret key and region are empty
		}

		assert.Equal(t, "test-key", config.AWSAccessKeyID)
		assert.Equal(t, "", config.AWSSecretAccessKey)
		assert.Equal(t, "", config.AWSRegion)
	})
}
