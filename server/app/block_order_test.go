// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"testing"

	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/stretchr/testify/assert"
)

func TestValidateContentOrder(t *testing.T) {
	t.Run("valid order with all blocks", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
		}
		contentOrder := []interface{}{"block1", "block2", "block3"}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.False(t, result.HasIssues)
		assert.Empty(t, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Equal(t, contentOrder, result.ValidOrder)
	})

	t.Run("orphaned IDs in contentOrder", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block3"},
		}
		contentOrder := []interface{}{"block1", "block2", "block3"}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Equal(t, []string{"block2"}, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Equal(t, []interface{}{"block1", "block3"}, result.ValidOrder)
	})

	t.Run("missing blocks not in contentOrder", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
		}
		contentOrder := []interface{}{"block1", "block3"}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Empty(t, result.OrphanedIDs)
		assert.Equal(t, []string{"block2"}, result.MissingIDs)
		assert.Equal(t, []interface{}{"block1", "block3"}, result.ValidOrder)
	})

	t.Run("mixed orphaned and missing blocks", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block4"},
		}
		contentOrder := []interface{}{"block1", "block3", "block2"}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Equal(t, []string{"block3"}, result.OrphanedIDs)
		assert.Equal(t, []string{"block4"}, result.MissingIDs)
		assert.Equal(t, []interface{}{"block1", "block2"}, result.ValidOrder)
	})

	t.Run("grouped blocks with partial orphaned", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block4"},
		}
		contentOrder := []interface{}{
			"block1",
			[]interface{}{"block2", "block3", "block4"},
		}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Equal(t, []string{"block3"}, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Equal(t, []interface{}{
			"block1",
			[]interface{}{"block2", "block4"},
		}, result.ValidOrder)
	})

	t.Run("null values in contentOrder", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
		}
		contentOrder := []interface{}{"block1", nil, "block2"}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.False(t, result.HasIssues)
		assert.Empty(t, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Equal(t, []interface{}{"block1", "block2"}, result.ValidOrder)
	})

	t.Run("empty contentOrder with existing blocks", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
		}
		contentOrder := []interface{}{}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Empty(t, result.OrphanedIDs)
		assert.Equal(t, []string{"block1", "block2"}, result.MissingIDs)
		assert.Empty(t, result.ValidOrder)
	})

	t.Run("nil contentOrder with existing blocks", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
		}
		var contentOrder []interface{} = nil

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Empty(t, result.OrphanedIDs)
		assert.Equal(t, []string{"block1", "block2"}, result.MissingIDs)
		assert.Empty(t, result.ValidOrder)
	})

	t.Run("empty blocks with non-empty contentOrder", func(t *testing.T) {
		blocks := []*model.Block{}
		contentOrder := []interface{}{"block1", "block2"}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Equal(t, []string{"block1", "block2"}, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Empty(t, result.ValidOrder)
	})

	t.Run("both empty contentOrder and empty blocks", func(t *testing.T) {
		blocks := []*model.Block{}
		contentOrder := []interface{}{}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.False(t, result.HasIssues)
		assert.Empty(t, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Empty(t, result.ValidOrder)
	})

	t.Run("nil contentOrder with empty blocks", func(t *testing.T) {
		blocks := []*model.Block{}
		var contentOrder []interface{} = nil

		result := ValidateContentOrder(contentOrder, blocks)
		assert.False(t, result.HasIssues)
		assert.Empty(t, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Empty(t, result.ValidOrder)
	})

	t.Run("grouped blocks with all orphaned", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
		}
		contentOrder := []interface{}{
			"block1",
			[]interface{}{"ghost-1", "ghost-2"},
		}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Equal(t, []string{"ghost-1", "ghost-2"}, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Equal(t, []interface{}{"block1"}, result.ValidOrder)
	})

	t.Run("multiple groups and mixed content", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
			{ID: "block4"},
		}
		contentOrder := []interface{}{
			"block1",
			[]interface{}{"block2", "ghost-1"},
			"block3",
			[]interface{}{"ghost-2", "block4"},
		}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.True(t, result.HasIssues)
		assert.Equal(t, []string{"ghost-1", "ghost-2"}, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Equal(t, []interface{}{
			"block1",
			[]interface{}{"block2"},
			"block3",
			[]interface{}{"block4"},
		}, result.ValidOrder)
	})

	t.Run("duplicate IDs in contentOrder", func(t *testing.T) {
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
		}
		contentOrder := []interface{}{"block1", "block2", "block1"}

		result := ValidateContentOrder(contentOrder, blocks)
		assert.False(t, result.HasIssues)
		assert.Empty(t, result.OrphanedIDs)
		assert.Empty(t, result.MissingIDs)
		assert.Equal(t, []interface{}{"block1", "block2", "block1"}, result.ValidOrder)
	})
}

func TestRepairContentOrder(t *testing.T) {
	t.Run("valid order remains unchanged", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{"block1", "block2", "block3"},
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{"block1", "block2", "block3"}, result)
	})

	t.Run("removes orphaned IDs", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{"block1", "block2", "ghost"},
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{"block1", "block2"}, result)
	})

	t.Run("appends missing blocks", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{"block1"},
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{"block1", "block2", "block3"}, result)
	})

	t.Run("handles both orphaned and missing", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{"block1", "ghost", "block2"},
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{"block1", "block2", "block3"}, result)
	})

	t.Run("handles grouped blocks", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{
					"block1",
					[]interface{}{"block2", "ghost", "block3"},
				},
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
			{ID: "block4"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{
			"block1",
			[]interface{}{"block2", "block3"},
			"block4",
		}, result)
	})

	t.Run("handles nil card fields", func(t *testing.T) {
		card := &model.Block{
			ID:     "card1",
			Fields: nil,
		}
		blocks := []*model.Block{
			{ID: "block1"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{}, result)
	})

	t.Run("handles nil contentOrder", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": nil,
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
		}

		result := RepairContentOrder(card, blocks)
		// When contentOrder is nil, it's treated as empty and all blocks are added
		assert.Equal(t, []interface{}{"block1", "block2"}, result)
	})

	t.Run("handles non-array contentOrder", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": "invalid",
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
		}

		result := RepairContentOrder(card, blocks)
		// When contentOrder is not an array, it's treated as empty and all blocks are added
		assert.Equal(t, []interface{}{"block1"}, result)
	})

	t.Run("nil card returns empty", func(t *testing.T) {
		var card *model.Block = nil
		blocks := []*model.Block{
			{ID: "block1"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{}, result)
	})

	t.Run("empty contentOrder with empty blocks", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{},
			},
		}
		blocks := []*model.Block{}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{}, result)
	})

	t.Run("grouped blocks with missing blocks", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{
					"block1",
					[]interface{}{"block2", "ghost"},
				},
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{
			"block1",
			[]interface{}{"block2"},
			"block3",
		}, result)
	})

	t.Run("complex scenario with multiple issues", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{
					"block1",
					"ghost-1",
					[]interface{}{"block2", "ghost-2", "block3"},
					"ghost-3",
				},
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
			{ID: "block4"},
			{ID: "block5"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{
			"block1",
			[]interface{}{"block2", "block3"},
			"block4",
			"block5",
		}, result)
	})

	t.Run("maintains order of valid blocks", func(t *testing.T) {
		card := &model.Block{
			ID: "card1",
			Fields: map[string]interface{}{
				"contentOrder": []interface{}{"block1", "block2", "block4"},
			},
		}
		blocks := []*model.Block{
			{ID: "block1"},
			{ID: "block2"},
			{ID: "block3"},
			{ID: "block4"},
		}

		result := RepairContentOrder(card, blocks)
		assert.Equal(t, []interface{}{"block1", "block2", "block4", "block3"}, result)
	})
}
