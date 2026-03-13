// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"fmt"

	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
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
func (a *App) appendToContentOrderIfNeeded(block *model.Block, modifiedByID string) {
	if block.ParentID == "" || block.ParentID == block.ID {
		return
	}

	if !isContentBlock(block.Type) {
		return
	}

	card, err := a.GetBlockByID(block.ParentID)
	if err != nil || card == nil || card.Type != model.TypeCard {
		return
	}

	// Get current contentOrder
	var contentOrder []interface{}
	if raw, ok := card.Fields["contentOrder"]; ok && raw != nil {
		if co, ok := raw.([]interface{}); ok {
			contentOrder = co
		}
	}

	// Check if block is already in contentOrder
	for _, item := range contentOrder {
		if id, ok := item.(string); ok && id == block.ID {
			return // already present
		}
	}

	// Append the new block ID
	contentOrder = append(contentOrder, block.ID)

	patch := &model.BlockPatch{
		UpdatedFields: map[string]interface{}{
			"contentOrder": contentOrder,
		},
	}

	if _, patchErr := a.PatchBlock(block.ParentID, patch, modifiedByID); patchErr != nil {
		a.logger.Warn(
			"Failed to auto-update contentOrder for parent card",
			mlog.String("block_id", block.ID),
			mlog.String("parent_id", block.ParentID),
			mlog.Err(patchErr),
		)
	}
}

// removeFromContentOrderIfNeeded removes a deleted content block from the
// parent card's contentOrder field.
func (a *App) removeFromContentOrderIfNeeded(block *model.Block, modifiedByID string) {
	if block.ParentID == "" || block.ParentID == block.ID {
		return
	}

	if !isContentBlock(block.Type) {
		return
	}

	card, err := a.GetBlockByID(block.ParentID)
	if err != nil || card == nil || card.Type != model.TypeCard {
		return
	}

	var contentOrder []interface{}
	if raw, ok := card.Fields["contentOrder"]; ok && raw != nil {
		if co, ok := raw.([]interface{}); ok {
			contentOrder = co
		}
	}

	if len(contentOrder) == 0 {
		return
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
		return
	}

	patch := &model.BlockPatch{
		UpdatedFields: map[string]interface{}{
			"contentOrder": newOrder,
		},
	}

	if _, patchErr := a.PatchBlock(block.ParentID, patch, modifiedByID); patchErr != nil {
		a.logger.Warn(
			"Failed to auto-update contentOrder after block deletion",
			mlog.String("block_id", block.ID),
			mlog.String("parent_id", block.ParentID),
			mlog.Err(patchErr),
		)
	}
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
