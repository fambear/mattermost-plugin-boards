// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/mattermost/mattermost-plugin-boards/server/utils"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	commentTypeEdits    = "edits"
	commentTypeBot      = "bot"
	aggregationWindowMs = 60 * 1000 // 1 minute
)

// propertyChange represents a single property change for audit logging
type propertyChange struct {
	PropertyName string
	OldValue     string
	NewValue     string
}

// detectAndLogPropertyChanges detects property changes and creates audit comments
func (a *App) detectAndLogPropertyChanges(currentCard *model.Card, cardPatch *model.CardPatch, board *model.Board, cardID, userID string) {
	var changes []propertyChange

	// Check each property in the patch
	for propID, newValue := range cardPatch.UpdatedProperties {
		// Find property definition from board
		var propDef map[string]interface{}
		for _, p := range board.CardProperties {
			if id, ok := p["id"].(string); ok && id == propID {
				propDef = p
				break
			}
		}

		if propDef == nil {
			continue
		}

		propName, _ := propDef["name"].(string)
		propType, _ := propDef["type"].(string)

		// Get old value
		oldValue, hasOldValue := currentCard.Properties[propID]

		// Format the change based on property type
		changeLines := a.formatPropertyChange(propName, propType, propDef, oldValue, newValue, hasOldValue)
		changes = append(changes, changeLines...)
	}

	if len(changes) == 0 {
		return
	}

	// Determine comment type based on whether user is a bot
	commentType := commentTypeEdits
	if user, err := a.store.GetUserByID(userID); err == nil && user != nil && user.IsBot {
		commentType = commentTypeBot
	}

	// Create or append to audit comment
	if err := a.createOrUpdateAuditComment(cardID, board.ID, userID, commentType, changes); err != nil {
		a.logger.Warn("Failed to create audit comment for property changes",
			mlog.String("cardID", cardID),
			mlog.String("userID", userID),
			mlog.Err(err),
		)
	}
}

// formatPropertyChange formats a property change into one or more change lines
func (a *App) formatPropertyChange(propName, propType string, propDef map[string]interface{}, oldValue, newValue interface{}, hasOldValue bool) []propertyChange {
	switch propType {
	case "person", "multiPerson":
		return a.formatPersonPropertyChange(propName, propType, oldValue, newValue, hasOldValue)
	case "select":
		return a.formatSelectPropertyChange(propName, propDef, oldValue, newValue, hasOldValue)
	case "multiSelect":
		return a.formatMultiSelectPropertyChange(propName, propDef, oldValue, newValue, hasOldValue)
	case "date":
		return a.formatDatePropertyChange(propName, oldValue, newValue, hasOldValue, false)
	case "dateTime":
		return a.formatDatePropertyChange(propName, oldValue, newValue, hasOldValue, true)
	case "checkbox":
		return a.formatCheckboxPropertyChange(propName, oldValue, newValue, hasOldValue)
	default:
		return a.formatTextPropertyChange(propName, oldValue, newValue, hasOldValue)
	}
}

// formatPersonPropertyChange formats person-type property changes (both single and multi)
func (a *App) formatPersonPropertyChange(propName, propType string, oldValue, newValue interface{}, hasOldValue bool) []propertyChange {
	// Helper to format a single userID to @username
	formatSingleUser := func(userID string) string {
		if userID == "" {
			return ""
		}
		if user, err := a.store.GetUserByID(userID); err == nil && user != nil {
			return "@" + user.Username
		}
		return userID
	}

	// Helper to format a value (single string or slice) to comma-separated usernames
	formatValue := func(v interface{}) string {
		if v == nil {
			return ""
		}
		// Handle single person (string)
		if userID, ok := v.(string); ok {
			return formatSingleUser(userID)
		}
		// Handle multiPerson (slice)
		if slice, ok := v.([]interface{}); ok {
			var usernames []string
			for _, item := range slice {
				if userID, ok := item.(string); ok && userID != "" {
					usernames = append(usernames, formatSingleUser(userID))
				}
			}
			if len(usernames) > 0 {
				return strings.Join(usernames, ", ")
			}
		}
		// Handle []string (sometimes JSON unmarshals this way)
		if slice, ok := v.([]string); ok {
			var usernames []string
			for _, userID := range slice {
				if userID != "" {
					usernames = append(usernames, formatSingleUser(userID))
				}
			}
			if len(usernames) > 0 {
				return strings.Join(usernames, ", ")
			}
		}
		return ""
	}

	oldStr := formatValue(oldValue)
	newStr := formatValue(newValue)

	if !hasOldValue || oldStr == "" {
		if newStr != "" {
			return []propertyChange{{
				PropertyName: propName,
				NewValue:     newStr,
			}}
		}
		return nil
	}

	if newStr == "" {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
		}}
	}

	if oldStr != newStr {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
			NewValue:     newStr,
		}}
	}

	return nil
}

// formatSelectPropertyChange formats select property changes
func (a *App) formatSelectPropertyChange(propName string, propDef map[string]interface{}, oldValue, newValue interface{}, hasOldValue bool) []propertyChange {
	getOptionLabel := func(v interface{}) string {
		optionID, ok := v.(string)
		if !ok || optionID == "" {
			return ""
		}
		options, ok := propDef["options"].([]interface{})
		if !ok {
			return optionID
		}
		for _, opt := range options {
			optMap, ok := opt.(map[string]interface{})
			if !ok {
				continue
			}
			if id, ok := optMap["id"].(string); ok && id == optionID {
				if value, ok := optMap["value"].(string); ok {
					return value
				}
			}
		}
		return optionID
	}

	oldStr := getOptionLabel(oldValue)
	newStr := getOptionLabel(newValue)

	if !hasOldValue || oldStr == "" {
		if newStr != "" {
			return []propertyChange{{
				PropertyName: propName,
				NewValue:     newStr,
			}}
		}
		return nil
	}

	if newStr == "" {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
		}}
	}

	if oldStr != newStr {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
			NewValue:     newStr,
		}}
	}

	return nil
}

// formatMultiSelectPropertyChange formats multi-select property changes
func (a *App) formatMultiSelectPropertyChange(propName string, propDef map[string]interface{}, oldValue, newValue interface{}, hasOldValue bool) []propertyChange {
	getOptions := func(v interface{}) map[string]string {
		result := make(map[string]string)
		optIDs, ok := v.([]interface{})
		if !ok {
			return result
		}
		options, ok := propDef["options"].([]interface{})
		if !ok {
			for _, id := range optIDs {
				if idStr, ok := id.(string); ok {
					result[idStr] = idStr
				}
			}
			return result
		}
		optionLabels := make(map[string]string)
		for _, opt := range options {
			optMap, ok := opt.(map[string]interface{})
			if !ok {
				continue
			}
			if id, ok := optMap["id"].(string); ok {
				if value, ok := optMap["value"].(string); ok {
					optionLabels[id] = value
				}
			}
		}
		for _, id := range optIDs {
			if idStr, ok := id.(string); ok {
				if label, exists := optionLabels[idStr]; exists {
					result[idStr] = label
				} else {
					result[idStr] = idStr
				}
			}
		}
		return result
	}

	var changes []propertyChange

	oldOpts := getOptions(oldValue)
	newOpts := getOptions(newValue)

	// Find added options
	for id, label := range newOpts {
		if _, exists := oldOpts[id]; !exists {
			changes = append(changes, propertyChange{
				PropertyName: propName,
				NewValue:     label,
			})
		}
	}

	// Find removed options
	for id, label := range oldOpts {
		if _, exists := newOpts[id]; !exists {
			changes = append(changes, propertyChange{
				PropertyName: propName,
				OldValue:     label,
			})
		}
	}

	return changes
}

// formatDatePropertyChange formats date/dateTime property changes
func (a *App) formatDatePropertyChange(propName string, oldValue, newValue interface{}, hasOldValue bool, withTime bool) []propertyChange {
	formatDate := func(v interface{}) string {
		if v == nil {
			return ""
		}
		jsonStr, ok := v.(string)
		if !ok {
			return ""
		}
		var m map[string]int64
		if err := json.Unmarshal([]byte(jsonStr), &m); err != nil {
			return ""
		}
		tsFrom, ok := m["from"]
		if !ok {
			return ""
		}
		t := utils.GetTimeForMillis(tsFrom)
		if withTime {
			return t.Format("02.01.2006 15:04")
		}
		return t.Format("02.01.2006")
	}

	oldStr := formatDate(oldValue)
	newStr := formatDate(newValue)

	if !hasOldValue || oldStr == "" {
		if newStr != "" {
			return []propertyChange{{
				PropertyName: propName,
				NewValue:     newStr,
			}}
		}
		return nil
	}

	if newStr == "" {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
		}}
	}

	if oldStr != newStr {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
			NewValue:     newStr,
		}}
	}

	return nil
}

// formatCheckboxPropertyChange formats checkbox property changes
func (a *App) formatCheckboxPropertyChange(propName string, oldValue, newValue interface{}, hasOldValue bool) []propertyChange {
	formatBool := func(v interface{}) string {
		b, ok := v.(bool)
		if !ok {
			return ""
		}
		if b {
			return "Yes"
		}
		return "No"
	}

	oldStr := formatBool(oldValue)
	newStr := formatBool(newValue)

	if !hasOldValue || oldStr == "" {
		if newStr != "" {
			return []propertyChange{{
				PropertyName: propName,
				NewValue:     newStr,
			}}
		}
		return nil
	}

	if newStr == "" {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
		}}
	}

	if oldStr != newStr {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
			NewValue:     newStr,
		}}
	}

	return nil
}

// formatTextPropertyChange formats text property changes
func (a *App) formatTextPropertyChange(propName string, oldValue, newValue interface{}, hasOldValue bool) []propertyChange {
	formatValue := func(v interface{}) string {
		if v == nil {
			return ""
		}
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}

	oldStr := formatValue(oldValue)
	newStr := formatValue(newValue)

	if !hasOldValue || oldStr == "" {
		if newStr != "" {
			return []propertyChange{{
				PropertyName: propName,
				NewValue:     newStr,
			}}
		}
		return nil
	}

	if newStr == "" {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
		}}
	}

	if oldStr != newStr {
		return []propertyChange{{
			PropertyName: propName,
			OldValue:     oldStr,
			NewValue:     newStr,
		}}
	}

	return nil
}

// createOrUpdateAuditComment creates a new audit comment or appends to an existing one
func (a *App) createOrUpdateAuditComment(cardID, boardID, userID, commentType string, changes []propertyChange) error {
	// Check if we should aggregate with an existing comment
	latestComment, err := a.getLastAuditComment(cardID, commentType)
	if err == nil && latestComment != nil {
		// Check if within aggregation window
		now := utils.GetMillis()
		if now-latestComment.CreateAt < aggregationWindowMs {
			// Append to existing comment
			return a.appendAuditComment(latestComment, changes, userID)
		}
	}

	// Create new comment
	return a.createNewAuditComment(cardID, boardID, userID, commentType, changes)
}

// getLastAuditComment retrieves the most recent audit comment of the specified type
func (a *App) getLastAuditComment(cardID, commentType string) (*model.Block, error) {
	comments, err := a.store.GetBlocksWithParentAndType("", cardID, model.TypeComment)
	if err != nil {
		return nil, err
	}

	var latestComment *model.Block
	var latestCreateAt int64

	for _, comment := range comments {
		if comment.Fields == nil {
			continue
		}
		ct, ok := comment.Fields["commentType"].(string)
		if !ok || ct != commentType {
			continue
		}
		if comment.CreateAt > latestCreateAt {
			latestCreateAt = comment.CreateAt
			latestComment = comment
		}
	}

	return latestComment, nil
}

// createNewAuditComment creates a new audit comment
func (a *App) createNewAuditComment(cardID, boardID, userID, commentType string, changes []propertyChange) error {
	now := utils.GetMillis()
	commentText := a.formatChangesToText(changes)

	commentBlock := &model.Block{
		ID:         utils.NewID(utils.IDTypeBlock),
		ParentID:   cardID,
		BoardID:    boardID,
		CreatedBy:  userID,
		ModifiedBy: userID,
		CreateAt:   now,
		UpdateAt:   now,
		DeleteAt:   0,
		Type:       model.TypeComment,
		Title:      commentText,
		Fields: map[string]interface{}{
			"commentType": commentType,
		},
	}

	return a.InsertBlockAndNotify(commentBlock, userID, false)
}

// appendAuditComment appends new changes to an existing audit comment
func (a *App) appendAuditComment(comment *model.Block, changes []propertyChange, userID string) error {
	// Append new lines to existing comment
	newLines := a.formatChangesToText(changes)
	updatedTitle := comment.Title + "\n" + newLines

	patch := &model.BlockPatch{
		Title: &updatedTitle,
	}

	_, err := a.PatchBlockAndNotify(comment.ID, patch, userID, false)
	return err
}

// formatChangesToText formats changes into comment text
func (a *App) formatChangesToText(changes []propertyChange) string {
	var lines []string
	for _, change := range changes {
		if change.OldValue != "" && change.NewValue != "" {
			// Value changed from X to Y
			lines = append(lines, change.PropertyName+" changed from "+change.OldValue+" to "+change.NewValue)
		} else if change.OldValue != "" && change.NewValue == "" {
			// Value was cleared
			lines = append(lines, change.PropertyName+" cleared (was "+change.OldValue+")")
		} else if change.NewValue != "" {
			// Value was set (no previous value)
			lines = append(lines, change.PropertyName+" set to "+change.NewValue)
		}
		// Skip if both old and new are empty (no change to report)
	}
	return strings.Join(lines, "\n")
}

// logCardRelationChange logs a card relation change
func (a *App) logCardRelationChange(cardID, boardID, userID, relationType string, relatedCard *model.Card, isDeletion bool) {
	if relatedCard == nil {
		return
	}

	commentType := commentTypeEdits
	if user, err := a.store.GetUserByID(userID); err == nil && user != nil && user.IsBot {
		commentType = commentTypeBot
	}

	now := utils.GetMillis()
	var commentText string
	relatedCardCode := relatedCard.Code
	if relatedCardCode == "" {
		relatedCardCode = relatedCard.ID
	}

	if isDeletion {
		commentText = "Relation removed: " + string(relationType) + " " + relatedCardCode
	} else {
		commentText = "Relation added: " + string(relationType) + " " + relatedCardCode
	}

	commentBlock := &model.Block{
		ID:         utils.NewID(utils.IDTypeBlock),
		ParentID:   cardID,
		BoardID:    boardID,
		CreatedBy:  userID,
		ModifiedBy: userID,
		CreateAt:   now,
		UpdateAt:   now,
		DeleteAt:   0,
		Type:       model.TypeComment,
		Title:      commentText,
		Fields: map[string]interface{}{
			"commentType": commentType,
		},
	}

	if err := a.InsertBlockAndNotify(commentBlock, userID, false); err != nil {
		a.logger.Warn("Failed to create audit comment for relation change",
			mlog.String("cardID", cardID),
			mlog.String("userID", userID),
			mlog.Err(err),
		)
	}
}
