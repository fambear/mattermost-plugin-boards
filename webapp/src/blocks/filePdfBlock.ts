// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Block, createBlock} from './block'
import {ContentBlock} from './contentBlock'

type FilePdfBlockFields = {
    fileId: string
    fileName: string
    fileSize: number
    mimeType: string
    pageCount?: number
}

type FilePdfBlock = ContentBlock & {
    type: 'file-pdf'
    fields: FilePdfBlockFields
}

function createFilePdfBlock(block?: Partial<Block>): FilePdfBlock {
    return {
        ...createBlock(block),
        type: 'file-pdf',
        fields: {
            fileId: block?.fields?.fileId || '',
            fileName: block?.fields?.fileName || '',
            fileSize: block?.fields?.fileSize || 0,
            mimeType: block?.fields?.mimeType || 'application/pdf',
            pageCount: block?.fields?.pageCount,
        },
    }
}

export {FilePdfBlock, FilePdfBlockFields, createFilePdfBlock}
