// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost-plugin-boards/server/utils"
)

func TestBlockTypeFromString(t *testing.T) {
	t.Run("should return TypeBoard for 'board'", func(t *testing.T) {
		bt, err := BlockTypeFromString("board")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeBoard), bt)
	})

	t.Run("should return TypeCard for 'card'", func(t *testing.T) {
		bt, err := BlockTypeFromString("card")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeCard), bt)
	})

	t.Run("should return TypeView for 'view'", func(t *testing.T) {
		bt, err := BlockTypeFromString("view")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeView), bt)
	})

	t.Run("should return TypeText for 'text'", func(t *testing.T) {
		bt, err := BlockTypeFromString("text")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeText), bt)
	})

	t.Run("should return TypeCheckbox for 'checkbox'", func(t *testing.T) {
		bt, err := BlockTypeFromString("checkbox")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeCheckbox), bt)
	})

	t.Run("should return TypeComment for 'comment'", func(t *testing.T) {
		bt, err := BlockTypeFromString("comment")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeComment), bt)
	})

	t.Run("should return TypeImage for 'image'", func(t *testing.T) {
		bt, err := BlockTypeFromString("image")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeImage), bt)
	})

	t.Run("should return TypeAttachment for 'attachment'", func(t *testing.T) {
		bt, err := BlockTypeFromString("attachment")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeAttachment), bt)
	})

	t.Run("should return TypeDivider for 'divider'", func(t *testing.T) {
		bt, err := BlockTypeFromString("divider")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeDivider), bt)
	})

	t.Run("should return TypeVideo for 'video'", func(t *testing.T) {
		bt, err := BlockTypeFromString("video")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeVideo), bt)
	})

	t.Run("should return TypeFilePDF for 'file-pdf'", func(t *testing.T) {
		bt, err := BlockTypeFromString("file-pdf")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeFilePDF), bt)
	})

	t.Run("should return TypeFileGeneric for 'file-generic'", func(t *testing.T) {
		bt, err := BlockTypeFromString("file-generic")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeFileGeneric), bt)
	})

	t.Run("should return error for unknown type", func(t *testing.T) {
		bt, err := BlockTypeFromString("unknown-type")
		require.Error(t, err)
		assert.Equal(t, BlockType(TypeUnknown), bt)
		// The error returned is ErrInvalidBlockType struct
		var invalidBlockTypeErr ErrInvalidBlockType
		assert.ErrorAs(t, err, &invalidBlockTypeErr)
	})

	t.Run("should be case-insensitive", func(t *testing.T) {
		bt, err := BlockTypeFromString("BOARD")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeBoard), bt)

		bt, err = BlockTypeFromString("Card")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeCard), bt)

		bt, err = BlockTypeFromString("FILE-PDF")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeFilePDF), bt)

		bt, err = BlockTypeFromString("FILE-GENERIC")
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeFileGeneric), bt)
	})

	t.Run("should return error for empty string", func(t *testing.T) {
		bt, err := BlockTypeFromString("")
		require.Error(t, err)
		assert.Equal(t, BlockType(TypeUnknown), bt)
	})
}

func TestBlockTypeString(t *testing.T) {
	t.Run("should return string representation of block type", func(t *testing.T) {
		assert.Equal(t, "board", string(TypeBoard))
		assert.Equal(t, "card", string(TypeCard))
		assert.Equal(t, "view", string(TypeView))
		assert.Equal(t, "text", string(TypeText))
		assert.Equal(t, "checkbox", string(TypeCheckbox))
		assert.Equal(t, "comment", string(TypeComment))
		assert.Equal(t, "image", string(TypeImage))
		assert.Equal(t, "attachment", string(TypeAttachment))
		assert.Equal(t, "divider", string(TypeDivider))
		assert.Equal(t, "video", string(TypeVideo))
		assert.Equal(t, "file-pdf", string(TypeFilePDF))
		assert.Equal(t, "file-generic", string(TypeFileGeneric))
		assert.Equal(t, "unknown", string(TypeUnknown))
	})
}

func TestBlockType2IDType(t *testing.T) {
	t.Run("should return IDTypeBoard for TypeBoard", func(t *testing.T) {
		idType := BlockType2IDType(TypeBoard)
		assert.Equal(t, utils.IDTypeBoard, idType)
	})

	t.Run("should return IDTypeCard for TypeCard", func(t *testing.T) {
		idType := BlockType2IDType(TypeCard)
		assert.Equal(t, utils.IDTypeCard, idType)
	})

	t.Run("should return IDTypeView for TypeView", func(t *testing.T) {
		idType := BlockType2IDType(TypeView)
		assert.Equal(t, utils.IDTypeView, idType)
	})

	t.Run("should return IDTypeBlock for content block types", func(t *testing.T) {
		assert.Equal(t, utils.IDTypeBlock, BlockType2IDType(TypeText))
		assert.Equal(t, utils.IDTypeBlock, BlockType2IDType(TypeCheckbox))
		assert.Equal(t, utils.IDTypeBlock, BlockType2IDType(TypeComment))
		assert.Equal(t, utils.IDTypeBlock, BlockType2IDType(TypeDivider))
	})

	t.Run("should return IDTypeAttachment for attachment types", func(t *testing.T) {
		assert.Equal(t, utils.IDTypeAttachment, BlockType2IDType(TypeImage))
		assert.Equal(t, utils.IDTypeAttachment, BlockType2IDType(TypeAttachment))
		assert.Equal(t, utils.IDTypeAttachment, BlockType2IDType(TypeVideo))
		assert.Equal(t, utils.IDTypeAttachment, BlockType2IDType(TypeFilePDF))
		assert.Equal(t, utils.IDTypeAttachment, BlockType2IDType(TypeFileGeneric))
	})

	t.Run("should return IDTypeNone for unknown type", func(t *testing.T) {
		idType := BlockType2IDType(TypeUnknown)
		assert.Equal(t, utils.IDTypeNone, idType)
	})
}

func TestErrInvalidBlockType(t *testing.T) {
	t.Run("should format error message correctly", func(t *testing.T) {
		err := ErrInvalidBlockType{Type: "invalid-type"}
		assert.Equal(t, "invalid-type is an invalid block type.", err.Error())
	})

	t.Run("should be detected by IsErrInvalidBlockType", func(t *testing.T) {
		err := ErrInvalidBlockType{Type: "bad-type"}
		assert.True(t, IsErrInvalidBlockType(err))
	})

	t.Run("should not detect other errors", func(t *testing.T) {
		err := assert.AnError
		assert.False(t, IsErrInvalidBlockType(err))
	})
}

func TestBlockTypeConstants(t *testing.T) {
	t.Run("should have correct constant values", func(t *testing.T) {
		assert.Equal(t, "unknown", TypeUnknown)
		assert.Equal(t, "board", TypeBoard)
		assert.Equal(t, "card", TypeCard)
		assert.Equal(t, "view", TypeView)
		assert.Equal(t, "text", TypeText)
		assert.Equal(t, "checkbox", TypeCheckbox)
		assert.Equal(t, "comment", TypeComment)
		assert.Equal(t, "image", TypeImage)
		assert.Equal(t, "attachment", TypeAttachment)
		assert.Equal(t, "divider", TypeDivider)
		assert.Equal(t, "video", TypeVideo)
		assert.Equal(t, "file-pdf", TypeFilePDF)
		assert.Equal(t, "file-generic", TypeFileGeneric)
	})
}

func TestFileBlockTypes(t *testing.T) {
	t.Run("TypeFilePDF should be a valid block type", func(t *testing.T) {
		bt, err := BlockTypeFromString(TypeFilePDF)
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeFilePDF), bt)
	})

	t.Run("TypeFileGeneric should be a valid block type", func(t *testing.T) {
		bt, err := BlockTypeFromString(TypeFileGeneric)
		require.NoError(t, err)
		assert.Equal(t, BlockType(TypeFileGeneric), bt)
	})

	t.Run("file block types should use IDTypeAttachment", func(t *testing.T) {
		assert.Equal(t, utils.IDTypeAttachment, BlockType2IDType(TypeFilePDF))
		assert.Equal(t, utils.IDTypeAttachment, BlockType2IDType(TypeFileGeneric))
	})

	t.Run("file-pdf and file-generic should be distinct types", func(t *testing.T) {
		assert.NotEqual(t, TypeFilePDF, TypeFileGeneric)
	})

	t.Run("file block types should be distinct from media types", func(t *testing.T) {
		assert.NotEqual(t, TypeFilePDF, TypeImage)
		assert.NotEqual(t, TypeFilePDF, TypeVideo)
		assert.NotEqual(t, TypeFileGeneric, TypeImage)
		assert.NotEqual(t, TypeFileGeneric, TypeVideo)
	})
}
