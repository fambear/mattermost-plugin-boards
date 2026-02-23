// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Block, createBlock} from './block'
import {ContentBlock} from './contentBlock'

type ImageBlockFields = {
    fileId: string
    width?: number
    height?: number
    miniPreview?: string
}

type ImageBlock = ContentBlock & {
    type: 'image'
    fields: ImageBlockFields
}

function createImageBlock(block?: Block): ImageBlock {
    return {
        ...createBlock(block),
        type: 'image',
        fields: {
            fileId: block?.fields.fileId || '',
            width: block?.fields.width || undefined,
            height: block?.fields.height || undefined,
            miniPreview: block?.fields.miniPreview || undefined,
        },
    }
}

export {ImageBlock, createImageBlock}
