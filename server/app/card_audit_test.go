// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/golang/mock/gomock"
	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/mattermost/mattermost-plugin-boards/server/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestFormatPersonPropertyChange tests the person property change formatting.
func TestFormatPersonPropertyChange(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	userID1 := utils.NewID(utils.IDTypeUser)
	userID2 := utils.NewID(utils.IDTypeUser)
	username1 := "johndoe"
	username2 := "janedoe"

	t.Run("set person property (no old value)", func(t *testing.T) {
		th.Store.EXPECT().GetUserByID(userID1).Return(&model.User{
			ID:       userID1,
			Username: username1,
		}, nil)

		changes := th.App.formatPersonPropertyChange("Assignee", nil, userID1, false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Assignee", changes[0].PropertyName)
		assert.Equal(t, "@"+username1, changes[0].NewValue)
		assert.Empty(t, changes[0].OldValue)
	})

	t.Run("change person property", func(t *testing.T) {
		th.Store.EXPECT().GetUserByID(userID1).Return(&model.User{
			ID:       userID1,
			Username: username1,
		}, nil)
		th.Store.EXPECT().GetUserByID(userID2).Return(&model.User{
			ID:       userID2,
			Username: username2,
		}, nil)

		changes := th.App.formatPersonPropertyChange("Assignee", userID1, userID2, true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Assignee", changes[0].PropertyName)
		assert.Equal(t, "@"+username2, changes[0].NewValue)
		assert.Equal(t, "@"+username1, changes[0].OldValue)
	})

	t.Run("clear person property", func(t *testing.T) {
		th.Store.EXPECT().GetUserByID(userID1).Return(&model.User{
			ID:       userID1,
			Username: username1,
		}, nil)

		changes := th.App.formatPersonPropertyChange("Assignee", userID1, "", true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Assignee", changes[0].PropertyName)
		assert.Empty(t, changes[0].NewValue)
		assert.Equal(t, "@"+username1, changes[0].OldValue)
	})

	t.Run("no change - same person", func(t *testing.T) {
		th.Store.EXPECT().GetUserByID(userID1).Return(&model.User{
			ID:       userID1,
			Username: username1,
		}, nil).Times(2)

		changes := th.App.formatPersonPropertyChange("Assignee", userID1, userID1, true)

		assert.Nil(t, changes)
	})

	t.Run("user not found - uses userID", func(t *testing.T) {
		th.Store.EXPECT().GetUserByID(userID1).Return(nil, model.NewErrNotFound(userID1))

		changes := th.App.formatPersonPropertyChange("Assignee", nil, userID1, false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Assignee", changes[0].PropertyName)
		assert.Equal(t, userID1, changes[0].NewValue)
	})
}

// TestFormatSelectPropertyChange tests the select property change formatting.
func TestFormatSelectPropertyChange(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	option1ID := utils.NewID(utils.IDTypeBlock)
	option2ID := utils.NewID(utils.IDTypeBlock)

	propDef := map[string]interface{}{
		"id":   utils.NewID(utils.IDTypeBlock),
		"name": "Status",
		"type": "select",
		"options": []interface{}{
			map[string]interface{}{
				"id":    option1ID,
				"value": "To Do",
				"color": "propColorDefault",
			},
			map[string]interface{}{
				"id":    option2ID,
				"value": "In Progress",
				"color": "propColorBlue",
			},
		},
	}

	t.Run("set select property (no old value)", func(t *testing.T) {
		changes := th.App.formatSelectPropertyChange("Status", propDef, nil, option1ID, false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Status", changes[0].PropertyName)
		assert.Equal(t, "To Do", changes[0].NewValue)
		assert.Empty(t, changes[0].OldValue)
	})

	t.Run("change select property", func(t *testing.T) {
		changes := th.App.formatSelectPropertyChange("Status", propDef, option1ID, option2ID, true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Status", changes[0].PropertyName)
		assert.Equal(t, "In Progress", changes[0].NewValue)
		assert.Equal(t, "To Do", changes[0].OldValue)
	})

	t.Run("clear select property", func(t *testing.T) {
		changes := th.App.formatSelectPropertyChange("Status", propDef, option1ID, "", true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Status", changes[0].PropertyName)
		assert.Empty(t, changes[0].NewValue)
		assert.Equal(t, "To Do", changes[0].OldValue)
	})

	t.Run("no change - same option", func(t *testing.T) {
		changes := th.App.formatSelectPropertyChange("Status", propDef, option1ID, option1ID, true)
		assert.Nil(t, changes)
	})

	t.Run("option not found - uses ID", func(t *testing.T) {
		unknownID := utils.NewID(utils.IDTypeBlock)
		changes := th.App.formatSelectPropertyChange("Status", propDef, nil, unknownID, false)

		require.Len(t, changes, 1)
		assert.Equal(t, unknownID, changes[0].NewValue)
	})
}

// TestFormatMultiSelectPropertyChange tests the multi-select property change formatting.
func TestFormatMultiSelectPropertyChange(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	option1ID := utils.NewID(utils.IDTypeBlock)
	option2ID := utils.NewID(utils.IDTypeBlock)
	option3ID := utils.NewID(utils.IDTypeBlock)

	propDef := map[string]interface{}{
		"id":   utils.NewID(utils.IDTypeBlock),
		"name": "Tags",
		"type": "multiSelect",
		"options": []interface{}{
			map[string]interface{}{
				"id":    option1ID,
				"value": "Bug",
				"color": "propColorRed",
			},
			map[string]interface{}{
				"id":    option2ID,
				"value": "Feature",
				"color": "propColorBlue",
			},
			map[string]interface{}{
				"id":    option3ID,
				"value": "Enhancement",
				"color": "propColorGreen",
			},
		},
	}

	t.Run("add option", func(t *testing.T) {
		oldValue := []interface{}{option1ID}
		newValue := []interface{}{option1ID, option2ID}

		changes := th.App.formatMultiSelectPropertyChange("Tags", propDef, oldValue, newValue)

		require.Len(t, changes, 1)
		assert.Equal(t, "Tags", changes[0].PropertyName)
		assert.Equal(t, "Feature", changes[0].NewValue)
		assert.Empty(t, changes[0].OldValue)
	})

	t.Run("remove option", func(t *testing.T) {
		oldValue := []interface{}{option1ID, option2ID}
		newValue := []interface{}{option1ID}

		changes := th.App.formatMultiSelectPropertyChange("Tags", propDef, oldValue, newValue)

		require.Len(t, changes, 1)
		assert.Equal(t, "Tags", changes[0].PropertyName)
		assert.Empty(t, changes[0].NewValue)
		assert.Equal(t, "Feature", changes[0].OldValue)
	})

	t.Run("multiple changes", func(t *testing.T) {
		oldValue := []interface{}{option1ID, option2ID}
		newValue := []interface{}{option2ID, option3ID}

		changes := th.App.formatMultiSelectPropertyChange("Tags", propDef, oldValue, newValue)

		require.Len(t, changes, 2)
		// Check that Bug was removed and Enhancement was added
		hasRemovedBug := false
		hasAddedEnhancement := false
		for _, change := range changes {
			if change.OldValue == "Bug" {
				hasRemovedBug = true
			}
			if change.NewValue == "Enhancement" {
				hasAddedEnhancement = true
			}
		}
		assert.True(t, hasRemovedBug, "Should have removed Bug tag")
		assert.True(t, hasAddedEnhancement, "Should have added Enhancement tag")
	})

	t.Run("no changes", func(t *testing.T) {
		oldValue := []interface{}{option1ID, option2ID}
		newValue := []interface{}{option1ID, option2ID}

		changes := th.App.formatMultiSelectPropertyChange("Tags", propDef, oldValue, newValue)

		assert.Nil(t, changes)
	})
}

// TestFormatDatePropertyChange tests the date/dateTime property change formatting.
func TestFormatDatePropertyChange(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	t.Run("date property - set value", func(t *testing.T) {
		now := time.Now()
		dateJSON, _ := json.Marshal(map[string]int64{"from": now.UnixMilli()})

		changes := th.App.formatDatePropertyChange("Due Date", nil, string(dateJSON), false, false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Due Date", changes[0].PropertyName)
		assert.Equal(t, now.Format("02.01.2006"), changes[0].NewValue)
	})

	t.Run("dateTime property - set value", func(t *testing.T) {
		now := time.Now()
		dateJSON, _ := json.Marshal(map[string]int64{"from": now.UnixMilli()})

		changes := th.App.formatDatePropertyChange("Due Date", nil, string(dateJSON), false, true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Due Date", changes[0].PropertyName)
		assert.Contains(t, changes[0].NewValue, now.Format("02.01.2006"))
		assert.Contains(t, changes[0].NewValue, ":")
	})

	t.Run("change date", func(t *testing.T) {
		date1 := time.Now().Add(-24 * time.Hour)
		date2 := time.Now()
		date1JSON, _ := json.Marshal(map[string]int64{"from": date1.UnixMilli()})
		date2JSON, _ := json.Marshal(map[string]int64{"from": date2.UnixMilli()})

		changes := th.App.formatDatePropertyChange("Due Date", string(date1JSON), string(date2JSON), true, false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Due Date", changes[0].PropertyName)
		assert.Equal(t, date1.Format("02.01.2006"), changes[0].OldValue)
		assert.Equal(t, date2.Format("02.01.2006"), changes[0].NewValue)
	})

	t.Run("clear date", func(t *testing.T) {
		now := time.Now()
		dateJSON, _ := json.Marshal(map[string]int64{"from": now.UnixMilli()})

		changes := th.App.formatDatePropertyChange("Due Date", string(dateJSON), "", true, false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Due Date", changes[0].PropertyName)
		assert.Empty(t, changes[0].NewValue)
		assert.Equal(t, now.Format("02.01.2006"), changes[0].OldValue)
	})

	t.Run("invalid date format", func(t *testing.T) {
		changes := th.App.formatDatePropertyChange("Due Date", nil, "invalid", false, false)
		assert.Nil(t, changes)
	})
}

// TestFormatCheckboxPropertyChange tests the checkbox property change formatting.
func TestFormatCheckboxPropertyChange(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	t.Run("set checkbox to true", func(t *testing.T) {
		changes := th.App.formatCheckboxPropertyChange("Verified", nil, true, false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Verified", changes[0].PropertyName)
		assert.Equal(t, "Yes", changes[0].NewValue)
		assert.Empty(t, changes[0].OldValue)
	})

	t.Run("set checkbox to false", func(t *testing.T) {
		changes := th.App.formatCheckboxPropertyChange("Verified", nil, false, false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Verified", changes[0].PropertyName)
		assert.Equal(t, "No", changes[0].NewValue)
		assert.Empty(t, changes[0].OldValue)
	})

	t.Run("change checkbox", func(t *testing.T) {
		changes := th.App.formatCheckboxPropertyChange("Verified", false, true, true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Verified", changes[0].PropertyName)
		assert.Equal(t, "No", changes[0].OldValue)
		assert.Equal(t, "Yes", changes[0].NewValue)
	})

	t.Run("clear checkbox", func(t *testing.T) {
		changes := th.App.formatCheckboxPropertyChange("Verified", true, nil, true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Verified", changes[0].PropertyName)
		assert.Empty(t, changes[0].NewValue)
		assert.Equal(t, "Yes", changes[0].OldValue)
	})
}

// TestFormatTextPropertyChange tests the text property change formatting.
func TestFormatTextPropertyChange(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	t.Run("set text property", func(t *testing.T) {
		changes := th.App.formatTextPropertyChange("Description", nil, "New description", false)

		require.Len(t, changes, 1)
		assert.Equal(t, "Description", changes[0].PropertyName)
		assert.Equal(t, "New description", changes[0].NewValue)
		assert.Empty(t, changes[0].OldValue)
	})

	t.Run("change text property", func(t *testing.T) {
		changes := th.App.formatTextPropertyChange("Description", "Old description", "New description", true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Description", changes[0].PropertyName)
		assert.Equal(t, "New description", changes[0].NewValue)
		assert.Equal(t, "Old description", changes[0].OldValue)
	})

	t.Run("clear text property", func(t *testing.T) {
		changes := th.App.formatTextPropertyChange("Description", "Old description", "", true)

		require.Len(t, changes, 1)
		assert.Equal(t, "Description", changes[0].PropertyName)
		assert.Empty(t, changes[0].NewValue)
		assert.Equal(t, "Old description", changes[0].OldValue)
	})

	t.Run("trim whitespace", func(t *testing.T) {
		changes := th.App.formatTextPropertyChange("Description", nil, "  New description  ", false)

		require.Len(t, changes, 1)
		assert.Equal(t, "New description", changes[0].NewValue)
	})

	t.Run("no change - same text", func(t *testing.T) {
		changes := th.App.formatTextPropertyChange("Description", "Same description", "Same description", true)
		assert.Nil(t, changes)
	})
}

// TestFormatChangesToText tests the formatting of changes to comment text.
func TestFormatChangesToText(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	t.Run("single change - from old to new", func(t *testing.T) {
		changes := []propertyChange{
			{PropertyName: "Status", OldValue: "To Do", NewValue: "In Progress"},
		}

		text := th.App.formatChangesToText(changes)
		assert.Equal(t, "Status changed from To Do to In Progress", text)
	})

	t.Run("single change - set value", func(t *testing.T) {
		changes := []propertyChange{
			{PropertyName: "Assignee", NewValue: "@johndoe"},
		}

		text := th.App.formatChangesToText(changes)
		assert.Equal(t, "Assignee: added @johndoe", text)
	})

	t.Run("single change - cleared value", func(t *testing.T) {
		changes := []propertyChange{
			{PropertyName: "Assignee", OldValue: "@johndoe"},
		}

		text := th.App.formatChangesToText(changes)
		assert.Equal(t, "Assignee: removed @johndoe", text)
	})

	t.Run("multiple changes", func(t *testing.T) {
		changes := []propertyChange{
			{PropertyName: "Status", OldValue: "To Do", NewValue: "In Progress"},
			{PropertyName: "Assignee", NewValue: "@johndoe"},
			{PropertyName: "Priority", OldValue: "High", NewValue: "Low"},
		}

		text := th.App.formatChangesToText(changes)
		lines := splitLines(text)
		assert.Len(t, lines, 3)
		assert.Contains(t, text, "Status changed from To Do to In Progress")
		assert.Contains(t, text, "Assignee: added @johndoe")
		assert.Contains(t, text, "Priority changed from High to Low")
	})
}

// TestCreateNewAuditComment tests creating a new audit comment.
func TestCreateNewAuditComment(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	boardID := utils.NewID(utils.IDTypeBoard)
	cardID := utils.NewID(utils.IDTypeBlock)
	userID := utils.NewID(utils.IDTypeUser)

	changes := []propertyChange{
		{PropertyName: "Status", OldValue: "To Do", NewValue: "In Progress"},
	}

	t.Run("create edits comment for human user", func(t *testing.T) {
		// Mock block insertion
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(&model.Block{}), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		err := th.App.createNewAuditComment(cardID, boardID, userID, commentTypeEdits, changes)
		require.NoError(t, err)
	})

	t.Run("create bot comment for bot user", func(t *testing.T) {
		// Mock block insertion
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(&model.Block{}), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		err := th.App.createNewAuditComment(cardID, boardID, userID, commentTypeBot, changes)
		require.NoError(t, err)
	})
}

// TestGetLastAuditComment tests retrieving the last audit comment.
func TestGetLastAuditComment(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	boardID := utils.NewID(utils.IDTypeBoard)
	cardID := utils.NewID(utils.IDTypeBlock)

	t.Run("find recent edits comment", func(t *testing.T) {
		comment := &model.Block{
			ID:       utils.NewID(utils.IDTypeBlock),
			ParentID: cardID,
			BoardID:  boardID,
			Type:     model.TypeComment,
			CreateAt: utils.GetMillis() - 30000, // 30 seconds ago
			Fields: map[string]interface{}{
				"commentType": "edits",
			},
		}

		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{comment}, nil)

		lastComment, err := th.App.getLastAuditComment(cardID, commentTypeEdits)
		require.NoError(t, err)
		assert.Equal(t, comment.ID, lastComment.ID)
	})

	t.Run("no comments found", func(t *testing.T) {
		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{}, nil)

		lastComment, err := th.App.getLastAuditComment(cardID, commentTypeEdits)
		require.NoError(t, err)
		assert.Nil(t, lastComment)
	})

	t.Run("comments exist but none with matching type", func(t *testing.T) {
		comment := &model.Block{
			ID:       utils.NewID(utils.IDTypeBlock),
			ParentID: cardID,
			BoardID:  boardID,
			Type:     model.TypeComment,
			CreateAt: utils.GetMillis() - 30000,
			Fields: map[string]interface{}{
				"commentType": "comment",
			},
		}

		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{comment}, nil)

		lastComment, err := th.App.getLastAuditComment(cardID, commentTypeEdits)
		require.NoError(t, err)
		assert.Nil(t, lastComment)
	})

	t.Run("returns most recent comment", func(t *testing.T) {
		now := utils.GetMillis()
		comment1 := &model.Block{
			ID:       utils.NewID(utils.IDTypeBlock),
			ParentID: cardID,
			BoardID:  boardID,
			Type:     model.TypeComment,
			CreateAt: now - 60000, // 1 minute ago
			Fields:   map[string]interface{}{"commentType": "edits"},
		}
		comment2 := &model.Block{
			ID:       utils.NewID(utils.IDTypeBlock),
			ParentID: cardID,
			BoardID:  boardID,
			Type:     model.TypeComment,
			CreateAt: now - 30000, // 30 seconds ago - more recent
			Fields:   map[string]interface{}{"commentType": "edits"},
		}

		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{comment1, comment2}, nil)

		lastComment, err := th.App.getLastAuditComment(cardID, commentTypeEdits)
		require.NoError(t, err)
		assert.Equal(t, comment2.ID, lastComment.ID)
	})

	t.Run("handles comment without fields", func(t *testing.T) {
		comment := &model.Block{
			ID:       utils.NewID(utils.IDTypeBlock),
			ParentID: cardID,
			BoardID:  boardID,
			Type:     model.TypeComment,
			CreateAt: utils.GetMillis() - 30000,
			Fields:   nil,
		}

		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{comment}, nil)

		lastComment, err := th.App.getLastAuditComment(cardID, commentTypeEdits)
		require.NoError(t, err)
		assert.Nil(t, lastComment)
	})
}

// TestCreateOrUpdateAuditComment tests comment aggregation logic.
func TestCreateOrUpdateAuditComment(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	boardID := utils.NewID(utils.IDTypeBoard)
	cardID := utils.NewID(utils.IDTypeBlock)
	userID := utils.NewID(utils.IDTypeUser)

	changes := []propertyChange{
		{PropertyName: "Status", OldValue: "To Do", NewValue: "In Progress"},
	}

	t.Run("creates new comment when no recent comment exists", func(t *testing.T) {
		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{}, nil)
		th.Store.EXPECT().InsertBlock(gomock.Any(), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		err := th.App.createOrUpdateAuditComment(cardID, boardID, userID, commentTypeEdits, changes)
		require.NoError(t, err)
	})

	t.Run("creates new comment when recent comment is outside aggregation window", func(t *testing.T) {
		oldComment := &model.Block{
			ID:         utils.NewID(utils.IDTypeBlock),
			ParentID:   cardID,
			BoardID:    boardID,
			Type:       model.TypeComment,
			CreateAt:   utils.GetMillis() - aggregationWindowMs - 1000, // outside window
			ModifiedBy: userID,
			Fields:     map[string]interface{}{"commentType": "edits"},
		}

		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{oldComment}, nil)
		th.Store.EXPECT().InsertBlock(gomock.Any(), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		err := th.App.createOrUpdateAuditComment(cardID, boardID, userID, commentTypeEdits, changes)
		require.NoError(t, err)
	})

	t.Run("appends to existing comment within aggregation window", func(t *testing.T) {
		oldComment := &model.Block{
			ID:         utils.NewID(utils.IDTypeBlock),
			ParentID:   cardID,
			BoardID:    boardID,
			Type:       model.TypeComment,
			Title:      "Status changed from To Do to In Progress",
			CreateAt:   utils.GetMillis() - 30000, // within window
			ModifiedBy: userID,
			Fields:     map[string]interface{}{"commentType": "edits"},
		}

		updatedComment := &model.Block{
			ID:         oldComment.ID,
			ParentID:   cardID,
			BoardID:    boardID,
			Type:       model.TypeComment,
			Title:      "Status changed from To Do to In Progress\nStatus changed from To Do to In Progress",
			CreateAt:   oldComment.CreateAt,
			ModifiedBy: userID,
			Fields:     map[string]interface{}{"commentType": "edits"},
		}

		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{oldComment}, nil)
		// Mock PatchBlockAndNotify calls
		th.Store.EXPECT().GetBlock(oldComment.ID).Return(oldComment, nil)
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().PatchBlock(oldComment.ID, gomock.Any(), userID).Return(nil)
		th.Store.EXPECT().GetBlock(oldComment.ID).Return(updatedComment, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		err := th.App.createOrUpdateAuditComment(cardID, boardID, userID, commentTypeEdits, changes)
		require.NoError(t, err)
	})
}

// TestDetectAndLogPropertyChanges tests the main property change detection function.
func TestDetectAndLogPropertyChanges(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	boardID := utils.NewID(utils.IDTypeBoard)
	cardID := utils.NewID(utils.IDTypeBlock)
	userID := utils.NewID(utils.IDTypeUser)

	statusPropID := utils.NewID(utils.IDTypeBlock)
	statusOption1 := utils.NewID(utils.IDTypeBlock)
	statusOption2 := utils.NewID(utils.IDTypeBlock)

	board := &model.Board{
		ID: boardID,
		CardProperties: []map[string]interface{}{
			{
				"id":   statusPropID,
				"name": "Status",
				"type": "select",
				"options": []interface{}{
					map[string]interface{}{
						"id":    statusOption1,
						"value": "To Do",
						"color": "propColorDefault",
					},
					map[string]interface{}{
						"id":    statusOption2,
						"value": "In Progress",
						"color": "propColorBlue",
					},
				},
			},
		},
	}

	t.Run("creates comment for human user property change", func(t *testing.T) {
		currentCard := &model.Card{
			ID:         cardID,
			BoardID:    boardID,
			Properties: map[string]interface{}{statusPropID: statusOption1},
		}

		cardPatch := &model.CardPatch{
			UpdatedProperties: map[string]interface{}{statusPropID: statusOption2},
		}

		// Mock user as not a bot
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{
			ID:    userID,
			IsBot: false,
		}, nil)

		// Mock comment retrieval - no recent comment
		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{}, nil)

		// Mock block insertion
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(&model.Block{}), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		th.App.detectAndLogPropertyChanges(currentCard, cardPatch, board, cardID, userID)
	})

	t.Run("creates bot comment for bot user property change", func(t *testing.T) {
		currentCard := &model.Card{
			ID:         cardID,
			BoardID:    boardID,
			Properties: map[string]interface{}{statusPropID: statusOption1},
		}

		cardPatch := &model.CardPatch{
			UpdatedProperties: map[string]interface{}{statusPropID: statusOption2},
		}

		// Mock user as a bot
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{
			ID:    userID,
			IsBot: true,
		}, nil)

		// Mock comment retrieval - no recent comment
		th.Store.EXPECT().GetBlocksWithParentAndType("", cardID, model.TypeComment).Return([]*model.Block{}, nil)

		// Mock block insertion
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(&model.Block{}), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		th.App.detectAndLogPropertyChanges(currentCard, cardPatch, board, cardID, userID)
	})

	t.Run("does not create comment when no properties changed", func(t *testing.T) {
		currentCard := &model.Card{
			ID:         cardID,
			BoardID:    boardID,
			Properties: map[string]interface{}{statusPropID: statusOption1},
		}

		cardPatch := &model.CardPatch{
			UpdatedProperties: map[string]interface{}{}, // No changes
		}

		// Should not call any comment-related methods
		th.App.detectAndLogPropertyChanges(currentCard, cardPatch, board, cardID, userID)
	})

	t.Run("handles unknown property gracefully", func(t *testing.T) {
		unknownPropID := utils.NewID(utils.IDTypeBlock)

		currentCard := &model.Card{
			ID:         cardID,
			BoardID:    boardID,
			Properties: map[string]interface{}{},
		}

		cardPatch := &model.CardPatch{
			UpdatedProperties: map[string]interface{}{
				unknownPropID: "some value", // Property not in board definition
			},
		}

		// Should not create comment for unknown property
		th.App.detectAndLogPropertyChanges(currentCard, cardPatch, board, cardID, userID)
	})
}

// TestLogCardRelationChange tests the card relation audit logging.
func TestLogCardRelationChange(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	boardID := utils.NewID(utils.IDTypeBoard)
	cardID := utils.NewID(utils.IDTypeBlock)
	userID := utils.NewID(utils.IDTypeUser)

	relatedCard := &model.Card{
		ID:      utils.NewID(utils.IDTypeBlock),
		BoardID: boardID,
		Code:    "IT-123",
	}

	t.Run("log relation added by human user", func(t *testing.T) {
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{
			ID:    userID,
			IsBot: false,
		}, nil)
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(&model.Block{}), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		th.App.logCardRelationChange(cardID, boardID, userID, "blocks", relatedCard, false)
	})

	t.Run("log relation added by bot user", func(t *testing.T) {
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{
			ID:    userID,
			IsBot: true,
		}, nil)
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(&model.Block{}), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		th.App.logCardRelationChange(cardID, boardID, userID, "blocks", relatedCard, false)
	})

	t.Run("log relation removed by human user", func(t *testing.T) {
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{
			ID:    userID,
			IsBot: false,
		}, nil)
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(&model.Block{}), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		th.App.logCardRelationChange(cardID, boardID, userID, "blocks", relatedCard, true)
	})

	t.Run("uses card ID when code is empty", func(t *testing.T) {
		relatedCardWithoutCode := &model.Card{
			ID:      utils.NewID(utils.IDTypeBlock),
			BoardID: boardID,
			Code:    "", // Empty code
		}

		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{
			ID:    userID,
			IsBot: false,
		}, nil)
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(&model.Block{}), userID).Return(nil).Do(func(block *model.Block, _ string) {
			// Verify the title contains the card ID
			assert.Contains(t, block.Title, relatedCardWithoutCode.ID)
		})
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		th.App.logCardRelationChange(cardID, boardID, userID, "blocks", relatedCardWithoutCode, false)
	})

	t.Run("does not log when related card is nil", func(t *testing.T) {
		// Should not call any methods
		th.App.logCardRelationChange(cardID, boardID, userID, "blocks", nil, false)
	})
}

// Helper function to split lines for testing
func splitLines(s string) []string {
	lines := []string{}
	current := ""
	for _, ch := range s {
		if ch == '\n' {
			lines = append(lines, current)
			current = ""
		} else {
			current += string(ch)
		}
	}
	if current != "" {
		lines = append(lines, current)
	}
	return lines
}
