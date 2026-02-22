// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, waitFor, fireEvent} from '@testing-library/react'
import {act} from 'react-dom/test-utils'

import {FileGenericBlock} from '../../blocks/fileGenericBlock'
import {wrapIntl} from '../../testUtils'

import octoClient from '../../octoClient'

import FileGenericElement from './fileGenericElement'

// Mock octoClient for @swc/jest compatibility
jest.mock('../../octoClient')


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
        ;(octoClient.getFileUrl as jest.Mock).mockReturnValue('http://localhost/api/v2/files/teams/team-1/board-1/test-file-id')
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
        test('should create download link with direct API URL on click', async () => {
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

            expect((octoClient.getFileUrl as jest.Mock)).toHaveBeenCalledWith('board-1', 'test-file-id')
        })

        test('should trigger download on Enter key', async () => {
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

            expect((octoClient.getFileUrl as jest.Mock)).toHaveBeenCalled()
        })

        test('should trigger download on Space key', async () => {
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

            expect((octoClient.getFileUrl as jest.Mock)).toHaveBeenCalled()
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
