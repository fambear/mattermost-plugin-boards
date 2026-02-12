// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"reflect"
	"testing"

	"github.com/golang/mock/gomock"
	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/mattermost/mattermost-plugin-boards/server/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreateCardRelation(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	boardID := utils.NewID(utils.IDTypeBoard)
	sourceCardID := utils.NewID(utils.IDTypeBlock)
	targetCardID := utils.NewID(utils.IDTypeBlock)
	userID := utils.NewID(utils.IDTypeUser)

	sourceCardBlock := model.Card2Block(&model.Card{
		ID:      sourceCardID,
		BoardID: boardID,
	})

	targetCardBlock := model.Card2Block(&model.Card{
		ID:      targetCardID,
		BoardID: boardID,
		Code:    "IT-123",
	})

	relation := &model.CardRelation{
		SourceCardID: sourceCardID,
		TargetCardID: targetCardID,
		RelationType: model.RelationTypeBlocks,
		CreatedBy:    userID,
	}

	t.Run("success scenario - creates audit comment for human user", func(t *testing.T) {
		th.Store.EXPECT().CreateCardRelation(relation).Return(relation, nil)
		th.Store.EXPECT().GetBoardAndCardByID(sourceCardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, sourceCardBlock, nil)
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{ID: userID, IsBot: false}, nil)
		th.Store.EXPECT().GetBoardAndCardByID(targetCardID).Return(&model.Board{ID: boardID}, targetCardBlock, nil)
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(reflect.TypeOf(&model.Block{})), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		// GetMembersForBoard is called twice: once by wsAdapter.BroadcastCardRelationChange and once by InsertBlockAndNotify
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil).Times(2)

		createdRelation, err := th.App.CreateCardRelation(relation, boardID)

		require.NoError(t, err)
		assert.Equal(t, relation.SourceCardID, createdRelation.SourceCardID)
		assert.Equal(t, relation.TargetCardID, createdRelation.TargetCardID)
		assert.Equal(t, relation.RelationType, createdRelation.RelationType)
	})

	t.Run("success scenario - creates audit comment for bot user", func(t *testing.T) {
		th.Store.EXPECT().CreateCardRelation(relation).Return(relation, nil)
		th.Store.EXPECT().GetBoardAndCardByID(sourceCardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, sourceCardBlock, nil)
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{ID: userID, IsBot: true}, nil)
		th.Store.EXPECT().GetBoardAndCardByID(targetCardID).Return(&model.Board{ID: boardID}, targetCardBlock, nil)
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(reflect.TypeOf(&model.Block{})), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		// GetMembersForBoard is called twice: once by wsAdapter.BroadcastCardRelationChange and once by InsertBlockAndNotify
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil).Times(2)

		createdRelation, err := th.App.CreateCardRelation(relation, boardID)

		require.NoError(t, err)
		assert.Equal(t, relation.SourceCardID, createdRelation.SourceCardID)
	})

	t.Run("error scenario - fails to create relation", func(t *testing.T) {
		th.Store.EXPECT().CreateCardRelation(relation).Return(nil, model.NewErrNotFound("failed to create relation"))

		createdRelation, err := th.App.CreateCardRelation(relation, boardID)

		require.Error(t, err)
		assert.Nil(t, createdRelation)
	})

	t.Run("gracefully handles target card fetch failure", func(t *testing.T) {
		th.Store.EXPECT().CreateCardRelation(relation).Return(relation, nil)
		th.Store.EXPECT().GetBoardAndCardByID(sourceCardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, sourceCardBlock, nil)
		th.Store.EXPECT().GetBoardAndCardByID(targetCardID).Return(nil, nil, model.NewErrNotFound("card not found"))

		createdRelation, err := th.App.CreateCardRelation(relation, boardID)

		require.NoError(t, err)
		assert.Equal(t, relation.SourceCardID, createdRelation.SourceCardID)
	})
}

func TestDeleteCardRelation(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	boardID := utils.NewID(utils.IDTypeBoard)
	sourceCardID := utils.NewID(utils.IDTypeBlock)
	targetCardID := utils.NewID(utils.IDTypeBlock)
	userID := utils.NewID(utils.IDTypeUser)

	sourceCardBlock := model.Card2Block(&model.Card{
		ID:      sourceCardID,
		BoardID: boardID,
	})

	targetCardBlock := model.Card2Block(&model.Card{
		ID:      targetCardID,
		BoardID: boardID,
		Code:    "IT-456",
	})

	relation := &model.CardRelation{
		ID:           utils.NewID(utils.IDTypeBlock),
		SourceCardID: sourceCardID,
		TargetCardID: targetCardID,
		RelationType: model.RelationTypeBlocks,
		CreatedBy:    userID,
	}

	t.Run("success scenario - creates audit comment for human user", func(t *testing.T) {
		th.Store.EXPECT().GetCardRelation(relation.ID).Return(relation, nil)
		th.Store.EXPECT().DeleteCardRelation(relation.ID).Return(nil)
		th.Store.EXPECT().GetBoardAndCardByID(sourceCardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, sourceCardBlock, nil)
		th.Store.EXPECT().GetBoardAndCardByID(targetCardID).Return(&model.Board{ID: boardID}, targetCardBlock, nil)
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{ID: userID, IsBot: false}, nil)
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(reflect.TypeOf(&model.Block{})), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		// GetMembersForBoard is called twice: once by wsAdapter.BroadcastCardRelationDelete and once by InsertBlockAndNotify
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil).Times(2)

		err := th.App.DeleteCardRelation(relation.ID)

		require.NoError(t, err)
	})

	t.Run("success scenario - creates audit comment for bot user", func(t *testing.T) {
		th.Store.EXPECT().GetCardRelation(relation.ID).Return(relation, nil)
		th.Store.EXPECT().DeleteCardRelation(relation.ID).Return(nil)
		th.Store.EXPECT().GetBoardAndCardByID(sourceCardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, sourceCardBlock, nil)
		th.Store.EXPECT().GetBoardAndCardByID(targetCardID).Return(&model.Board{ID: boardID}, targetCardBlock, nil)
		th.Store.EXPECT().GetUserByID(userID).Return(&model.User{ID: userID, IsBot: true}, nil)
		th.Store.EXPECT().InsertBlock(gomock.AssignableToTypeOf(reflect.TypeOf(&model.Block{})), userID).Return(nil)
		// Mock GetBoard and GetMembersForBoard called by InsertBlockAndNotify
		th.Store.EXPECT().GetBoard(boardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, nil)
		// GetMembersForBoard is called twice: once by wsAdapter.BroadcastCardRelationDelete and once by InsertBlockAndNotify
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil).Times(2)

		err := th.App.DeleteCardRelation(relation.ID)

		require.NoError(t, err)
	})

	t.Run("error scenario - relation not found", func(t *testing.T) {
		th.Store.EXPECT().GetCardRelation(relation.ID).Return(nil, model.NewErrNotFound("relation not found"))

		err := th.App.DeleteCardRelation(relation.ID)

		require.Error(t, err)
	})

	t.Run("error scenario - fails to delete relation", func(t *testing.T) {
		th.Store.EXPECT().GetCardRelation(relation.ID).Return(relation, nil)
		th.Store.EXPECT().DeleteCardRelation(relation.ID).Return(model.NewErrNotFound("failed to delete"))

		err := th.App.DeleteCardRelation(relation.ID)

		require.Error(t, err)
	})

	t.Run("gracefully handles target card fetch failure", func(t *testing.T) {
		th.Store.EXPECT().GetCardRelation(relation.ID).Return(relation, nil)
		th.Store.EXPECT().DeleteCardRelation(relation.ID).Return(nil)
		th.Store.EXPECT().GetBoardAndCardByID(sourceCardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, sourceCardBlock, nil)
		th.Store.EXPECT().GetBoardAndCardByID(targetCardID).Return(nil, nil, model.NewErrNotFound("card not found"))

		err := th.App.DeleteCardRelation(relation.ID)

		require.NoError(t, err)
	})
}

func TestGetCardRelations(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	cardID := utils.NewID(utils.IDTypeBlock)

	t.Run("success scenario", func(t *testing.T) {
		relations := []*model.CardRelationWithCard{
			{CardRelation: model.CardRelation{ID: utils.NewID(utils.IDTypeBlock)}},
			{CardRelation: model.CardRelation{ID: utils.NewID(utils.IDTypeBlock)}},
		}

		th.Store.EXPECT().GetCardRelations(cardID).Return(relations, nil)

		result, err := th.App.GetCardRelations(cardID)

		require.NoError(t, err)
		assert.Len(t, result, 2)
	})

	t.Run("error scenario", func(t *testing.T) {
		th.Store.EXPECT().GetCardRelations(cardID).Return(nil, model.NewErrNotFound("failed to get relations"))

		result, err := th.App.GetCardRelations(cardID)

		require.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestGetCardRelation(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	relationID := utils.NewID(utils.IDTypeBlock)

	t.Run("success scenario", func(t *testing.T) {
		relation := &model.CardRelation{ID: relationID}

		th.Store.EXPECT().GetCardRelation(relationID).Return(relation, nil)

		result, err := th.App.GetCardRelation(relationID)

		require.NoError(t, err)
		assert.Equal(t, relationID, result.ID)
	})

	t.Run("error scenario", func(t *testing.T) {
		th.Store.EXPECT().GetCardRelation(relationID).Return(nil, model.NewErrNotFound("relation not found"))

		result, err := th.App.GetCardRelation(relationID)

		require.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestUpdateCardRelation(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	boardID := utils.NewID(utils.IDTypeBoard)
	sourceCardID := utils.NewID(utils.IDTypeBlock)

	sourceCardBlock := model.Card2Block(&model.Card{
		ID:      sourceCardID,
		BoardID: boardID,
	})

	relation := &model.CardRelation{
		ID:           utils.NewID(utils.IDTypeBlock),
		SourceCardID: sourceCardID,
		RelationType: model.RelationTypeBlocks,
	}

	t.Run("success scenario", func(t *testing.T) {
		th.Store.EXPECT().UpdateCardRelation(relation).Return(relation, nil)
		th.Store.EXPECT().GetBoardAndCardByID(sourceCardID).Return(&model.Board{ID: boardID, TeamID: "team1"}, sourceCardBlock, nil)
		// Mock GetMembersForBoard called by wsAdapter.BroadcastCardRelationChange
		th.Store.EXPECT().GetMembersForBoard(boardID).Return([]*model.BoardMember{}, nil)

		result, err := th.App.UpdateCardRelation(relation)

		require.NoError(t, err)
		assert.Equal(t, relation.ID, result.ID)
	})

	t.Run("error scenario", func(t *testing.T) {
		th.Store.EXPECT().UpdateCardRelation(relation).Return(nil, model.NewErrNotFound("failed to update"))

		result, err := th.App.UpdateCardRelation(relation)

		require.Error(t, err)
		assert.Nil(t, result)
	})
}

func TestDeleteCardRelationsByCard(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	cardID := utils.NewID(utils.IDTypeBlock)

	t.Run("success scenario", func(t *testing.T) {
		relations := []*model.CardRelationWithCard{
			{CardRelation: model.CardRelation{ID: utils.NewID(utils.IDTypeBlock)}},
			{CardRelation: model.CardRelation{ID: utils.NewID(utils.IDTypeBlock)}},
		}

		th.Store.EXPECT().GetCardRelations(cardID).Return(relations, nil)
		th.Store.EXPECT().DeleteCardRelation(relations[0].ID).Return(nil)
		th.Store.EXPECT().DeleteCardRelation(relations[1].ID).Return(nil)

		err := th.App.DeleteCardRelationsByCard(cardID)

		require.NoError(t, err)
	})

	t.Run("handles partial deletion failure", func(t *testing.T) {
		relations := []*model.CardRelationWithCard{
			{CardRelation: model.CardRelation{ID: utils.NewID(utils.IDTypeBlock)}},
			{CardRelation: model.CardRelation{ID: utils.NewID(utils.IDTypeBlock)}},
		}

		th.Store.EXPECT().GetCardRelations(cardID).Return(relations, nil)
		th.Store.EXPECT().DeleteCardRelation(relations[0].ID).Return(nil)
		th.Store.EXPECT().DeleteCardRelation(relations[1].ID).Return(model.NewErrNotFound("failed to delete"))

		err := th.App.DeleteCardRelationsByCard(cardID)

		// Should not error even if one deletion fails
		require.NoError(t, err)
	})

	t.Run("error scenario - fails to get relations", func(t *testing.T) {
		th.Store.EXPECT().GetCardRelations(cardID).Return(nil, model.NewErrNotFound("failed to get relations"))

		err := th.App.DeleteCardRelationsByCard(cardID)

		require.Error(t, err)
	})
}
