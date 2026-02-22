// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, waitFor, fireEvent} from '@testing-library/react'
import {act} from 'react-dom/test-utils'

import {FileGenericBlock} from '../../blocks/fileGenericBlock'
import {wrapIntl} from '../../testUtils'

import octoClient from '../../octoClient'

import FileGenericElement from './fileGenericElement'

// octoClient is automatically mocked via __mocks__/octoClient.ts

describe('components/content/FileGenericElement', () => {
    const defaultBlock: FileGenericBlock = {
        id: 'test-id',
        boardId: 'board-1',
        parentId: 'card-1',
        modifiedBy: 'test-user-id',
        schema: 0,
        type: 'file-generic',
        title: '',
        fields: {
            fileId: 'test-file-id',
            fileName: 'document.xlsx',
            fileSize: 102400,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        createdBy: 'test-user-id',
        createAt: 0,
        updateAt: 0,
        deleteAt: 0,
        limited: false,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        ;(octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,test'})
    })

    test('should match snapshot', async () => {
        const component = wrapIntl(
            <FileGenericElement
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

    test('should match snapshot for different file types', async () => {
        // Test with archive file
        const archiveBlock: FileGenericBlock = {
            ...defaultBlock,
            fields: {
                fileId: 'archive-id',
                fileName: 'backup.zip',
                fileSize: 5000000,
                mimeType: 'application/zip',
            },
        }
        const component = wrapIntl(
            <FileGenericElement
                block={archiveBlock}
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
        test('should display file name', async () => {
            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const fileName = document.querySelector('.FileGenericElement__filename')
                expect(fileName).toBeTruthy()
                expect(fileName?.textContent).toBe('document.xlsx')
            })
        })

        test('should display formatted file size', async () => {
            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const metadata = document.querySelector('.FileGenericElement__metadata')
                expect(metadata).toBeTruthy()
                expect(metadata?.textContent).toContain('KiB')
            })
        })

        test('should display file icon', async () => {
            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const icon = document.querySelector('.FileGenericElement__icon')
                expect(icon).toBeTruthy()
            })
        })

        test('should show "file" as default filename when empty', async () => {
            const blockWithEmptyName: FileGenericBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    fileName: '',
                },
            }
            const component = wrapIntl(
                <FileGenericElement
                    block={blockWithEmptyName}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const fileName = document.querySelector('.FileGenericElement__filename')
                expect(fileName?.textContent).toBe('file')
            })
        })

        test('should handle missing file size gracefully', async () => {
            const blockWithoutSize: FileGenericBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    fileSize: 0,
                },
            }
            const component = wrapIntl(
                <FileGenericElement
                    block={blockWithoutSize}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FileGenericElement__container')
                expect(container).toBeTruthy()
            })
        })
    })

    describe('download functionality', () => {
        test('should call getFileAsDataUrl on click', async () => {
            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FileGenericElement__container')
                expect(container).toBeTruthy()
            })

            const container = document.querySelector('.FileGenericElement__container')
            await act(async () => {
                if (container) {
                    fireEvent.click(container)
                }
            })

            expect((octoClient.getFileAsDataUrl as jest.Mock)).toHaveBeenCalledWith('board-1', 'test-file-id')
        })

        test('should call getFileAsDataUrl on Enter key', async () => {
            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FileGenericElement__container')
                expect(container).toBeTruthy()
            })

            const container = document.querySelector('.FileGenericElement__container')
            await act(async () => {
                if (container) {
                    fireEvent.keyDown(container, {key: 'Enter'})
                }
            })

            expect((octoClient.getFileAsDataUrl as jest.Mock)).toHaveBeenCalled()
        })

        test('should call getFileAsDataUrl on Space key', async () => {
            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FileGenericElement__container')
                expect(container).toBeTruthy()
            })

            const container = document.querySelector('.FileGenericElement__container')
            await act(async () => {
                if (container) {
                    fireEvent.keyDown(container, {key: ' '})
                }
            })

            expect((octoClient.getFileAsDataUrl as jest.Mock)).toHaveBeenCalled()
        })
    })

    describe('error handling', () => {
        test('should show error state when file fails to load (empty url)', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: ''})

            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Click to trigger download which will fail
            const container = document.querySelector('.FileGenericElement__container')
            await act(async () => {
                if (container) {
                    fireEvent.click(container)
                }
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.MediaLoader__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should show error state when getFileAsDataUrl throws exception', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockRejectedValue(new Error('Network error'))

            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Click to trigger download which will fail
            const container = document.querySelector('.FileGenericElement__container')
            await act(async () => {
                if (container) {
                    fireEvent.click(container)
                }
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.MediaLoader__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should show retry button on error', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: ''})

            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Click to trigger download which will fail
            const container = document.querySelector('.FileGenericElement__container')
            await act(async () => {
                if (container) {
                    fireEvent.click(container)
                }
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
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Click to trigger download which will fail
            const container = document.querySelector('.FileGenericElement__container')
            await act(async () => {
                if (container) {
                    fireEvent.click(container)
                }
            })

            await waitFor(() => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                expect(retryButton).toBeTruthy()
            })

            // Click retry button
            await act(async () => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                if (retryButton) {
                    fireEvent.click(retryButton)
                }
            })

            // Should have called getFileAsDataUrl (at least once for the retry)
            expect((octoClient.getFileAsDataUrl as jest.Mock)).toHaveBeenCalled()
        })
    })

    describe('accessibility', () => {
        test('should have proper role and tabindex', async () => {
            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FileGenericElement__container')
                expect(container?.getAttribute('role')).toBe('button')
                expect(container?.getAttribute('tabindex')).toBe('0')
            })
        })

        test('should be keyboard navigable', async () => {
            const component = wrapIntl(
                <FileGenericElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const container = document.querySelector('.FileGenericElement__container')
                expect(container?.getAttribute('tabindex')).toBe('0')
            })
        })
    })

    describe('file type icons', () => {
        test('should display correct icon for spreadsheet files', async () => {
            const spreadsheetBlock: FileGenericBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    fileName: 'data.xlsx',
                },
            }
            const component = wrapIntl(
                <FileGenericElement
                    block={spreadsheetBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const icon = document.querySelector('.FileGenericElement__icon-image')
                expect(icon).toBeTruthy()
            })
        })

        test('should display correct icon for document files', async () => {
            const docBlock: FileGenericBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    fileName: 'document.docx',
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                },
            }
            const component = wrapIntl(
                <FileGenericElement
                    block={docBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const icon = document.querySelector('.FileGenericElement__icon-image')
                expect(icon).toBeTruthy()
            })
        })

        test('should display default icon for unknown file types', async () => {
            const unknownBlock: FileGenericBlock = {
                ...defaultBlock,
                fields: {
                    ...defaultBlock.fields,
                    fileName: 'unknown.xyz',
                    mimeType: 'application/unknown',
                },
            }
            const component = wrapIntl(
                <FileGenericElement
                    block={unknownBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const icon = document.querySelector('.FileGenericElement__icon-image')
                expect(icon).toBeTruthy()
            })
        })
    })
})
