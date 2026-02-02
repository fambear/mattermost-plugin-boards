// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"github.com/mattermost/mattermost-plugin-boards/server/model"
)

// ValidateContentOrderResult contains the results of validating a card's contentOrder.
type ValidateContentOrderResult struct {
	ValidOrder  []interface{} // contentOrder with only valid IDs
	OrphanedIDs []string      // IDs in contentOrder that don't exist in blocks
	MissingIDs  []string      // Block IDs that exist but aren't in contentOrder
	HasIssues   bool          // True if there are any issues
}

// ValidateContentOrder checks a card's contentOrder against actual blocks.
// Returns a ValidateContentOrderResult with details about any issues found.
func ValidateContentOrder(contentOrder []interface{}, blocks []*model.Block) ValidateContentOrderResult {
	result := ValidateContentOrderResult{
		ValidOrder:  make([]interface{}, 0),
		OrphanedIDs: make([]string, 0),
		MissingIDs:  make([]string, 0),
		HasIssues:   false,
	}

	if len(contentOrder) == 0 {
		if len(blocks) > 0 {
			result.HasIssues = true
			for _, block := range blocks {
				result.MissingIDs = append(result.MissingIDs, block.ID)
			}
		}
		return result
	}

	blockIDSet := make(map[string]bool)
	for _, block := range blocks {
		blockIDSet[block.ID] = true
	}

	seenInOrder := make(map[string]bool)

	for _, item := range contentOrder {
		if item == nil {
			continue
		}

		if itemID, ok := item.(string); ok {
			if blockIDSet[itemID] {
				result.ValidOrder = append(result.ValidOrder, itemID)
				seenInOrder[itemID] = true
			} else {
				result.OrphanedIDs = append(result.OrphanedIDs, itemID)
				result.HasIssues = true
			}
		} else if itemArray, ok := item.([]interface{}); ok {
			validGroup := make([]interface{}, 0)
			for _, subItem := range itemArray {
				if subItem == nil {
					continue
				}
				if subItemID, ok := subItem.(string); ok {
					if blockIDSet[subItemID] {
						validGroup = append(validGroup, subItemID)
						seenInOrder[subItemID] = true
					} else {
						result.OrphanedIDs = append(result.OrphanedIDs, subItemID)
						result.HasIssues = true
					}
				}
			}
			if len(validGroup) > 0 {
				result.ValidOrder = append(result.ValidOrder, validGroup)
			}
		}
	}

	for _, block := range blocks {
		if !seenInOrder[block.ID] {
			result.MissingIDs = append(result.MissingIDs, block.ID)
			result.HasIssues = true
		}
	}

	return result
}

// RepairContentOrder creates a corrected contentOrder array for a card.
// It preserves the order of valid blocks and appends missing blocks at the end.
func RepairContentOrder(card *model.Block, allBlocks []*model.Block) []interface{} {
	if card == nil || card.Fields == nil {
		return []interface{}{}
	}

	contentOrderRaw, ok := card.Fields["contentOrder"]
	if !ok || contentOrderRaw == nil {
		contentOrderRaw = []interface{}{}
	}

	contentOrder, ok := contentOrderRaw.([]interface{})
	if !ok {
		contentOrder = []interface{}{}
	}

	validation := ValidateContentOrder(contentOrder, allBlocks)

	if !validation.HasIssues {
		return contentOrder
	}

	repairedOrder := make([]interface{}, 0, len(validation.ValidOrder)+len(validation.MissingIDs))
	repairedOrder = append(repairedOrder, validation.ValidOrder...)

	for _, missingID := range validation.MissingIDs {
		repairedOrder = append(repairedOrder, missingID)
	}

	return repairedOrder
}
