// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import 'isomorphic-fetch'

import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {act} from 'react-dom/test-utils'

import {Provider as ReduxProvider} from 'react-redux'
import configureStore from 'redux-mock-store'

import {CommentBlock, CommentType} from '../../blocks/commentBlock'

import {mockDOM, wrapIntl} from '../../testUtils'
import {Utils} from '../../utils'

import {FetchMock} from '../../test/fetchMock'

import {mockMMStore} from '../../../tests/mock_window'

import CommentsList from './commentsList'

global.fetch = FetchMock.fn
jest.spyOn(Utils, 'displayDateTime').mockReturnValue('a long time ago')
jest.spyOn(Utils, 'relativeDisplayDateTime').mockReturnValue('a long time ago')

beforeEach(() => {
    FetchMock.fn.mockReset()
})

beforeAll(() => {
    mockDOM()
})

describe('components/cardDetail/CommentsList', () => {
    (window as any).store= mockMMStore
    const createdAt = Date.parse('01 Jan 2021 00:00:00 GMT')

    const createComment = (id: string, title: string, userId: string, commentType?: CommentType): CommentBlock => {
        const comment: CommentBlock = {
            id,
            title,
            createAt: createdAt,
            modifiedBy: userId,
        } as CommentBlock

        if (commentType) {
            comment.fields = { commentType }
        }

        return comment
    }

    const comment1 = createComment('comment_id_1', 'Comment 1', 'user_id_1', 'comment')
    const comment2 = createComment('comment_id_2', 'Comment 2', 'user_id_2', 'comment')
    const editComment = createComment('edit_id_1', 'Card title changed', 'user_id_3', 'edits')
    const botComment = createComment('bot_id_1', 'Bot analysis complete', 'bot_user_id', 'bot')
    const commentWithoutType = createComment('comment_id_3', 'Legacy comment', 'user_id_1', undefined)

    const baseState = {
        users: {
            boardUsers: {
                'user-id-1': {username: 'username_1'},
                'user_id_1': {username: 'username_1'},
                'user_id_2': {username: 'username_2'},
                'user_id_3': {username: 'username_3'},
                'bot_user_id': {username: 'bot_user', is_bot: true},
            },
        },
        boards: {
            boards: {
                board_id_1: {title: 'Board'},
            },
            current: 'board_id_1',
            myBoardMemberships: {
                board_id_1: {userId: 'user_id_1', schemeAdmin: true},
            },
        },
        cards: {
            cards: {
                card_id_1: {title: 'Card'},
            },
            current: 'card_id_1',
        },
        clientConfig: {
            value: {},
        },
        teams: {
            current: {id: 'team_id_1'},
        },
    }

    test('comments show up', async () => {
        const mockStore = configureStore([])
        const store = mockStore(baseState)

        const component = (
            <ReduxProvider store={store}>
                {wrapIntl(
                    <CommentsList
                        comments={[comment1, comment2]}
                        cardId={'card_id'}
                        boardId={'board_id'}
                        readonly={false}
                    />,
                )}
            </ReduxProvider>)

        let container: Element | DocumentFragment | null = null

        await act(async () => {
            const result = render(component)
            container = result.container
        })

        expect(container).toBeDefined()
        expect(container).toMatchSnapshot()

        // Comments show up
        const comments = container!.querySelectorAll('.mocked-message-html')
        expect(comments.length).toBe(2)

        // Add comment option visible when readonly mode is off
        const newCommentSection = container!.querySelectorAll('.newcomment')
        expect(newCommentSection.length).toBe(1)
    })

    test('comments show up in readonly mode', async () => {
        const mockStore = configureStore([])
        const store = mockStore({
            ...baseState,
            users: {
                ...baseState.users,
                me: {
                    id: 'user-id-1',
                    roles: 'system_admin',
                    username: 'username_1',
                    email: 'username@email.com'
                },
            },
        })

        const component = (
            <ReduxProvider store={store}>
                {wrapIntl(
                    <CommentsList
                        comments={[comment1, comment2]}
                        cardId={'card_id'}
                        boardId={'board_id'}
                        readonly={true}
                    />,
                )}
            </ReduxProvider>)

        let container: Element | DocumentFragment | null = null

        await act(async () => {
            const result = render(component)
            container = result.container
        })

        expect(container).toBeDefined()
        expect(container).toMatchSnapshot()

        // Comments show up
        const comments = container!.querySelectorAll('.mocked-message-html')
        expect(comments.length).toBe(2)

        // Add comment option visible when readonly mode is off
        const newCommentSection = container!.querySelectorAll('.newcomment')
        expect(newCommentSection.length).toBe(0)
    })

    test('tab bar is displayed with all tabs', async () => {
        const mockStore = configureStore([])
        const store = mockStore(baseState)

        const component = (
            <ReduxProvider store={store}>
                {wrapIntl(
                    <CommentsList
                        comments={[comment1, editComment, botComment]}
                        cardId={'card_id'}
                        boardId={'board_id'}
                        readonly={false}
                    />,
                )}
            </ReduxProvider>)

        let container: Element | DocumentFragment | null = null

        await act(async () => {
            const result = render(component)
            container = result.container
        })

        // Tab bar should be present
        const tabBar = container!.querySelector('.CommentsList__tabs')
        expect(tabBar).not.toBeNull()

        // All three tabs should be present
        const tabs = container!.querySelectorAll('.CommentsList__tab')
        expect(tabs.length).toBe(3)

        // Tab labels should be correct
        expect(screen.getByText('Comments')).toBeDefined()
        expect(screen.getByText('Card events')).toBeDefined()
        expect(screen.getByText('Bot events')).toBeDefined()
    })

    test('tab counts are displayed correctly', async () => {
        const comment2a = createComment('comment_id_2a', 'Comment 2a', 'user_id_2', 'comment')
        const edit2 = createComment('edit_id_2', 'Property changed', 'user_id_3', 'edits')
        const bot2 = createComment('bot_id_2', 'Another bot event', 'bot_user_id', 'bot')

        const mockStore = configureStore([])
        const store = mockStore(baseState)

        const component = (
            <ReduxProvider store={store}>
                {wrapIntl(
                    <CommentsList
                        comments={[comment1, comment2a, editComment, edit2, botComment, bot2]}
                        cardId={'card_id'}
                        boardId={'board_id'}
                        readonly={false}
                    />,
                )}
            </ReduxProvider>)

        let container: Element | DocumentFragment | null = null

        await act(async () => {
            const result = render(component)
            container = result.container
        })

        // All three tab labels should be present
        expect(screen.getByText('Comments')).toBeDefined()
        expect(screen.getByText('Card events')).toBeDefined()
        expect(screen.getByText('Bot events')).toBeDefined()

        // All three tabs should show counts of 2
        const countBadges = container!.querySelectorAll('.CommentsList__tab-count')
        expect(countBadges.length).toBe(3)
        countBadges.forEach(badge => {
            expect(badge.textContent).toBe('(2)')
        })
    })

    test('tab switching filters comments correctly', async () => {
        const mockStore = configureStore([])
        const store = mockStore(baseState)

        const component = (
            <ReduxProvider store={store}>
                {wrapIntl(
                    <CommentsList
                        comments={[comment1, editComment, botComment]}
                        cardId={'card_id'}
                        boardId={'board_id'}
                        readonly={false}
                    />,
                )}
            </ReduxProvider>)

        let container: Element | DocumentFragment | null = null

        await act(async () => {
            const result = render(component)
            container = result.container
        })

        // Initially on Comments tab, should show 1 comment
        let comments = container!.querySelectorAll('.mocked-message-html')
        expect(comments.length).toBe(1)
        // Note: messageHtmlToComponent is mocked and always returns 'Test Comment'

        // Click on Card events tab
        const editsTab = screen.getByText(/Card events/)
        await userEvent.click(editsTab)

        // Should show 1 edit comment
        comments = container!.querySelectorAll('.mocked-message-html')
        expect(comments.length).toBe(1)
        // Note: messageHtmlToComponent is mocked and always returns 'Test Comment'

        // Click on Bot events tab
        const botTab = screen.getByText(/Bot events/)
        await userEvent.click(botTab)

        // Should show 1 bot comment
        comments = container!.querySelectorAll('.mocked-message-html')
        expect(comments.length).toBe(1)
        // Note: messageHtmlToComponent is mocked and always returns 'Test Comment'
    })

    test('new comment form is only shown on Comments tab when not readonly', async () => {
        const mockStore = configureStore([])
        const store = mockStore(baseState)

        const component = (
            <ReduxProvider store={store}>
                {wrapIntl(
                    <CommentsList
                        comments={[comment1, editComment, botComment]}
                        cardId={'card_id'}
                        boardId={'board_id'}
                        readonly={false}
                    />,
                )}
            </ReduxProvider>)

        let container: Element | DocumentFragment | null = null

        await act(async () => {
            const result = render(component)
            container = result.container
        })

        // Comments tab - new comment form should be visible
        let newCommentSection = container!.querySelector('.newcomment')
        expect(newCommentSection).not.toBeNull()

        // Switch to Card events tab
        const editsTab = screen.getByText(/Card events/)
        await userEvent.click(editsTab)

        // New comment form should not be visible
        newCommentSection = container!.querySelector('.newcomment')
        expect(newCommentSection).toBeNull()

        // Switch to Bot events tab
        const botTab = screen.getByText(/Bot events/)
        await userEvent.click(botTab)

        // New comment form should not be visible
        newCommentSection = container!.querySelector('.newcomment')
        expect(newCommentSection).toBeNull()
    })

    test('legacy comments without commentType are treated as comment type', async () => {
        const mockStore = configureStore([])
        const store = mockStore(baseState)

        const component = (
            <ReduxProvider store={store}>
                {wrapIntl(
                    <CommentsList
                        comments={[commentWithoutType]}
                        cardId={'card_id'}
                        boardId={'board_id'}
                        readonly={false}
                    />,
                )}
            </ReduxProvider>)

        let container: Element | DocumentFragment | null = null

        await act(async () => {
            const result = render(component)
            container = result.container
        })

        // Should show up in Comments tab (default)
        const comments = container!.querySelectorAll('.mocked-message-html')
        expect(comments.length).toBe(1)
        // Note: messageHtmlToComponent is mocked and always returns 'Test Comment'

        // Comments tab should have count (1)
        expect(screen.getByText('Comments')).toBeDefined()
        expect(container!.querySelector('.CommentsList__tab-count')?.textContent).toBe('(1)')
    })

    test('active tab styling is applied correctly', async () => {
        const mockStore = configureStore([])
        const store = mockStore(baseState)

        const component = (
            <ReduxProvider store={store}>
                {wrapIntl(
                    <CommentsList
                        comments={[comment1, editComment, botComment]}
                        cardId={'card_id'}
                        boardId={'board_id'}
                        readonly={false}
                    />,
                )}
            </ReduxProvider>)

        await act(async () => {
            render(component)
        })

        // Comments tab should be active initially
        const commentsTab = screen.getByText(/Comments/).closest('.CommentsList__tab')
        expect(commentsTab).toHaveClass('active')

        // Click on Card events tab
        const editsTab = screen.getByText(/Card events/)
        await userEvent.click(editsTab)

        // Comments tab should no longer be active
        expect(commentsTab).not.toHaveClass('active')

        // Card events tab should be active
        expect(editsTab.closest('.CommentsList__tab')).toHaveClass('active')
    })
})
