// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Block, createBlock} from './block'

export type CommentType = 'comment' | 'edits' | 'bot'

export type CommentAttachment = {
    fileId: string
    fileName: string
    fileSize: number
    mimeType: string
    width?: number
    height?: number
    miniPreview?: string
}

type CommentBlock = Block & {
    type: 'comment'
}

function createCommentBlock(block?: Block): CommentBlock {
    return {
        ...createBlock(block),
        type: 'comment',
    }
}

export {CommentBlock, createCommentBlock}
