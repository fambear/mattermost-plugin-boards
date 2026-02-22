// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, waitFor, fireEvent, cleanup} from '@testing-library/react'
import {act} from 'react-dom/test-utils'

import {FilePdfBlock} from '../../blocks/filePdfBlock'
import {wrapIntl} from '../../testUtils'

import octoClient from '../../octoClient'

import FilePdfElement from './filePdfElement'

// Mock octoClient for @swc/jest compatibility
jest.mock('../../octoClient')


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

// Mock pdfjs-dist/build/pdf.worker.entry
jest.mock('pdfjs-dist/build/pdf.worker.entry', () => ({}), {virtual: true})

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

    afterEach(async () => {
        cleanup()
        await new Promise((resolve) => setTimeout(resolve, 0))
    })

    beforeEach(() => {
        jest.clearAllMocks()
        ;(octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: 'data:application/pdf;base64,testpdfdata'})
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

        test('should display thumbnail image when loaded', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // After loading, should show thumbnail image
            await waitFor(() => {
                const thumbnailImage = document.querySelector('.FilePdfElement__thumbnail-image')
                expect(thumbnailImage).toBeTruthy()
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

        test('should use page count from PDF when block fields have no page count', async () => {
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
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const metadata = document.querySelector('.FilePdfElement__metadata')
                // Should show page count from PDF (mock returns 5 pages)
                expect(metadata?.textContent).toContain('5')
                expect(metadata?.textContent).toContain('pages')
            })
        })
    })

    describe('loading state', () => {
        test('should show loading spinner while PDF is loading', async () => {
            // Create a promise that we can resolve manually
            let resolveLoad: (value: {url: string}) => void
            (octoClient.getFileAsDataUrl as jest.Mock).mockImplementation(() => new Promise((resolve) => {
                resolveLoad = resolve
            }))

            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Should show loading spinner
            const loadingElement = document.querySelector('.MediaLoader__loading')
            expect(loadingElement).toBeTruthy()

            // Resolve the promise
            await act(async () => {
                resolveLoad!({url: 'data:application/pdf;base64,test'})
            })

            // Wait for loading to complete
            await waitFor(() => {
                const spinner = document.querySelector('.MediaLoader__spinner')
                expect(spinner).toBeNull()
            })
        })

        test('should hide loading spinner after PDF loads', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const spinner = document.querySelector('.MediaLoader__spinner')
                expect(spinner).toBeNull()
            })
        })
    })

    describe('error handling', () => {
        test('should show error state when PDF fails to load (empty url)', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: ''})

            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.MediaLoader__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should show error state when getFileAsDataUrl throws exception', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockRejectedValue(new Error('Network error'))

            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.MediaLoader__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should show retry button on error', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: ''})

            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                expect(retryButton).toBeTruthy()
            })
        })

        test('should retry loading when retry button is clicked', async () => {
            // First call fails
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValueOnce({url: ''})

            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                expect(retryButton).toBeTruthy()
            })

            // Second call succeeds
            ;(octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: 'data:application/pdf;base64,test'})

            await act(async () => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                if (retryButton) {
                    fireEvent.click(retryButton)
                }
            })

            // Should have called getFileAsDataUrl twice (initial + retry)
            expect((octoClient.getFileAsDataUrl as jest.Mock)).toHaveBeenCalledTimes(2)
        })

        test('should track multiple retry attempts', async () => {
            // All calls fail
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: ''})

            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Click retry button 3 times
            for (let i = 0; i < 3; i++) {
                await waitFor(() => {
                    const retryButton = document.querySelector('.MediaLoader__retry-button')
                    expect(retryButton).toBeTruthy()
                })

                await act(async () => {
                    const retryButton = document.querySelector('.MediaLoader__retry-button')
                    if (retryButton) {
                        fireEvent.click(retryButton)
                    }
                })
            }

            // Should have called getFileAsDataUrl 4 times (initial + 3 retries)
            expect((octoClient.getFileAsDataUrl as jest.Mock)).toHaveBeenCalledTimes(4)
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

        test('should display download button text', async () => {
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
                expect(downloadButton?.textContent).toContain('Download')
            })
        })
    })

    describe('edge cases', () => {
        test('should render container when fileId is provided', async () => {
            const component = wrapIntl(
                <FilePdfElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FilePdfElement__container')
                expect(container).toBeTruthy()
            })
        })

        test('should handle missing fileSize gracefully', async () => {
            const blockWithoutFileSize: FilePdfBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    fileSize: 0,
                },
            }
            const component = wrapIntl(
                <FilePdfElement
                    block={blockWithoutFileSize}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FilePdfElement__container')
                expect(container).toBeTruthy()
            })
        })

        test('should handle missing mimeType gracefully', async () => {
            const blockWithoutMimeType: FilePdfBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    mimeType: '',
                },
            }
            const component = wrapIntl(
                <FilePdfElement
                    block={blockWithoutMimeType}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FilePdfElement__container')
                expect(container).toBeTruthy()
            })
        })
    })
})
