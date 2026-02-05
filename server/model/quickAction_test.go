// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	"testing"
)

func TestQuickAction_IsValid(t *testing.T) {
	tests := []struct {
		name      string
		action    QuickAction
		expectErr bool
		errMsg    string
	}{
		{
			name: "Valid quick action with setProperty",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Start Work",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions: []QuickActionCondition{
					{
						PropertyID: "status-prop-id",
						Operator:   QuickActionOpIn,
						Values:     []string{"waiting-id"},
					},
				},
				Actions: []QuickActionAction{
					{
						Type:       QuickActionSetProperty,
						PropertyID: "status-prop-id",
						Value:      "in-progress-id",
					},
				},
			},
			expectErr: false,
		},
		{
			name: "Valid quick action with addComment",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Add Comment",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions:      []QuickActionCondition{},
				Actions: []QuickActionAction{
					{
						Type: QuickActionAddComment,
						Text: "Work started",
					},
				},
			},
			expectErr: false,
		},
		{
			name: "Valid quick action with confirmation",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Delete Card",
				Style: map[string]string{
					"color": "#cc0000",
				},
				ConfirmRequired: true,
				ConfirmText:     "Are you sure you want to delete this card?",
				Conditions:      []QuickActionCondition{},
				Actions: []QuickActionAction{
					{
						Type:       QuickActionSetProperty,
						PropertyID: "status-prop-id",
						Value:      "deleted-id",
					},
				},
			},
			expectErr: false,
		},
		{
			name: "Valid quick action with clearProperty",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Clear Assignee",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions:      []QuickActionCondition{},
				Actions: []QuickActionAction{
					{
						Type:       QuickActionClearProperty,
						PropertyID: "assignee-prop-id",
					},
				},
			},
			expectErr: false,
		},
		{
			name: "Valid quick action with multiple actions",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Start Work and Comment",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions:      []QuickActionCondition{},
				Actions: []QuickActionAction{
					{
						Type:       QuickActionSetProperty,
						PropertyID: "status-prop-id",
						Value:      "in-progress-id",
					},
					{
						Type: QuickActionAddComment,
						Text: "Work started",
					},
				},
			},
			expectErr: false,
		},
		{
			name: "Invalid quick action with empty ID",
			action: QuickAction{
				ID:   "",
				Name: "Test Action",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions:      []QuickActionCondition{},
				Actions: []QuickActionAction{
					{
						Type: QuickActionAddComment,
						Text: "Test",
					},
				},
			},
			expectErr: true,
			errMsg:    "quick action ID is required",
		},
		{
			name: "Invalid quick action with empty name",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions:      []QuickActionCondition{},
				Actions: []QuickActionAction{
					{
						Type: QuickActionAddComment,
						Text: "Test",
					},
				},
			},
			expectErr: true,
			errMsg:    "quick action name is required",
		},
		{
			name: "Invalid quick action with confirmRequired but empty confirmText",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Test Action",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: true,
				ConfirmText:     "",
				Conditions:      []QuickActionCondition{},
				Actions: []QuickActionAction{
					{
						Type: QuickActionAddComment,
						Text: "Test",
					},
				},
			},
			expectErr: true,
			errMsg:    "confirmation text is required when confirmation is enabled",
		},
		{
			name: "Invalid quick action with no actions",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Test Action",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions:      []QuickActionCondition{},
				Actions:         []QuickActionAction{},
			},
			expectErr: true,
			errMsg:    "quick action must have at least one action",
		},
		{
			name: "Invalid quick action with condition missing propertyId",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Test Action",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions: []QuickActionCondition{
					{
						PropertyID: "",
						Operator:   QuickActionOpIn,
						Values:     []string{"value"},
					},
				},
				Actions: []QuickActionAction{
					{
						Type: QuickActionAddComment,
						Text: "Test",
					},
				},
			},
			expectErr: true,
			errMsg:    "condition propertyId is required",
		},
		{
			name: "Invalid quick action with invalid operator",
			action: QuickAction{
				ID:   "test-action-id",
				Name: "Test Action",
				Style: map[string]string{
					"color": "#0066cc",
				},
				ConfirmRequired: false,
				ConfirmText:     "",
				Conditions: []QuickActionCondition{
					{
						PropertyID: "prop-id",
						Operator:   QuickActionConditionOperator("invalid"),
						Values:     []string{"value"},
					},
				},
				Actions: []QuickActionAction{
					{
						Type: QuickActionAddComment,
						Text: "Test",
					},
				},
			},
			expectErr: true,
			errMsg:    "invalid operator",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.action.IsValid()
			if (err != nil) != tt.expectErr {
				t.Errorf("expected error: %v, got: %v", tt.expectErr, err)
			}
			if err != nil && tt.expectErr && tt.errMsg != "" {
				if err.Error() != tt.errMsg && !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error message to contain %q, got: %q", tt.errMsg, err.Error())
				}
			}
		})
	}
}

func TestQuickActionAction_IsValid(t *testing.T) {
	tests := []struct {
		name      string
		action    QuickActionAction
		expectErr bool
		errMsg    string
	}{
		{
			name: "Valid setProperty action",
			action: QuickActionAction{
				Type:       QuickActionSetProperty,
				PropertyID: "status-prop-id",
				Value:      "in-progress-id",
			},
			expectErr: false,
		},
		{
			name: "Valid clearProperty action",
			action: QuickActionAction{
				Type:       QuickActionClearProperty,
				PropertyID: "assignee-prop-id",
			},
			expectErr: false,
		},
		{
			name: "Valid addComment action",
			action: QuickActionAction{
				Type: QuickActionAddComment,
				Text: "This is a comment",
			},
			expectErr: false,
		},
		{
			name: "Valid setProperty with {current_user} special value",
			action: QuickActionAction{
				Type:       QuickActionSetProperty,
				PropertyID: "assignee-prop-id",
				Value:      "{current_user}",
			},
			expectErr: false,
		},
		{
			name: "Valid setProperty with {now} special value",
			action: QuickActionAction{
				Type:       QuickActionSetProperty,
				PropertyID: "due-date-prop-id",
				Value:      "{now}",
			},
			expectErr: false,
		},
		{
			name: "Invalid setProperty with missing propertyId",
			action: QuickActionAction{
				Type:  QuickActionSetProperty,
				Value: "value",
			},
			expectErr: true,
			errMsg:    "propertyId is required for setProperty action",
		},
		{
			name: "Invalid clearProperty with missing propertyId",
			action: QuickActionAction{
				Type: QuickActionClearProperty,
			},
			expectErr: true,
			errMsg:    "propertyId is required for clearProperty action",
		},
		{
			name: "Invalid addComment with empty text",
			action: QuickActionAction{
				Type: QuickActionAddComment,
				Text: "",
			},
			expectErr: true,
			errMsg:    "text is required for addComment action",
		},
		{
			name: "Invalid action type",
			action: QuickActionAction{
				Type: QuickActionActionType("invalid"),
			},
			expectErr: true,
			errMsg:    "invalid action type",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.action.IsValid()
			if (err != nil) != tt.expectErr {
				t.Errorf("expected error: %v, got: %v", tt.expectErr, err)
			}
			if err != nil && tt.expectErr && tt.errMsg != "" {
				if err.Error() != tt.errMsg && !containsSubstring(err.Error(), tt.errMsg) {
					t.Errorf("expected error message to contain %q, got: %q", tt.errMsg, err.Error())
				}
			}
		})
	}
}

func TestIsValidQuickActionOperator(t *testing.T) {
	tests := []struct {
		name     string
		operator QuickActionConditionOperator
		expected bool
	}{
		{"in operator", QuickActionOpIn, true},
		{"not in operator", QuickActionOpNotIn, true},
		{"empty operator", QuickActionOpEmpty, true},
		{"not empty operator", QuickActionOpNotEmpty, true},
		{"> operator", QuickActionOpGreaterThan, true},
		{"< operator", QuickActionOpLessThan, true},
		{">= operator", QuickActionOpGreaterEqual, true},
		{"<= operator", QuickActionOpLessEqual, true},
		{"equal operator", QuickActionOpEqual, true},
		{"contains operator", QuickActionOpContains, true},
		{"not contains operator", QuickActionOpNotContains, true},
		{"checked operator", QuickActionOpChecked, true},
		{"not checked operator", QuickActionOpNotChecked, true},
		{"invalid operator", QuickActionConditionOperator("invalid"), false},
		{"empty operator string", QuickActionConditionOperator(""), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isValidQuickActionOperator(tt.operator)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func containsSubstring(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > len(substr) && containsStringHelper(s, substr)))
}

func containsStringHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
