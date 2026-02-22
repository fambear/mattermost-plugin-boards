// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Block, createBlock} from './block'
import {ContentBlock} from './contentBlock'

type FileGenericBlockFields = {
    fileId: string
    fileName: string
    fileSize: number
    mimeType: string
}

type FileGenericBlock = ContentBlock & {
    type: 'file-generic'
    fields: FileGenericBlockFields
}

function createFileGenericBlock(block?: Partial<Block>): FileGenericBlock {
    return {
        ...createBlock(block),
        type: 'file-generic',
        fields: {
            fileId: block?.fields?.fileId || '',
            fileName: block?.fields?.fileName || '',
            fileSize: block?.fields?.fileSize || 0,
            mimeType: block?.fields?.mimeType || '',
        },
    }
}

export {FileGenericBlock, FileGenericBlockFields, createFileGenericBlock}
