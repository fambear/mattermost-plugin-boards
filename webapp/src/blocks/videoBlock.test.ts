// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createVideoBlock, VideoBlock} from './videoBlock'

describe('blocks/videoBlock', () => {
    describe('createVideoBlock', () => {
        test('should create a video block with default values', () => {
            const block = createVideoBlock()

            expect(block.type).toBe('video')
            expect(block.fields.fileId).toBe('')
            expect(block.fields.filename).toBe('')
            expect(block.fields.sourceType).toBe('file')
            expect(block.fields.videoUrl).toBe('')
            expect(block.fields.videoId).toBe('')
        })

        test('should create a video block with file fields', () => {
            const baseBlock = {
                fields: {
                    fileId: 'file-id-123',
                    filename: 'my-video.mp4',
                    sourceType: 'file' as const,
                },
            }

            const block = createVideoBlock(baseBlock)

            expect(block.type).toBe('video')
            expect(block.fields.fileId).toBe('file-id-123')
            expect(block.fields.filename).toBe('my-video.mp4')
            expect(block.fields.sourceType).toBe('file')
        })

        test('should create a video block with YouTube fields', () => {
            const baseBlock = {
                fields: {
                    sourceType: 'youtube' as const,
                    videoId: 'dQw4w9WgXcQ',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
            }

            const block = createVideoBlock(baseBlock)

            expect(block.type).toBe('video')
            expect(block.fields.sourceType).toBe('youtube')
            expect(block.fields.videoId).toBe('dQw4w9WgXcQ')
            expect(block.fields.videoUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        })

        test('should create a video block with Google Drive fields', () => {
            const baseBlock = {
                fields: {
                    sourceType: 'gdrive' as const,
                    videoId: 'abc123xyz456',
                    videoUrl: 'https://drive.google.com/file/d/abc123xyz456/view',
                },
            }

            const block = createVideoBlock(baseBlock)

            expect(block.type).toBe('video')
            expect(block.fields.sourceType).toBe('gdrive')
            expect(block.fields.videoId).toBe('abc123xyz456')
            expect(block.fields.videoUrl).toBe('https://drive.google.com/file/d/abc123xyz456/view')
        })

        test('should create a video block with all fields', () => {
            const baseBlock = {
                id: 'custom-block-id',
                boardId: 'board-123',
                fields: {
                    fileId: 'file-id-123',
                    filename: 'test-video.mov',
                    sourceType: 'file' as const,
                    videoUrl: 'https://example.com/video',
                    videoId: 'custom-id',
                },
            }

            const block = createVideoBlock(baseBlock)

            expect(block.id).toBe('custom-block-id')
            expect(block.boardId).toBe('board-123')
            expect(block.type).toBe('video')
            expect(block.fields.fileId).toBe('file-id-123')
            expect(block.fields.filename).toBe('test-video.mov')
            expect(block.fields.sourceType).toBe('file')
            expect(block.fields.videoUrl).toBe('https://example.com/video')
            expect(block.fields.videoId).toBe('custom-id')
        })
    })
})
