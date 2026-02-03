// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package integrationtests

import (
	"testing"

	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/mattermost/mattermost-plugin-boards/server/utils"

	"github.com/stretchr/testify/require"
)

// TestRepairCardBlockOrder tests the automatic repair of card block orders.
func TestRepairCardBlockOrder(t *testing.T) {
	th := SetupTestHelperWithToken(t).Start()
	defer th.TearDown()

	board := th.CreateBoard("team-id", model.BoardTypeOpen)

	t.Run("repair card with orphaned block IDs", func(t *testing.T) {
		cardID := utils.NewID(utils.IDTypeBlock)
		contentBlockID1 := utils.NewID(utils.IDTypeBlock)
		contentBlockID2 := utils.NewID(utils.IDTypeBlock)
		ghostBlockID := utils.NewID(utils.IDTypeBlock)

		card := &model.Block{
			ID:       cardID,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeCard,
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{contentBlockID1, ghostBlockID, contentBlockID2},
			},
		}

		contentBlock1 := &model.Block{
			ID:       contentBlockID1,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}
		contentBlock2 := &model.Block{
			ID:       contentBlockID2,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}

		newBlocks, resp := th.Client.InsertBlocks(board.ID, []*model.Block{contentBlock1, contentBlock2, card}, false)
		require.NoError(t, resp.Error)
		require.Len(t, newBlocks, 3)

		// The real card ID after insertion
		realCardID := newBlocks[2].ID

		// Repair the card block order
		err := th.Server.App().RepairCardBlockOrder(realCardID, "user-id")
		require.NoError(t, err)

		// Verify the card has been repaired
		repairedCard, err := th.Server.App().GetBlockByID(realCardID)
		require.NoError(t, err)

		repairedOrder, ok := repairedCard.Fields["contentOrder"].([]interface{})
		require.True(t, ok)
		// Should only contain the two valid blocks, not the ghost
		require.Len(t, repairedOrder, 2)

		// Convert to string slice for comparison
		orderIDs := make([]string, len(repairedOrder))
		for i, item := range repairedOrder {
			if id, ok := item.(string); ok {
				orderIDs[i] = id
			}
		}

		// The ghost ID should not be in the order
		require.NotContains(t, orderIDs, ghostBlockID)
	})

	t.Run("repair card with missing blocks", func(t *testing.T) {
		cardID := utils.NewID(utils.IDTypeBlock)
		contentBlockID1 := utils.NewID(utils.IDTypeBlock)
		contentBlockID2 := utils.NewID(utils.IDTypeBlock)
		contentBlockID3 := utils.NewID(utils.IDTypeBlock)

		// Only add first two blocks to contentOrder, third is missing
		card := &model.Block{
			ID:       cardID,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeCard,
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{contentBlockID1, contentBlockID2},
			},
		}

		contentBlock1 := &model.Block{
			ID:       contentBlockID1,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}
		contentBlock2 := &model.Block{
			ID:       contentBlockID2,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}
		// Third block exists but is not in contentOrder
		contentBlock3 := &model.Block{
			ID:       contentBlockID3,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}

		newBlocks, resp := th.Client.InsertBlocks(board.ID, []*model.Block{contentBlock1, contentBlock2, contentBlock3, card}, false)
		require.NoError(t, resp.Error)
		require.Len(t, newBlocks, 4)

		realCardID := newBlocks[3].ID

		// Repair the card block order
		err := th.Server.App().RepairCardBlockOrder(realCardID, "user-id")
		require.NoError(t, err)

		// Verify the card has been repaired
		repairedCard, err := th.Server.App().GetBlockByID(realCardID)
		require.NoError(t, err)

		repairedOrder, ok := repairedCard.Fields["contentOrder"].([]interface{})
		require.True(t, ok)
		// Should contain all three blocks now
		require.Len(t, repairedOrder, 3)

		// The missing block should be appended at the end
		orderIDs := make([]string, len(repairedOrder))
		for i, item := range repairedOrder {
			if id, ok := item.(string); ok {
				orderIDs[i] = id
			}
		}

		// First two should maintain their order
		require.Equal(t, newBlocks[0].ID, orderIDs[0])
		require.Equal(t, newBlocks[1].ID, orderIDs[1])
		// Third should be the missing block
		require.Equal(t, newBlocks[2].ID, orderIDs[2])
	})

	t.Run("repair card with both orphaned and missing blocks", func(t *testing.T) {
		cardID := utils.NewID(utils.IDTypeBlock)
		contentBlockID1 := utils.NewID(utils.IDTypeBlock)
		contentBlockID2 := utils.NewID(utils.IDTypeBlock)
		ghostBlockID1 := utils.NewID(utils.IDTypeBlock)
		ghostBlockID2 := utils.NewID(utils.IDTypeBlock)

		// ContentOrder has ghost IDs and is missing actual blocks
		card := &model.Block{
			ID:       cardID,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeCard,
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{contentBlockID1, ghostBlockID1, contentBlockID2, ghostBlockID2},
			},
		}

		contentBlock1 := &model.Block{
			ID:       contentBlockID1,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}
		contentBlock2 := &model.Block{
			ID:       contentBlockID2,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}

		newBlocks, resp := th.Client.InsertBlocks(board.ID, []*model.Block{contentBlock1, contentBlock2, card}, false)
		require.NoError(t, resp.Error)
		require.Len(t, newBlocks, 3)

		realCardID := newBlocks[2].ID

		// Repair the card block order
		err := th.Server.App().RepairCardBlockOrder(realCardID, "user-id")
		require.NoError(t, err)

		// Verify the card has been repaired
		repairedCard, err := th.Server.App().GetBlockByID(realCardID)
		require.NoError(t, err)

		repairedOrder, ok := repairedCard.Fields["contentOrder"].([]interface{})
		require.True(t, ok)
		// Should only contain the two valid blocks
		require.Len(t, repairedOrder, 2)

		orderIDs := make([]string, len(repairedOrder))
		for i, item := range repairedOrder {
			if id, ok := item.(string); ok {
				orderIDs[i] = id
			}
		}

		require.NotContains(t, orderIDs, ghostBlockID1)
		require.NotContains(t, orderIDs, ghostBlockID2)
	})

	t.Run("repair card with grouped blocks", func(t *testing.T) {
		cardID := utils.NewID(utils.IDTypeBlock)
		contentBlockID1 := utils.NewID(utils.IDTypeBlock)
		contentBlockID2 := utils.NewID(utils.IDTypeBlock)
		contentBlockID3 := utils.NewID(utils.IDTypeBlock)
		ghostBlockID := utils.NewID(utils.IDTypeBlock)

		// ContentOrder with grouped blocks and a ghost in one group
		card := &model.Block{
			ID:       cardID,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeCard,
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{
					contentBlockID1,
					[]interface{}{contentBlockID2, ghostBlockID, contentBlockID3},
				},
			},
		}

		contentBlock1 := &model.Block{
			ID:       contentBlockID1,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}
		contentBlock2 := &model.Block{
			ID:       contentBlockID2,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}
		contentBlock3 := &model.Block{
			ID:       contentBlockID3,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}

		newBlocks, resp := th.Client.InsertBlocks(board.ID, []*model.Block{contentBlock1, contentBlock2, contentBlock3, card}, false)
		require.NoError(t, resp.Error)
		require.Len(t, newBlocks, 4)

		realCardID := newBlocks[3].ID

		// Repair the card block order
		err := th.Server.App().RepairCardBlockOrder(realCardID, "user-id")
		require.NoError(t, err)

		// Verify the card has been repaired
		repairedCard, err := th.Server.App().GetBlockByID(realCardID)
		require.NoError(t, err)

		repairedOrder, ok := repairedCard.Fields["contentOrder"].([]interface{})
		require.True(t, ok)
		// Should contain the single block and the group without the ghost
		require.Len(t, repairedOrder, 2)

		// First element should be the single block
		firstID, ok := repairedOrder[0].(string)
		require.True(t, ok)
		require.Equal(t, newBlocks[0].ID, firstID)

		// Second element should be the group without the ghost
		group, ok := repairedOrder[1].([]interface{})
		require.True(t, ok)
		require.Len(t, group, 2)
	})

	t.Run("repair card with empty contentOrder", func(t *testing.T) {
		cardID := utils.NewID(utils.IDTypeBlock)
		contentBlockID1 := utils.NewID(utils.IDTypeBlock)
		contentBlockID2 := utils.NewID(utils.IDTypeBlock)

		// Empty contentOrder but blocks exist
		card := &model.Block{
			ID:       cardID,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeCard,
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{},
			},
		}

		contentBlock1 := &model.Block{
			ID:       contentBlockID1,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}
		contentBlock2 := &model.Block{
			ID:       contentBlockID2,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}

		newBlocks, resp := th.Client.InsertBlocks(board.ID, []*model.Block{contentBlock1, contentBlock2, card}, false)
		require.NoError(t, resp.Error)
		require.Len(t, newBlocks, 3)

		realCardID := newBlocks[2].ID

		// Repair the card block order
		err := th.Server.App().RepairCardBlockOrder(realCardID, "user-id")
		require.NoError(t, err)

		// Verify the card has been repaired
		repairedCard, err := th.Server.App().GetBlockByID(realCardID)
		require.NoError(t, err)

		repairedOrder, ok := repairedCard.Fields["contentOrder"].([]interface{})
		require.True(t, ok)
		// Should contain all blocks now
		require.Len(t, repairedOrder, 2)
	})

	t.Run("repair card that is already valid", func(t *testing.T) {
		cardID := utils.NewID(utils.IDTypeBlock)
		contentBlockID1 := utils.NewID(utils.IDTypeBlock)
		contentBlockID2 := utils.NewID(utils.IDTypeBlock)

		// Valid contentOrder
		card := &model.Block{
			ID:       cardID,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeCard,
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{contentBlockID1, contentBlockID2},
			},
		}

		contentBlock1 := &model.Block{
			ID:       contentBlockID1,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}
		contentBlock2 := &model.Block{
			ID:       contentBlockID2,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeText,
			ParentID: cardID,
		}

		newBlocks, resp := th.Client.InsertBlocks(board.ID, []*model.Block{contentBlock1, contentBlock2, card}, false)
		require.NoError(t, resp.Error)
		require.Len(t, newBlocks, 3)

		realCardID := newBlocks[2].ID

		// Get the original updateAt
		originalCard, err := th.Server.App().GetBlockByID(realCardID)
		require.NoError(t, err)
		originalUpdateAt := originalCard.UpdateAt

		// Repair the card block order (should not change anything)
		err = th.Server.App().RepairCardBlockOrder(realCardID, "user-id")
		require.NoError(t, err)

		// Verify the card has not been modified
		repairedCard, err := th.Server.App().GetBlockByID(realCardID)
		require.NoError(t, err)

		// UpdateAt should not have changed
		require.Equal(t, originalUpdateAt, repairedCard.UpdateAt)

		repairedOrder, ok := repairedCard.Fields["contentOrder"].([]interface{})
		require.True(t, ok)
		require.Len(t, repairedOrder, 2)
	})

	t.Run("repair non-card block returns error", func(t *testing.T) {
		boardID := utils.NewID(utils.IDTypeBlock)

		// Create a board block, not a card
		boardBlock := &model.Block{
			ID:       boardID,
			BoardID:  board.ID,
			CreateAt: 1,
			UpdateAt: 1,
			Type:     model.TypeBoard,
		}

		newBlocks, resp := th.Client.InsertBlocks(board.ID, []*model.Block{boardBlock}, false)
		require.NoError(t, resp.Error)
		require.Len(t, newBlocks, 1)

		realBoardID := newBlocks[0].ID

		// Attempting to repair a non-card block should fail
		err := th.Server.App().RepairCardBlockOrder(realBoardID, "user-id")
		require.Error(t, err)
		require.Contains(t, err.Error(), "is not a card")
	})
}
