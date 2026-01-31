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

function createVideoBlock(block?: Block): VideoBlock {
    return {
        ...createBlock(block),
        type: 'video',
        fields: {
            fileId: block?.fields.fileId || '',
            filename: block?.fields.filename || '',
            sourceType: block?.fields.sourceType || 'file',
            videoUrl: block?.fields.videoUrl || '',
            videoId: block?.fields.videoId || '',
        },
    }
}

export {VideoBlock, VideoBlockFields, VideoSourceType, createVideoBlock}

