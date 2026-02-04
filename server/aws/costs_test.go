// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package aws

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCalculateDelta(t *testing.T) {
	tests := []struct {
		name              string
		current           float64
		previous          float64
		expectedDelta     float64
		expectedDeltaType string
	}{
		{
			name:              "increase from positive",
			current:           150.0,
			previous:          100.0,
			expectedDelta:     50.0,
			expectedDeltaType: "increase",
		},
		{
			name:              "decrease from positive",
			current:           80.0,
			previous:          100.0,
			expectedDelta:     20.0,
			expectedDeltaType: "decrease",
		},
		{
			name:              "no change",
			current:           100.0,
			previous:          100.0,
			expectedDelta:     0.0,
			expectedDeltaType: "neutral",
		},
		{
			name:              "both zero",
			current:           0.0,
			previous:          0.0,
			expectedDelta:     0.0,
			expectedDeltaType: "neutral",
		},
		{
			name:              "previous zero, current positive",
			current:           100.0,
			previous:          0.0,
			expectedDelta:     100.0,
			expectedDeltaType: "increase",
		},
		{
			name:              "both zero to positive",
			current:           0.0,
			previous:          0.0,
			expectedDelta:     0.0,
			expectedDeltaType: "neutral",
		},
		{
			name:              "small increase",
			current:           101.0,
			previous:          100.0,
			expectedDelta:     1.0,
			expectedDeltaType: "increase",
		},
		{
			name:              "small decrease",
			current:           99.0,
			previous:          100.0,
			expectedDelta:     1.0,
			expectedDeltaType: "decrease",
		},
		{
			name:              "large increase percentage",
			current:           200.0,
			previous:          50.0,
			expectedDelta:     300.0,
			expectedDeltaType: "increase",
		},
		{
			name:              "from zero to zero",
			current:           0.0,
			previous:          0.0,
			expectedDelta:     0.0,
			expectedDeltaType: "neutral",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			delta, deltaType := calculateDelta(tt.current, tt.previous)
			assert.Equal(t, tt.expectedDelta, delta)
			assert.Equal(t, tt.expectedDeltaType, deltaType)
		})
	}
}

func TestCalculateDeltaEdgeCases(t *testing.T) {
	t.Run("negative values should work", func(t *testing.T) {
		// Although costs shouldn't be negative, test the math works
		delta, deltaType := calculateDelta(-100.0, -200.0)
		assert.Equal(t, 50.0, delta)
		assert.Equal(t, "decrease", deltaType)
	})
}
