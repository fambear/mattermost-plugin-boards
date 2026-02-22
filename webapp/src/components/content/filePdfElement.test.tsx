// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, waitFor} from '@testing-library/react'

import {act} from 'react-dom/test-utils'

import {mocked} from 'jest-mock'

import {FilePdfBlock} from '../../blocks/filePdfBlock'
import {wrapIntl} from '../../testUtils'

import octoClient from '../../octoClient'

import FilePdfElement from './filePdfElement'

// Mock canvas getContext and toDataURL
beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(4),
        })),
        putImageData: jest.fn(),
        createImageData: jest.fn(() => []),
        setTransform: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        translate: jest.fn(),
        transform: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        arc: jest.fn(),
        clip: jest.fn(),
        measureText: jest.fn(() => ({width: 0})),
        fillText: jest.fn(),
        strokeText: jest.fn(),
    })) as any

    HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockImageData')
})

// Mock pdfjs-dist
jest.mock('pdfjs-dist', () => ({
    getDocument: jest.fn(() => ({
        promise: Promise.resolve({
            numPages: 5,
            getPage: jest.fn(() => Promise.resolve({
                getViewport: jest.fn(() => ({width: 200, height: 300})),
                render: jest.fn(() => ({promise: Promise.resolve()})),
            })),
        }),
    })),
    GlobalWorkerOptions: {workerSrc: ''},
}))

jest.mock('../../octoClient')

const mockedOcto = mocked(octoClient, true)

describe('components/content/FilePdfElement', () => {
    const defaultBlock: FilePdfBlock = {
        id: 'test-pdf-id',
        boardId: 'board-1',
        parentId: 'card-1',
        modifiedBy: 'test-user-id',
        schema: 0,
        type: 'file-pdf',
        title: '',
        fields: {
            fileId: 'pdf-file-id',
            fileName: 'report-q4.pdf',
            fileSize: 2457600,
            mimeType: 'application/pdf',
            pageCount: 12,
        },
        createdBy: 'test-user-id',
        createAt: 0,
        updateAt: 0,
        deleteAt: 0,
        limited: false,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockedOcto.getFileAsDataUrl = jest.fn().mockResolvedValue({url: 'data:application/pdf;base64,testpdfdata'})
    })

    test('should match snapshot', async () => {
        const component = wrapIntl(
            <FilePdfElement
                block={defaultBlock}
            />,
        )
        let container: Element | undefined
        await act(async () => {
            const {container: c} = render(component)
            container = c
        })
        expect(container).toMatchSnapshot()
    })

    test('should match snapshot for PDF without page count', async () => {
        const blockWithoutPageCount: FilePdfBlock = {
            ...defaultBlock,
            fields: {
                ...defaultBlock.fields,
                pageCount: undefined,
            },
        }
        const component = wrapIntl(
            <FilePdfElement
                block={blockWithoutPageCount}
            />,
        )
        let container: Element | undefined
        await act(async () => {
            const {container: c} = render(component)
            container = c
        })
        expect(container).toMatchSnapshot()
    })

    describe('rendering', () => {
        test('should display PDF file name', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const fileName = document.querySelector('.FilePdfElement__filename')
                expect(fileName).toBeTruthy()
                expect(fileName?.textContent).toBe('report-q4.pdf')
            })
        })

        test('should display formatted file size', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const metadata = document.querySelector('.FilePdfElement__metadata')
                expect(metadata).toBeTruthy()
                expect(metadata?.textContent).toContain('MiB')
            })
        })

        test('should display page count when available', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const metadata = document.querySelector('.FilePdfElement__metadata')
                expect(metadata?.textContent).toContain('12')
                expect(metadata?.textContent).toContain('pages')
            })
        })

        test('should show "document.pdf" as default filename when empty', async () => {
            const blockWithEmptyName: FilePdfBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    fileName: '',
                },
            }
            const component = wrapIntl(
                <FilePdfElement
                    block={blockWithEmptyName}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const fileName = document.querySelector('.FilePdfElement__filename')
                expect(fileName?.textContent).toBe('document.pdf')
            })
        })

        test('should display thumbnail container', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const thumbnail = document.querySelector('.FilePdfElement__thumbnail')
                expect(thumbnail).toBeTruthy()
            })
        })

        test('should display download button', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const downloadButton = document.querySelector('.FilePdfElement__download')
                expect(downloadButton).toBeTruthy()
            })
        })
    })

    describe('page count handling', () => {
        test('should use page count from block fields', async () => {
            const blockWithPageCount: FilePdfBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    pageCount: 25,
                },
            }
            const component = wrapIntl(
                <FilePdfElement
                    block={blockWithPageCount}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const metadata = document.querySelector('.FilePdfElement__metadata')
                expect(metadata?.textContent).toContain('25')
            })
        })

        test('should handle missing page count gracefully', async () => {
            const blockWithoutPageCount: FilePdfBlock = {
                ...defaultBlock,
                fields: {
                    fileId: 'pdf-id',
                    fileName: 'no-pages.pdf',
                    fileSize: 100000,
                    mimeType: 'application/pdf',
                    // pageCount is intentionally omitted
                },
            }
            const component = wrapIntl(
                <FilePdfElement
                    block={blockWithoutPageCount}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Should still render without error
            await waitFor(() => {
                const container = document.querySelector('.FilePdfElement__container')
                expect(container).toBeTruthy()
            })
        })

        test('should handle zero page count', async () => {
            const blockWithZeroPages: FilePdfBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    pageCount: 0,
                },
            }
            const component = wrapIntl(
                <FilePdfElement
                    block={blockWithZeroPages}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Should still render
            await waitFor(() => {
                const container = document.querySelector('.FilePdfElement__container')
                expect(container).toBeTruthy()
            })
        })
    })

    describe('download functionality', () => {
        test('should have download button with type button', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const downloadButton = document.querySelector('.FilePdfElement__download')
                expect(downloadButton?.getAttribute('type')).toBe('button')
            })
        })
    })
})
