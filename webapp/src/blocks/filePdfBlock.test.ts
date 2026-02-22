// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TestBlockFactory} from '../test/testBlockFactory'

import {createFilePdfBlock, FilePdfBlock, FilePdfBlockFields} from './filePdfBlock'

describe('filePdfBlock tests', () => {
    const board = TestBlockFactory.createBoard()
    const card = TestBlockFactory.createCard(board)

    describe('createFilePdfBlock', () => {
        it('should create a block with default values', () => {
            const block = createFilePdfBlock()

            expect(block.type).toBe('file-pdf')
            expect(block.fields.fileId).toBe('')
            expect(block.fields.fileName).toBe('')
            expect(block.fields.fileSize).toBe(0)
            expect(block.fields.mimeType).toBe('application/pdf')
            expect(block.fields.pageCount).toBeUndefined()
        })

        it('should create a block with provided field values', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileId: 'pdf-file-id-456',
                    fileName: 'report-q4.pdf',
                    fileSize: 2457600,
                    mimeType: 'application/pdf',
                    pageCount: 12,
                },
            })

            expect(block.type).toBe('file-pdf')
            expect(block.fields.fileId).toBe('pdf-file-id-456')
            expect(block.fields.fileName).toBe('report-q4.pdf')
            expect(block.fields.fileSize).toBe(2457600)
            expect(block.fields.mimeType).toBe('application/pdf')
            expect(block.fields.pageCount).toBe(12)
        })

        it('should create a block with board and parent IDs', () => {
            const block = createFilePdfBlock({
                boardId: board.id,
                parentId: card.id,
                fields: {
                    fileId: 'pdf-id',
                    fileName: 'document.pdf',
                    fileSize: 1024000,
                    mimeType: 'application/pdf',
                },
            })

            expect(block.boardId).toBe(board.id)
            expect(block.parentId).toBe(card.id)
            expect(block.type).toBe('file-pdf')
            expect(block.fields.fileName).toBe('document.pdf')
        })

        it('should create a block with partial field values', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'partial.pdf',
                    pageCount: 5,
                },
            })

            expect(block.fields.fileName).toBe('partial.pdf')
            expect(block.fields.pageCount).toBe(5)
            expect(block.fields.fileId).toBe('')
            expect(block.fields.fileSize).toBe(0)
            expect(block.fields.mimeType).toBe('application/pdf')
        })

        it('should handle page count of 0', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'empty.pdf',
                    fileSize: 500,
                    pageCount: 0,
                },
            })

            expect(block.fields.pageCount).toBe(0)
        })

        it('should handle large page count', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'large-document.pdf',
                    fileSize: 50000000,
                    pageCount: 1000,
                },
            })

            expect(block.fields.pageCount).toBe(1000)
        })

        it('should handle single page PDF', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'single-page.pdf',
                    fileSize: 50000,
                    pageCount: 1,
                },
            })

            expect(block.fields.pageCount).toBe(1)
        })

        it('should handle undefined page count', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'no-page-count.pdf',
                    fileSize: 75000,
                },
            })

            expect(block.fields.pageCount).toBeUndefined()
        })

        it('should default mimeType to application/pdf when not specified', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'auto-mime.pdf',
                    fileSize: 10000,
                },
            })

            expect(block.fields.mimeType).toBe('application/pdf')
        })

        it('should allow custom mimeType override', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'custom.pdf',
                    fileSize: 5000,
                    mimeType: 'application/x-pdf',
                },
            })

            expect(block.fields.mimeType).toBe('application/x-pdf')
        })

        it('should handle empty filename', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: '',
                    fileSize: 100,
                    pageCount: 1,
                },
            })

            expect(block.fields.fileName).toBe('')
        })

        it('should handle special characters in filename', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'report (final) [v2] - Q4 2026.pdf',
                    fileSize: 1000000,
                    pageCount: 25,
                },
            })

            expect(block.fields.fileName).toBe('report (final) [v2] - Q4 2026.pdf')
        })

        it('should handle zero file size', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'empty.pdf',
                    fileSize: 0,
                    pageCount: 0,
                },
            })

            expect(block.fields.fileSize).toBe(0)
        })

        it('should handle large file size', () => {
            const largeSize = 500 * 1024 * 1024 // 500MB
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'large.pdf',
                    fileSize: largeSize,
                    pageCount: 500,
                },
            })

            expect(block.fields.fileSize).toBe(largeSize)
        })
    })

    describe('FilePdfBlock type', () => {
        it('should be correctly typed as file-pdf', () => {
            const block: FilePdfBlock = createFilePdfBlock({
                fields: {
                    fileId: 'type-test-id',
                    fileName: 'type-test.pdf',
                    fileSize: 100000,
                    mimeType: 'application/pdf',
                    pageCount: 10,
                },
            })

            expect(block.type).toBe('file-pdf')
        })

        it('should have all required fields including optional pageCount', () => {
            const block: FilePdfBlock = createFilePdfBlock()
            const fields: FilePdfBlockFields = block.fields

            expect(typeof fields.fileId).toBe('string')
            expect(typeof fields.fileName).toBe('string')
            expect(typeof fields.fileSize).toBe('number')
            expect(typeof fields.mimeType).toBe('string')
            // pageCount is optional, can be undefined or number
            expect(fields.pageCount === undefined || typeof fields.pageCount === 'number').toBe(true)
        })

        it('should have pageCount as optional number', () => {
            // Without pageCount
            const block1: FilePdfBlock = createFilePdfBlock({
                fields: {
                    fileName: 'no-count.pdf',
                },
            })
            expect(block1.fields.pageCount).toBeUndefined()

            // With pageCount
            const block2: FilePdfBlock = createFilePdfBlock({
                fields: {
                    fileName: 'with-count.pdf',
                    pageCount: 15,
                },
            })
            expect(block2.fields.pageCount).toBe(15)
        })
    })

    describe('PDF-specific scenarios', () => {
        it('should create block for scanned document', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'scanned-document.pdf',
                    fileSize: 15000000,
                    mimeType: 'application/pdf',
                    pageCount: 50,
                },
            })

            expect(block.fields.pageCount).toBe(50)
            expect(block.fields.fileSize).toBe(15000000)
        })

        it('should create block for text-based PDF', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'text-document.pdf',
                    fileSize: 100000,
                    mimeType: 'application/pdf',
                    pageCount: 20,
                },
            })

            expect(block.fields.pageCount).toBe(20)
            expect(block.fields.fileSize).toBe(100000)
        })

        it('should create block for password-protected PDF (without knowing password)', () => {
            // In practice, the page count might not be available for protected PDFs
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'protected.pdf',
                    fileSize: 500000,
                    mimeType: 'application/pdf',
                    // pageCount intentionally omitted
                },
            })

            expect(block.fields.pageCount).toBeUndefined()
            expect(block.fields.fileName).toBe('protected.pdf')
        })

        it('should create block for form PDF', () => {
            const block = createFilePdfBlock({
                fields: {
                    fileName: 'tax-form-2026.pdf',
                    fileSize: 250000,
                    mimeType: 'application/pdf',
                    pageCount: 4,
                },
            })

            expect(block.fields.pageCount).toBe(4)
        })
    })
})
