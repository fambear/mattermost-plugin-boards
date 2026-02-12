// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {Provider as ReduxProvider} from 'react-redux'
import moment from 'moment'

import {mocked} from 'jest-mock'

import {wrapIntl, mockStateStore} from '../../testUtils'

import {TestBlockFactory} from '../../test/testBlockFactory'

import mutator from '../../mutator'

import {CommentType} from '../../blocks/commentBlock'

import {mockMMStore} from '../../../tests/mock_window'

import Comment from './comment'

jest.mock('../../mutator')
const mockedMutator = mocked(mutator, true)

const board = TestBlockFactory.createBoard()
const card = TestBlockFactory.createCard(board)
const comment = TestBlockFactory.createComment(card)
const dateFixed = Date.parse('01 Oct 2020')
comment.createAt = dateFixed
comment.updateAt = dateFixed
comment.title = 'Test comment'

const userImageUrl = 'data:image/svg+xml'

describe('components/cardDetail/comment', () => {
    (window as any).store = mockMMStore
    const state = {
        users: {
            boardUsers: {[comment.modifiedBy]: {username: 'username_1'}},
        },
        teams: {
            current: {id: 'team_id'},
        },
    }
    const store = mockStateStore([], state)

    beforeEach(() => {
        jest.clearAllMocks()
        moment.now = () => {
            return dateFixed + (24 * 60 * 60 * 1000)
        }
    })

    afterEach(() => {
        moment.now = () => {
            return Number(new Date())
        }
    })

    test('return comment', () => {
        const {container} = render(wrapIntl(
            <ReduxProvider store={store}>
                <Comment
                    comment={comment}
                    userId={comment.modifiedBy}
                    userImageUrl={userImageUrl}
                    readonly={false}
                    canDelete={true}
                />
            </ReduxProvider>,
        ))
        const buttonElement = screen.getByRole('button', {name: 'menuwrapper'})
        userEvent.click(buttonElement)
        expect(container).toMatchSnapshot()
    })

    test('return comment readonly', () => {
        const {container} = render(wrapIntl(
            <ReduxProvider store={store}>
                <Comment
                    comment={comment}
                    userId={comment.modifiedBy}
                    userImageUrl={userImageUrl}
                    readonly={true}
                    canDelete={false}
                />
            </ReduxProvider>,
        ))
        expect(container).toMatchSnapshot()
    })

    test('return comment and delete comment', () => {
        const {container} = render(wrapIntl(
            <ReduxProvider store={store}>
                <Comment
                    comment={comment}
                    userId={comment.modifiedBy}
                    userImageUrl={userImageUrl}
                    readonly={false}
                    canDelete={true}
                />
            </ReduxProvider>,
        ))
        const buttonElement = screen.getByRole('button', {name: 'menuwrapper'})
        userEvent.click(buttonElement)
        expect(container).toMatchSnapshot()
        const buttonDelete = screen.getByRole('button', {name: 'Delete'})
        userEvent.click(buttonDelete)
        expect(mockedMutator.deleteBlock).toBeCalledTimes(1)
        expect(mockedMutator.deleteBlock).toBeCalledWith(comment)
    })

    test('return guest comment', () => {
        const localStore = mockStateStore([], {
            users: {
                boardUsers: {
                    [comment.modifiedBy]: {
                        username: 'username_1',
                        is_guest: true
                    }
                }
            },
            teams: {
                current: {id: 'team_id'},
            }
        })
        const {container} = render(wrapIntl(
            <ReduxProvider store={localStore}>
                <Comment
                    comment={comment}
                    userId={comment.modifiedBy}
                    userImageUrl={userImageUrl}
                    readonly={false}
                    canDelete={true}
                />
            </ReduxProvider>,
        ))
        const buttonElement = screen.getByRole('button', {name: 'menuwrapper'})
        userEvent.click(buttonElement)
        expect(container).toMatchSnapshot()
    })

    test('return guest comment readonly', () => {
        const localStore = mockStateStore([], {
            users: {
                boardUsers: {
                    [comment.modifiedBy]: {
                        username: 'username_1',
                        is_guest: true
                    }
                }
            },
            teams: {
                current: {id: 'team_id'},
            },
        })
        const {container} = render(wrapIntl(
            <ReduxProvider store={localStore}>
                <Comment
                    comment={comment}
                    userId={comment.modifiedBy}
                    userImageUrl={userImageUrl}
                    readonly={true}
                    canDelete={false}
                />
            </ReduxProvider>,
        ))
        expect(container).toMatchSnapshot()
    })

    test('return guest comment and delete comment', () => {
        const localStore = mockStateStore([], {
            users: {
                boardUsers: {
                    [comment.modifiedBy]: {
                        username: 'username_1',
                        is_guest: true
                    }
                }
            },
            teams: {
                current: {id: 'team_id'},
            },
        })
        const {container} = render(wrapIntl(
            <ReduxProvider store={localStore}>
                <Comment
                    comment={comment}
                    userId={comment.modifiedBy}
                    userImageUrl={userImageUrl}
                    readonly={false}
                    canDelete={true}
                />
            </ReduxProvider>,
        ))
        const buttonElement = screen.getByRole('button', {name: 'menuwrapper'})
        userEvent.click(buttonElement)
        expect(container).toMatchSnapshot()
        const buttonDelete = screen.getByRole('button', {name: 'Delete'})
        userEvent.click(buttonDelete)
        expect(mockedMutator.deleteBlock).toBeCalledTimes(1)
        expect(mockedMutator.deleteBlock).toBeCalledWith(comment)
    })

    describe('comment types and reply button', () => {
        const onReplyMock = jest.fn()

        afterEach(() => {
            onReplyMock.mockClear()
        })

        test('reply button is shown for comment type when not readonly and onReply is provided', () => {
            const {container} = render(wrapIntl(
                <ReduxProvider store={store}>
                    <Comment
                        comment={comment}
                        userId={comment.modifiedBy}
                        userImageUrl={userImageUrl}
                        readonly={false}
                        canDelete={true}
                        commentType='comment'
                        onReply={onReplyMock}
                    />
                </ReduxProvider>,
            ))

            const replyButton = container.querySelector('.comment-reply')
            expect(replyButton).toBeDefined()
            expect(replyButton?.textContent).toContain('Reply')
        })

        test('reply button is NOT shown for edits type', () => {
            const editComment = {...comment, id: 'edit_id', fields: {commentType: 'edits' as CommentType}}

            const {container} = render(wrapIntl(
                <ReduxProvider store={store}>
                    <Comment
                        comment={editComment}
                        userId={comment.modifiedBy}
                        userImageUrl={userImageUrl}
                        readonly={false}
                        canDelete={true}
                        commentType='edits'
                        onReply={onReplyMock}
                    />
                </ReduxProvider>,
            ))

            const replyButton = container.querySelector('.comment-reply')
            expect(replyButton).toBeNull()
        })

        test('reply button is NOT shown for bot type', () => {
            const botComment = {...comment, id: 'bot_id', fields: {commentType: 'bot' as CommentType}}

            const {container} = render(wrapIntl(
                <ReduxProvider store={store}>
                    <Comment
                        comment={botComment}
                        userId={comment.modifiedBy}
                        userImageUrl={userImageUrl}
                        readonly={false}
                        canDelete={true}
                        commentType='bot'
                        onReply={onReplyMock}
                    />
                </ReduxProvider>,
            ))

            const replyButton = container.querySelector('.comment-reply')
            expect(replyButton).toBeNull()
        })

        test('reply button is NOT shown when readonly', () => {
            const {container} = render(wrapIntl(
                <ReduxProvider store={store}>
                    <Comment
                        comment={comment}
                        userId={comment.modifiedBy}
                        userImageUrl={userImageUrl}
                        readonly={true}
                        canDelete={true}
                        commentType='comment'
                        onReply={onReplyMock}
                    />
                </ReduxProvider>,
            ))

            const replyButton = container.querySelector('.comment-reply')
            expect(replyButton).toBeNull()
        })

        test('reply button is NOT shown when onReply is not provided', () => {
            const {container} = render(wrapIntl(
                <ReduxProvider store={store}>
                    <Comment
                        comment={comment}
                        userId={comment.modifiedBy}
                        userImageUrl={userImageUrl}
                        readonly={false}
                        canDelete={true}
                        commentType='comment'
                    />
                </ReduxProvider>,
            ))

            const replyButton = container.querySelector('.comment-reply')
            expect(replyButton).toBeNull()
        })

        test('clicking reply button calls onReply with comment id and quoted text', () => {
            const commentWithText = {...comment, title: 'This is a comment with multiple lines\nAnd some more content'}

            const {container} = render(wrapIntl(
                <ReduxProvider store={store}>
                    <Comment
                        comment={commentWithText}
                        userId={comment.modifiedBy}
                        userImageUrl={userImageUrl}
                        readonly={false}
                        canDelete={true}
                        commentType='comment'
                        onReply={onReplyMock}
                    />
                </ReduxProvider>,
            ))

            const replyButton = container.querySelector('.comment-reply') as HTMLButtonElement
            replyButton.click()

            expect(onReplyMock).toHaveBeenCalledTimes(1)
            expect(onReplyMock).toHaveBeenCalledWith(commentWithText.id, '> This is a comment with multiple lines\n> And some more content')
        })
    })

    describe('backward compatibility', () => {
        test('comment without commentType field works correctly when treated as comment type', () => {
            const legacyComment = {...comment, fields: {}}

            const {container} = render(wrapIntl(
                <ReduxProvider store={store}>
                    <Comment
                        comment={legacyComment}
                        userId={comment.modifiedBy}
                        userImageUrl={userImageUrl}
                        readonly={false}
                        canDelete={true}
                        commentType='comment'
                        onReply={jest.fn()}
                    />
                </ReduxProvider>,
            ))

            expect(container).toBeDefined()
            expect(container.querySelector('.comment-reply')).toBeDefined()
        })
    })
})
