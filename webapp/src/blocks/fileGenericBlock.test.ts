// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createFileGenericBlock, FileGenericBlock, FileGenericBlockFields} from './fileGenericBlock'
import {TestBlockFactory} from '../test/testBlockFactory'

describe('fileGenericBlock tests', () => {
    const board = TestBlockFactory.createBoard()
    const card = TestBlockFactory.createCard(board)

    describe('createFileGenericBlock', () => {
        it('should create a block with default values', () => {
            const block = createFileGenericBlock()

            expect(block.type).toBe('file-generic')
            expect(block.fields.fileId).toBe('')
            expect(block.fields.fileName).toBe('')
            expect(block.fields.fileSize).toBe(0)
            expect(block.fields.mimeType).toBe('')
        })

        it('should create a block with provided field values', () => {
            const block = createFileGenericBlock({
                fields: {
                    fileId: 'test-file-id-123',
                    fileName: 'document.xlsx',
                    fileSize: 102400,
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            })

            expect(block.type).toBe('file-generic')
            expect(block.fields.fileId).toBe('test-file-id-123')
            expect(block.fields.fileName).toBe('document.xlsx')
            expect(block.fields.fileSize).toBe(102400)
            expect(block.fields.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        })

        it('should create a block with board and parent IDs', () => {
            const block = createFileGenericBlock({
                boardId: board.id,
                parentId: card.id,
                fields: {
                    fileId: 'test-file-id',
                    fileName: 'archive.zip',
                    fileSize: 2048000,
                    mimeType: 'application/zip',
                },
            })

            expect(block.boardId).toBe(board.id)
            expect(block.parentId).toBe(card.id)
            expect(block.type).toBe('file-generic')
            expect(block.fields.fileName).toBe('archive.zip')
        })

        it('should create a block with partial field values', () => {
            const block = createFileGenericBlock({
                fields: {
                    fileName: 'partial-file.csv',
                },
            })

            expect(block.fields.fileName).toBe('partial-file.csv')
            expect(block.fields.fileId).toBe('')
            expect(block.fields.fileSize).toBe(0)
            expect(block.fields.mimeType).toBe('')
        })

        it('should handle various file types correctly', () => {
            // Test spreadsheet
            const spreadsheet = createFileGenericBlock({
                fields: {
                    fileName: 'budget.xlsx',
                    fileSize: 50000,
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            })
            expect(spreadsheet.fields.fileName).toBe('budget.xlsx')
            expect(spreadsheet.fields.fileSize).toBe(50000)

            // Test document
            const document = createFileGenericBlock({
                fields: {
                    fileName: 'report.docx',
                    fileSize: 75000,
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                },
            })
            expect(document.fields.fileName).toBe('report.docx')

            // Test archive
            const archive = createFileGenericBlock({
                fields: {
                    fileName: 'backup.zip',
                    fileSize: 10000000,
                    mimeType: 'application/zip',
                },
            })
            expect(archive.fields.fileName).toBe('backup.zip')

            // Test JSON
            const json = createFileGenericBlock({
                fields: {
                    fileName: 'config.json',
                    fileSize: 1024,
                    mimeType: 'application/json',
                },
            })
            expect(json.fields.fileName).toBe('config.json')
        })

        it('should create block with zero file size', () => {
            const block = createFileGenericBlock({
                fields: {
                    fileName: 'empty.txt',
                    fileSize: 0,
                    mimeType: 'text/plain',
                },
            })

            expect(block.fields.fileSize).toBe(0)
        })

        it('should create block with large file size', () => {
            const largeSize = 5 * 1024 * 1024 * 1024 // 5GB
            const block = createFileGenericBlock({
                fields: {
                    fileName: 'large-file.zip',
                    fileSize: largeSize,
                    mimeType: 'application/zip',
                },
            })

            expect(block.fields.fileSize).toBe(largeSize)
        })

        it('should create block with special characters in filename', () => {
            const block = createFileGenericBlock({
                fields: {
                    fileName: 'file with spaces & special-chars_(v2).xlsx',
                    fileSize: 1000,
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            })

            expect(block.fields.fileName).toBe('file with spaces & special-chars_(v2).xlsx')
        })

        it('should handle empty filename', () => {
            const block = createFileGenericBlock({
                fields: {
                    fileName: '',
                    fileSize: 100,
                    mimeType: 'application/octet-stream',
                },
            })

            expect(block.fields.fileName).toBe('')
        })

        it('should handle unknown mime types', () => {
            const block = createFileGenericBlock({
                fields: {
                    fileName: 'unknown.xyz',
                    fileSize: 500,
                    mimeType: 'application/x-unknown',
                },
            })

            expect(block.fields.mimeType).toBe('application/x-unknown')
        })
    })

    describe('FileGenericBlock type', () => {
        it('should be correctly typed as file-generic', () => {
            const block: FileGenericBlock = createFileGenericBlock({
                fields: {
                    fileId: 'type-test-id',
                    fileName: 'test.pptx',
                    fileSize: 200000,
                    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                },
            })

            expect(block.type).toBe('file-generic')
        })

        it('should have all required fields', () => {
            const block: FileGenericBlock = createFileGenericBlock()
            const fields: FileGenericBlockFields = block.fields

            expect(typeof fields.fileId).toBe('string')
            expect(typeof fields.fileName).toBe('string')
            expect(typeof fields.fileSize).toBe('number')
            expect(typeof fields.mimeType).toBe('string')
        })
    })
})
