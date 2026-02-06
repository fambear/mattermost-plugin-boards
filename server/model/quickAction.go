// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

type QuickActionConditionOperator string

const (
	QuickActionOpIn           QuickActionConditionOperator = "in"
	QuickActionOpNotIn        QuickActionConditionOperator = "not in"
	QuickActionOpEmpty        QuickActionConditionOperator = "empty"
	QuickActionOpNotEmpty     QuickActionConditionOperator = "not empty"
	QuickActionOpGreaterThan  QuickActionConditionOperator = ">"
	QuickActionOpLessThan     QuickActionConditionOperator = "<"
	QuickActionOpGreaterEqual QuickActionConditionOperator = ">="
	QuickActionOpLessEqual    QuickActionConditionOperator = "<="
	QuickActionOpEqual        QuickActionConditionOperator = "equal"
	QuickActionOpContains     QuickActionConditionOperator = "contains"
	QuickActionOpNotContains  QuickActionConditionOperator = "not contains"
	QuickActionOpChecked      QuickActionConditionOperator = "checked"
	QuickActionOpNotChecked   QuickActionConditionOperator = "not checked"
)

type QuickActionActionType string

const (
	QuickActionSetProperty   QuickActionActionType = "setProperty"
	QuickActionClearProperty QuickActionActionType = "clearProperty"
	QuickActionAddComment    QuickActionActionType = "addComment"
)

type QuickActionCondition struct {
	PropertyID string                       `json:"propertyId"`
	Operator   QuickActionConditionOperator `json:"operator"`
	Values     []string                     `json:"values,omitempty"`
}

type QuickActionAction struct {
	Type       QuickActionActionType `json:"type"`
	PropertyID string                `json:"propertyId,omitempty"`
	Value      string                `json:"value,omitempty"`
	Text       string                `json:"text,omitempty"`
}

type QuickAction struct {
	ID              string                 `json:"id"`
	Name            string                 `json:"name"`
	Style           map[string]string      `json:"style"`
	ConfirmRequired bool                   `json:"confirmRequired"`
	ConfirmText     string                 `json:"confirmText"`
	Conditions      []QuickActionCondition `json:"conditions"`
	Actions         []QuickActionAction    `json:"actions"`
}

// IsValid validates the QuickAction and returns an error if invalid.
func (qa *QuickAction) IsValid() error {
	if qa.ID == "" {
		return NewErrBadRequest("quick action ID is required")
	}
	if qa.Name == "" {
		return NewErrBadRequest("quick action name is required")
	}
	if qa.ConfirmRequired && qa.ConfirmText == "" {
		return NewErrBadRequest("confirmation text is required when confirmation is enabled")
	}
	if len(qa.Actions) == 0 {
		return NewErrBadRequest("quick action must have at least one action")
	}

	// Validate conditions
	for _, cond := range qa.Conditions {
		if cond.PropertyID == "" {
			return NewErrBadRequest("condition propertyId is required")
		}
		if !isValidQuickActionOperator(cond.Operator) {
			return NewErrBadRequest("invalid operator: " + string(cond.Operator))
		}
	}

	// Validate actions
	for _, action := range qa.Actions {
		if err := action.IsValid(); err != nil {
			return err
		}
	}

	return nil
}

// IsValid validates the QuickActionAction and returns an error if invalid.
func (a *QuickActionAction) IsValid() error {
	switch a.Type {
	case QuickActionSetProperty:
		if a.PropertyID == "" {
			return NewErrBadRequest("propertyId is required for setProperty action")
		}
	case QuickActionClearProperty:
		if a.PropertyID == "" {
			return NewErrBadRequest("propertyId is required for clearProperty action")
		}
	case QuickActionAddComment:
		if a.Text == "" {
			return NewErrBadRequest("text is required for addComment action")
		}
	default:
		return NewErrBadRequest("invalid action type: " + string(a.Type))
	}
	return nil
}

func isValidQuickActionOperator(op QuickActionConditionOperator) bool {
	switch op {
	case QuickActionOpIn, QuickActionOpNotIn,
		QuickActionOpEmpty, QuickActionOpNotEmpty,
		QuickActionOpGreaterThan, QuickActionOpLessThan,
		QuickActionOpGreaterEqual, QuickActionOpLessEqual,
		QuickActionOpEqual, QuickActionOpContains,
		QuickActionOpNotContains, QuickActionOpChecked,
		QuickActionOpNotChecked:
		return true
	default:
		return false
	}
}
