// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Block, createBlock} from './block'
import {ContentBlock} from './contentBlock'

type VideoSourceType = 'file' | 'youtube' | 'gdrive'

type VideoBlockFields = {
    fileId?: string
    filename?: string
    sourceType?: VideoSourceType
    videoUrl?: string
    videoId?: string
}

type VideoBlock = ContentBlock & {
    type: 'video'
    fields: VideoBlockFields
}

function createVideoBlock(block?: Partial<Block>): VideoBlock {
    const fields = block?.fields
    return {
        ...createBlock(block as Block | undefined),
        type: 'video',
        fields: {
            fileId: fields?.fileId || '',
            filename: fields?.filename || '',
            sourceType: fields?.sourceType || 'file',
            videoUrl: fields?.videoUrl || '',
            videoId: fields?.videoId || '',
        },
    }
}

export {VideoBlock, VideoBlockFields, VideoSourceType, createVideoBlock}

