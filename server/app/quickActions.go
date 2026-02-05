// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"fmt"
	"time"

	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/mattermost/mattermost-plugin-boards/server/utils"
)

const (
	SpecialValueCurrentUser = "{current_user}"
	SpecialValueNow         = "{now}"
)

// ExecuteQuickAction executes a quick action on a card
func (a *App) ExecuteQuickAction(boardID, cardID, actionID, userID string) error {
	// Get the board
	board, err := a.GetBoard(boardID)
	if err != nil {
		return fmt.Errorf("failed to get board: %w", err)
	}
	if board == nil {
		return fmt.Errorf("board not found")
	}

	// Check permissions
	if !a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionManageBoardCards) {
		return model.NewErrPermission("access denied")
	}

	// Get quick actions from board properties
	quickActions := getQuickActionsFromBoard(board)
	var action *model.QuickAction
	for _, qa := range quickActions {
		if qa.ID == actionID {
			action = &qa
			break
		}
	}
	if action == nil {
		return model.NewErrNotFound("quick action")
	}

	// Get the card
	cardBlock, err := a.store.GetBlock(cardID)
	if err != nil {
		return fmt.Errorf("failed to get card: %w", err)
	}
	if cardBlock == nil || cardBlock.Type != model.TypeCard {
		return model.NewErrBadRequest("card not found")
	}

	// Validate the action
	if err := action.IsValid(); err != nil {
		return fmt.Errorf("invalid quick action: %w", err)
	}

	// Execute each action in order
	for _, actionDef := range action.Actions {
		if err := a.executeQuickActionAction(boardID, cardBlock, &actionDef, userID); err != nil {
			return fmt.Errorf("failed to execute action: %w", err)
		}
	}

	return nil
}

// executeQuickActionAction executes a single action from a quick action
func (a *App) executeQuickActionAction(boardID string, cardBlock *model.Block, action *model.QuickActionAction, userID string) error {
	switch action.Type {
	case model.QuickActionSetProperty:
		value := action.Value
		// Handle special values
		if value == SpecialValueCurrentUser {
			value = userID
		} else if value == SpecialValueNow {
			value = fmt.Sprintf("%d", time.Now().UnixMilli())
		}
		return a.setCardProperty(cardBlock, action.PropertyID, value, userID)

	case model.QuickActionClearProperty:
		return a.clearCardProperty(cardBlock, action.PropertyID, userID)

	case model.QuickActionAddComment:
		return a.addCardComment(cardBlock, boardID, action.Text, userID)

	default:
		return fmt.Errorf("unknown action type: %s", action.Type)
	}
}

// setCardProperty sets a property on a card
func (a *App) setCardProperty(cardBlock *model.Block, propertyID, value, userID string) error {
	if cardBlock.Fields == nil {
		cardBlock.Fields = map[string]interface{}{}
	}
	props, ok := cardBlock.Fields["properties"].(map[string]interface{})
	if !ok {
		props = map[string]interface{}{}
		cardBlock.Fields["properties"] = props
	}

	props[propertyID] = value
	cardBlock.ModifiedBy = userID

	patch := &model.BlockPatch{
		UpdatedFields: map[string]interface{}{
			"properties": cardBlock.Fields["properties"],
		},
	}

	_, err := a.PatchBlockAndNotify(cardBlock.ID, patch, userID, false)
	return err
}

// clearCardProperty clears a property on a card
func (a *App) clearCardProperty(cardBlock *model.Block, propertyID, userID string) error {
	if cardBlock.Fields == nil {
		return nil
	}
	props, ok := cardBlock.Fields["properties"].(map[string]interface{})
	if !ok {
		return nil
	}

	delete(props, propertyID)

	patch := &model.BlockPatch{
		UpdatedFields: map[string]interface{}{
			"properties": cardBlock.Fields["properties"],
		},
	}

	_, err := a.PatchBlockAndNotify(cardBlock.ID, patch, userID, false)
	return err
}

// addCardComment adds a comment to a card
func (a *App) addCardComment(cardBlock *model.Block, boardID, text, userID string) error {
	now := utils.GetMillis()
	commentBlock := model.Block{
		ID:         utils.NewID(utils.IDTypeBlock),
		ParentID:   cardBlock.ID,
		BoardID:    boardID,
		CreatedBy:  userID,
		ModifiedBy: userID,
		CreateAt:   now,
		UpdateAt:   now,
		DeleteAt:   0,
		Type:       model.TypeComment,
		Title:      text,
		Fields:     map[string]interface{}{},
	}

	err := a.InsertBlockAndNotify(&commentBlock, userID, false)
	return err
}

// getQuickActionsFromBoard extracts quick actions from board properties
func getQuickActionsFromBoard(board *model.Board) []model.QuickAction {
	if board.Properties == nil {
		return []model.QuickAction{}
	}

	quickActionsRaw, ok := board.Properties["quickActions"]
	if !ok {
		return []model.QuickAction{}
	}

	// Convert to []interface{} first
	quickActionsArray, ok := quickActionsRaw.([]interface{})
	if !ok {
		return []model.QuickAction{}
	}

	quickActions := make([]model.QuickAction, 0, len(quickActionsArray))
	for _, qaRaw := range quickActionsArray {
		qaMap, ok := qaRaw.(map[string]interface{})
		if !ok {
			continue
		}

		// Convert map to QuickAction
		qa := model.QuickAction{}
		if id, ok := qaMap["id"].(string); ok {
			qa.ID = id
		}
		if name, ok := qaMap["name"].(string); ok {
			qa.Name = name
		}
		if style, ok := qaMap["style"].(map[string]interface{}); ok {
			qa.Style = make(map[string]string)
			for k, v := range style {
				if vs, ok := v.(string); ok {
					qa.Style[k] = vs
				}
			}
		}
		if confirmRequired, ok := qaMap["confirmRequired"].(bool); ok {
			qa.ConfirmRequired = confirmRequired
		}
		if confirmText, ok := qaMap["confirmText"].(string); ok {
			qa.ConfirmText = confirmText
		}

		// Parse conditions
		if conditionsRaw, ok := qaMap["conditions"].([]interface{}); ok {
			qa.Conditions = make([]model.QuickActionCondition, 0, len(conditionsRaw))
			for _, condRaw := range conditionsRaw {
				condMap, ok := condRaw.(map[string]interface{})
				if !ok {
					continue
				}
				cond := model.QuickActionCondition{}
				if propertyID, ok := condMap["propertyId"].(string); ok {
					cond.PropertyID = propertyID
				}
				if operator, ok := condMap["operator"].(string); ok {
					cond.Operator = model.QuickActionConditionOperator(operator)
				}
				if values, ok := condMap["values"].([]interface{}); ok {
					cond.Values = make([]string, 0, len(values))
					for _, v := range values {
						if vs, ok := v.(string); ok {
							cond.Values = append(cond.Values, vs)
						}
					}
				}
				qa.Conditions = append(qa.Conditions, cond)
			}
		}

		// Parse actions
		if actionsRaw, ok := qaMap["actions"].([]interface{}); ok {
			qa.Actions = make([]model.QuickActionAction, 0, len(actionsRaw))
			for _, actRaw := range actionsRaw {
				actMap, ok := actRaw.(map[string]interface{})
				if !ok {
					continue
				}
				act := model.QuickActionAction{}
				if actType, ok := actMap["type"].(string); ok {
					act.Type = model.QuickActionActionType(actType)
				}
				if propertyID, ok := actMap["propertyId"].(string); ok {
					act.PropertyID = propertyID
				}
				if value, ok := actMap["value"].(string); ok {
					act.Value = value
				}
				if text, ok := actMap["text"].(string); ok {
					act.Text = text
				}
				qa.Actions = append(qa.Actions, act)
			}
		}

		quickActions = append(quickActions, qa)
	}

	return quickActions
}
