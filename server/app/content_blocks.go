// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"fmt"

	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/pkg/errors"
)

// isContentBlock returns true if the block type is a content block that should
// appear in a card's contentOrder. Comments are excluded because they have their
// own separate UI section.
func isContentBlock(blockType model.BlockType) bool {
	switch blockType {
	case model.TypeText, model.TypeCheckbox, model.TypeImage,
		model.TypeAttachment, model.TypeDivider, model.TypeVideo,
		model.TypeFilePDF, model.TypeFileGeneric:
		return true
	default:
		return false
	}
}

// appendToContentOrderIfNeeded appends a newly inserted content block to the
// parent card's contentOrder field. This ensures that content blocks created
// via the API (not just the UI) are visible without manual reordering.
// If the block is not a content block, or has no parent, this is a no-op.
func containsContentOrderID(contentOrder []interface{}, blockID string) bool {
	for _, item := range contentOrder {
		switch typedItem := item.(type) {
		case string:
			if typedItem == blockID {
				return true
			}
		case []interface{}:
			if containsContentOrderID(typedItem, blockID) {
				return true
			}
		}
	}

	return false
}

func (a *App) appendToContentOrderIfNeeded(block *model.Block, modifiedByID string, disableNotify bool) error {
	if block.ParentID == "" || block.ParentID == block.ID {
		return nil
	}

	if !isContentBlock(block.Type) {
		return nil
	}

	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		card, err := a.GetBlockByID(block.ParentID)
		if err != nil {
			return err
		}
		if card == nil || card.Type != model.TypeCard {
			return nil
		}

		// Get current contentOrder
		var contentOrder []interface{}
		if raw, ok := card.Fields["contentOrder"]; ok && raw != nil {
			if co, ok := raw.([]interface{}); ok {
				contentOrder = co
			}
		}

		if containsContentOrderID(contentOrder, block.ID) {
			return nil
		}

		newOrder := append(append([]interface{}{}, contentOrder...), block.ID)

		patch := &model.BlockPatch{
			UpdatedFields: map[string]interface{}{
				"contentOrder": newOrder,
			},
		}

		if _, patchErr := a.PatchBlockAndNotify(block.ParentID, patch, modifiedByID, disableNotify); patchErr != nil {
			return patchErr
		}

		updatedCard, getErr := a.GetBlockByID(block.ParentID)
		if getErr != nil {
			return getErr
		}

		var updatedOrder []interface{}
		if updatedCard != nil {
			if raw, ok := updatedCard.Fields["contentOrder"]; ok && raw != nil {
				if co, ok := raw.([]interface{}); ok {
					updatedOrder = co
				}
			}
		}

		if containsContentOrderID(updatedOrder, block.ID) {
			return nil
		}
	}

	return errors.New("failed to append block ID to contentOrder after retries")
}

// removeFromContentOrderIfNeeded removes a deleted content block from the
// parent card's contentOrder field.
func (a *App) removeFromContentOrderIfNeeded(block *model.Block, modifiedByID string, disableNotify bool) error {
	if block.ParentID == "" || block.ParentID == block.ID {
		return nil
	}

	if !isContentBlock(block.Type) {
		return nil
	}

	const maxRetries = 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		card, err := a.GetBlockByID(block.ParentID)
		if err != nil {
			return err
		}
		if card == nil || card.Type != model.TypeCard {
			return nil
		}

		var contentOrder []interface{}
		if raw, ok := card.Fields["contentOrder"]; ok && raw != nil {
			if co, ok := raw.([]interface{}); ok {
				contentOrder = co
			}
		}

		if len(contentOrder) == 0 {
			return nil
		}

		newOrder := make([]interface{}, 0, len(contentOrder))
		found := false
		for _, item := range contentOrder {
			if id, ok := item.(string); ok && id == block.ID {
				found = true
				continue
			}
			// Handle nested arrays (grouped blocks)
			if arr, ok := item.([]interface{}); ok {
				filtered := make([]interface{}, 0, len(arr))
				for _, sub := range arr {
					if id, ok := sub.(string); ok && id == block.ID {
						found = true
						continue
					}
					filtered = append(filtered, sub)
				}
				if len(filtered) > 0 {
					newOrder = append(newOrder, filtered)
				}
				continue
			}
			newOrder = append(newOrder, item)
		}

		if !found {
			return nil
		}

		patch := &model.BlockPatch{
			UpdatedFields: map[string]interface{}{
				"contentOrder": newOrder,
			},
		}

		if _, patchErr := a.PatchBlockAndNotify(block.ParentID, patch, modifiedByID, disableNotify); patchErr != nil {
			return patchErr
		}

		updatedCard, getErr := a.GetBlockByID(block.ParentID)
		if getErr != nil {
			return getErr
		}

		var updatedOrder []interface{}
		if updatedCard != nil {
			if raw, ok := updatedCard.Fields["contentOrder"]; ok && raw != nil {
				if co, ok := raw.([]interface{}); ok {
					updatedOrder = co
				}
			}
		}

		if !containsContentOrderID(updatedOrder, block.ID) {
			return nil
		}
	}

	return errors.New("failed to remove block ID from contentOrder after retries")
}

func (a *App) MoveContentBlock(block *model.Block, dstBlock *model.Block, where string, userID string) error {
	if block.ParentID != dstBlock.ParentID {
		message := fmt.Sprintf("not matching parent %s and %s", block.ParentID, dstBlock.ParentID)
		return model.NewErrBadRequest(message)
	}

	card, err := a.GetBlockByID(block.ParentID)
	if err != nil {
		return err
	}

	contentOrderData, ok := card.Fields["contentOrder"]
	var contentOrder []interface{}
	if ok {
		contentOrder = contentOrderData.([]interface{})
	}

	newContentOrder := []interface{}{}
	foundDst := false
	foundSrc := false
	for _, id := range contentOrder {
		stringID, ok := id.(string)
		if !ok {
			newContentOrder = append(newContentOrder, id)
			continue
		}

		if dstBlock.ID == stringID {
			foundDst = true
			if where == "after" {
				newContentOrder = append(newContentOrder, id)
				newContentOrder = append(newContentOrder, block.ID)
			} else {
				newContentOrder = append(newContentOrder, block.ID)
				newContentOrder = append(newContentOrder, id)
			}
			continue
		}

		if block.ID == stringID {
			foundSrc = true
			continue
		}

		newContentOrder = append(newContentOrder, id)
	}

	if !foundSrc {
		message := fmt.Sprintf("source block %s not found", block.ID)
		return model.NewErrBadRequest(message)
	}

	if !foundDst {
		message := fmt.Sprintf("destination block %s not found", dstBlock.ID)
		return model.NewErrBadRequest(message)
	}

	patch := &model.BlockPatch{
		UpdatedFields: map[string]interface{}{
			"contentOrder": newContentOrder,
		},
	}

	_, err = a.PatchBlock(block.ParentID, patch, userID)
	if errors.Is(err, model.ErrPatchUpdatesLimitedCards) {
		return err
	}
	if err != nil {
		return err
	}
	return nil
}
