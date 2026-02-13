// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React from 'react'
import {Provider as ReduxProvider} from 'react-redux'
import {render, fireEvent, waitFor} from '@testing-library/react'
import {act} from 'react-dom/test-utils'
import {mocked} from 'jest-mock'

import {AttachmentBlock} from '../../blocks/attachmentBlock'
import {mockStateStore, wrapIntl} from '../../testUtils'
import octoClient from '../../octoClient'
import {TestBlockFactory} from '../../test/testBlockFactory'
import {IUser} from '../../user'

import AttachmentElement from './attachmentElement'

jest.mock('../../octoClient')
const mockedOcto = mocked(octoClient, true)

const board = TestBlockFactory.createBoard()
board.id = '1'
board.teamId = 'team-id'
board.channelId = 'channel_1'

describe('component/content/FileBlock', () => {
    const defaultBlock: AttachmentBlock = {
        id: 'test-id',
        boardId: '1',
        parentId: '',
        modifiedBy: 'test-user-id',
        schema: 0,
        type: 'attachment',
        title: 'test-title',
        fields: {
            fileId: 'test.txt',
        },
        createdBy: 'test-user-id',
        createAt: 0,
        updateAt: 0,
        deleteAt: 0,
        limited: false,
        isUploading: false,
        uploadingPercent: 0,
    }

    const me: IUser = {
        id: 'user-id-1',
        username: 'username_1',
        email: '',
        nickname: '',
        firstname: '',
        lastname: '',
        props: {},
        create_at: 0,
        update_at: 0,
        is_bot: false,
        is_guest: false,
        roles: 'system_user',
    }

    const state = {
        teams: {
            current: {id: 'team-id', title: 'Test Team'},
        },
        users: {
            me,
            boardUsers: [me],
            blockSubscriptions: [],
        },
        boards: {
            current: board.id,
            boards: {
                [board.id]: board,
            },
            templates: [],
            membersInBoards: {
                [board.id]: {},
            },
            myBoardMemberships: {
                [board.id]: {userId: me.id, schemeAdmin: true},
            },
        },

        attachments: {
            attachments: {
                'test-id': {
                    uploadPercent: 0,
                },
            },
        },
    }

    const store = mockStateStore([], state)

    beforeEach(() => {
        jest.clearAllMocks()
        mockedOcto.getFileAsDataUrl.mockResolvedValue({url: 'test.txt'})
        mockedOcto.getFileInfo.mockResolvedValue({
            name: 'test.txt',
            size: 2300,
            extension: '.txt',
        })
    })

    test('should match snapshot', async () => {
        const component = wrapIntl(
            <ReduxProvider store={store}>
                <AttachmentElement
                    block={defaultBlock}
                />
            </ReduxProvider>,
        )
        let fileContainer: Element | undefined
        await act(async () => {
            const {container} = render(component)
            fileContainer = container
        })
        expect(fileContainer).toMatchSnapshot()
    })

    test('archived file', async () => {
        mockedOcto.getFileAsDataUrl.mockResolvedValue({
            archived: true,
            name: 'FileName',
            extension: '.txt',
            size: 165002,
        })
        mockedOcto.getFileInfo.mockResolvedValue({
            archived: true,
            name: 'FileName',
            extension: '.txt',
            size: 165002,
        })

        const component = wrapIntl(
            <ReduxProvider store={store}>
                <AttachmentElement
                    block={defaultBlock}
                />
            </ReduxProvider>,
        )
        let fileContainer: Element | undefined
        await act(async () => {
            const {container} = render(component)
            fileContainer = container
        })
        expect(fileContainer).toMatchSnapshot()
    })

    describe('loading state', () => {
        test('should show loading spinner while file info is loading', async () => {
            // Create a promise that we can resolve manually
            let resolveLoad: (value: {name: string; size: number; extension: string}) => void
            mockedOcto.getFileInfo.mockImplementation(() => new Promise((resolve) => {
                resolveLoad = resolve
            }))

            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
            )
            await act(async () => {
                render(component)
            })

            // Should show loading spinner
            const loadingElement = document.querySelector('.MediaLoader__loading')
            expect(loadingElement).toBeTruthy()

            // Resolve the promise
            await act(async () => {
                resolveLoad!({name: 'test.txt', size: 2300, extension: '.txt'})
            })

            // Wait for loading to complete
            await waitFor(() => {
                const spinner = document.querySelector('.MediaLoader__spinner')
                expect(spinner).toBeNull()
            })
        })

        test('should hide loading spinner after file info loads', async () => {
            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const spinner = document.querySelector('.MediaLoader__spinner')
                expect(spinner).toBeNull()
            })
        })

        test('should not show loading spinner when file is uploading', async () => {
            const uploadingBlock: AttachmentBlock = {
                ...defaultBlock,
                isUploading: true,
                title: 'uploading-file.pdf',
            }

            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={uploadingBlock}
                    />
                </ReduxProvider>,
            )
            await act(async () => {
                render(component)
            })

            // Should not show loading spinner for uploading files
            const loadingElement = document.querySelector('.MediaLoader__loading')
            expect(loadingElement).toBeNull()
        })
    })

    describe('error state', () => {
        test('should show error state when file info fails to load', async () => {
            mockedOcto.getFileInfo.mockResolvedValue({})

            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.MediaLoader__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should show error state when getFileInfo throws exception', async () => {
            mockedOcto.getFileInfo.mockRejectedValue(new Error('Network error'))

            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
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
            mockedOcto.getFileInfo.mockResolvedValue({})

            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
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
            mockedOcto.getFileInfo.mockResolvedValueOnce({})

            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                expect(retryButton).toBeTruthy()
            })

            // Second call succeeds
            mockedOcto.getFileInfo.mockResolvedValue({
                name: 'test.txt',
                size: 2300,
                extension: '.txt',
            })

            await act(async () => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                if (retryButton) {
                    fireEvent.click(retryButton)
                }
            })

            // Should have called getFileInfo twice (initial + retry)
            expect(mockedOcto.getFileInfo).toHaveBeenCalledTimes(2)
        })
    })

    describe('loaded state', () => {
        test('should display file element when loaded successfully', async () => {
            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const fileElement = document.querySelector('.FileElement')
                expect(fileElement).toBeTruthy()
            })
        })

        test('should show file name when loaded', async () => {
            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const fileName = document.querySelector('.fileElement-file-name')
                expect(fileName).toBeTruthy()
            })
        })

        test('should show file size when loaded', async () => {
            const component = wrapIntl(
                <ReduxProvider store={store}>
                    <AttachmentElement
                        block={defaultBlock}
                    />
                </ReduxProvider>,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const fileSize = document.querySelector('.fileElement-file-ext-and-size')
                expect(fileSize).toBeTruthy()
            })
        })
    })
})
