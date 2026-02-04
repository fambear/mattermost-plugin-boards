// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

type ResourceGroup struct {
	Service  string      `json:"service"`
	Count    int         `json:"count"`
	Resources []Resource `json:"resources"`
}

type Resource struct {
	ID      string                 `json:"id"`
	Type    string                 `json:"type"`
	State   string                 `json:"state,omitempty"`
	Details map[string]interface{} `json:"details,omitempty"`
}

type CostData struct {
	Service   string  `json:"service"`
	Amount    float64 `json:"amount"`
	Delta     float64 `json:"delta"`
	DeltaType string  `json:"deltaType"`
}
