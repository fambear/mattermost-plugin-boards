// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


// Polyfill DOMRect for jsdom
if (typeof globalThis.DOMRect === 'undefined') {
    globalThis.DOMRect = class DOMRect {
        x: number
        y: number
        width: number
        height: number
        top: number
        right: number
        bottom: number
        left: number
        constructor(x = 0, y = 0, width = 0, height = 0) {
            this.x = x
            this.y = y
            this.width = width
            this.height = height
            this.top = y
            this.right = x + width
            this.bottom = y + height
            this.left = x
        }
        toJSON() {
            return {x: this.x, y: this.y, width: this.width, height: this.height, top: this.top, right: this.right, bottom: this.bottom, left: this.left}
        }
    } as any
}

import '@testing-library/jest-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import React from 'react'
import {Provider as ReduxProvider} from 'react-redux'
import {mocked} from 'jest-mock'

import mutator from '../mutator'
import {IUser} from '../user'
import {Utils} from '../utils'
import octoClient from '../octoClient'
import {TestBlockFactory} from '../test/testBlockFactory'
import {mockDOM, mockStateStore, wrapDNDIntl} from '../testUtils'

import CardDialog from './cardDialog'

jest.mock('../mutator')
jest.mock('../octoClient')
jest.mock('../utils')
jest.mock('draft-js/lib/generateRandomKey', () => () => '123')

// Mock GitHub integration components to avoid snapshot changes
jest.mock('./cardDetail/githubIssueLink', () => () => null)
jest.mock('./cardDetail/githubBranchCreate', () => () => null)
jest.mock('./cardDetail/githubPRStatus', () => () => null)

const mockedUtils = mocked(Utils, true)
const mockedMutator = mocked(mutator, true)
const mockedOctoClient = mocked(octoClient, true)
mockedUtils.createGuid.mockReturnValue('test-id')
mockedUtils.isFocalboardPlugin.mockReturnValue(true)

beforeAll(() => {
    mockDOM()
})
describe('components/cardDialog', () => {
    const originalIntersectionObserver = window.IntersectionObserver
    const board = TestBlockFactory.createBoard()
    board.cardProperties = []
    board.id = 'test-id'
    board.teamId = 'team-id'
    const boardView = TestBlockFactory.createBoardView(board)
    boardView.id = board.id
    const card = TestBlockFactory.createCard(board)
    card.id = board.id
    card.createdBy = 'user-id-1'

    const state = {
        clientConfig: {
            value: {},
        },
        comments: {
            comments: {},
            commentsByCard: {},
        },
        contents: {
            contents: {},
            contentsByCard: {},
        },
        cards: {
            cards: {
                [card.id]: card,
            },
            current: card.id,
        },
        teams: {
            current: {id: 'team-id'},
        },
        boards: {
            boards: {
                [board.id]: board,
            },
            current: board.id,
            myBoardMemberships: {
                [board.id]: {userId: 'user_id_1', schemeAdmin: true},
            },
        },
        users: {
            boardUsers: {
                1: {username: 'abc'},
                2: {username: 'd'},
                3: {username: 'e'},
                4: {username: 'f'},
                5: {username: 'g'},
            },
            blockSubscriptions: [],
        },
    }

    mockedOctoClient.searchTeamUsers.mockResolvedValue(Object.values(state.users.boardUsers) as IUser[])
    const store = mockStateStore([], state)
    beforeEach(() => {
        jest.clearAllMocks()
    })
    afterEach(() => {
        Object.defineProperty(window, 'IntersectionObserver', {
            configurable: true,
            writable: true,
            value: originalIntersectionObserver,
        })
    })

    const getRect = (rect: Partial<DOMRect> = {}): DOMRect => {
        const x = rect.x ?? rect.left ?? 0
        const y = rect.y ?? rect.top ?? 0
        const width = rect.width ?? (rect.right !== undefined ? rect.right - x : 100)
        const height = rect.height ?? (rect.bottom !== undefined ? rect.bottom - y : 40)
        return new DOMRect(x, y, width, height)
    }

    const createIntersectionObserverEntry = (isIntersecting: boolean): IntersectionObserverEntry => {
        return {
            boundingClientRect: getRect(),
            intersectionRatio: isIntersecting ? 1 : 0,
            intersectionRect: getRect(),
            isIntersecting,
            rootBounds: getRect(),
            target: document.createElement('div'),
            time: 0,
        }
    }

    const createIntersectionObserverMock = (
        callbackRef: {current?: IntersectionObserverCallback},
        observe = jest.fn(),
    ): IntersectionObserver => {
        const observer: IntersectionObserver = {
            observe,
            disconnect: jest.fn(),
            unobserve: jest.fn(),
            takeRecords: jest.fn(() => []),
            root: null,
            rootMargin: '0px',
            thresholds: [0],
        }

        Object.defineProperty(window, 'IntersectionObserver', {
            configurable: true,
            writable: true,
            value: jest.fn((callback: IntersectionObserverCallback) => {
                callbackRef.current = callback
                return observer
            }),
        })

        return observer
    }

    test('should match snapshot', async () => {
        let container
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })
        expect(container).toMatchSnapshot()
    })
    test('should match snapshot without permissions', async () => {
        let container
        const localStore = mockStateStore([], {...state, teams: {current: undefined}})
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={localStore}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })
        expect(container).toMatchSnapshot()
    })
    test('return a cardDialog readonly', async () => {
        let container
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={true}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })
        expect(container).toMatchSnapshot()
    })
    test('return cardDialog and do a close action', async () => {
        const closeFn = jest.fn()
        await act(async () => {
            render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={closeFn}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
        })
        const buttonElement = screen.getByRole('button', {name: 'Close dialog'})
        await act(async () => {
            userEvent.click(buttonElement)
        })
        await new Promise((resolve) => setTimeout(resolve, 100))
        expect(closeFn).toBeCalledTimes(1)
    })
    test('return cardDialog menu content', async () => {
        let container
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })
        const buttonMenu = screen.getAllByRole('button', {name: 'menuwrapper'})[0]
        userEvent.click(buttonMenu)
        expect(container).toMatchSnapshot()
    })
    test('return cardDialog menu content and verify delete action', async () => {
        await act(async () => {
            render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
        })
        const buttonMenu = screen.getAllByRole('button', {name: 'menuwrapper'})[0]
        userEvent.click(buttonMenu)
        const buttonDelete = screen.getByRole('button', {name: 'Delete'})
        userEvent.click(buttonDelete)

        const confirmDialog = screen.getByTitle('Confirmation Dialog Box')
        expect(confirmDialog).toBeDefined()

        const confirmButton = screen.getByTitle('Delete')
        expect(confirmButton).toBeDefined()

        //click delete button
        userEvent.click(confirmButton!)

        // should be called once on confirming delete
        expect(mockedMutator.deleteBlock).toBeCalledTimes(1)
    })

    test('return cardDialog menu content and cancel delete confirmation do nothing', async () => {
        let container
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        const buttonMenu = screen.getAllByRole('button', {name: 'menuwrapper'})[0]
        userEvent.click(buttonMenu)
        const buttonDelete = screen.getByRole('button', {name: 'Delete'})
        userEvent.click(buttonDelete)

        const confirmDialog = screen.getByTitle('Confirmation Dialog Box')
        expect(confirmDialog).toBeDefined()

        const cancelButton = screen.getByTitle('Cancel')
        expect(cancelButton).toBeDefined()

        //click delete button
        userEvent.click(cancelButton!)

        // should do nothing  on cancel delete dialog
        expect(container).toMatchSnapshot()
    })

    test('return cardDialog menu content and do a New template from card', async () => {
        await act(async () => {
            render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
        })
        const buttonMenu = screen.getAllByRole('button', {name: 'menuwrapper'})[0]
        userEvent.click(buttonMenu)
        const buttonTemplate = screen.getByRole('button', {name: 'New template from card'})
        userEvent.click(buttonTemplate)
        expect(mockedMutator.duplicateCard).toBeCalledTimes(1)
    })

    test('return cardDialog menu content and do a copy Link', async () => {
        await act(async () => {
            render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
        })
        const buttonMenu = screen.getAllByRole('button', {name: 'menuwrapper'})[0]
        userEvent.click(buttonMenu)
        const buttonCopy = screen.getByRole('button', {name: 'Copy link'})
        userEvent.click(buttonCopy)
        expect(mockedUtils.copyTextToClipboard).toBeCalledTimes(1)
    })

    test('already following card', async () => {
        // simply doing {...state} gives a TypeScript error
        // when you try updating it's values.
        const newState = JSON.parse(JSON.stringify(state))
        newState.users.blockSubscriptions = [{blockId: card.id}]
        newState.clientConfig = {
            value: {},
        }

        const newStore = mockStateStore([], newState)

        let container
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={newStore}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[card]}
                        cardId={card.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })
        expect(container).toMatchSnapshot()
    })

    test('limited card shows hidden view (no toolbar)', async () => {
        // simply doing {...state} gives a TypeScript error
        // when you try updating it's values.
        const newState = JSON.parse(JSON.stringify(state))
        const limitedCard = {...card, limited: true}
        newState.cards = {
            cards: {
                [limitedCard.id]: limitedCard,
            },
            current: limitedCard.id,
        }

        const newStore = mockStateStore([], newState)

        let container
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={newStore}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[limitedCard]}
                        cardId={limitedCard.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })
        expect(container).toMatchSnapshot()
    })

    test('shows and hides sticky card context with IntersectionObserver', async () => {
        const stickyCard = {
            ...card,
            code: 'IT-610',
            title: 'Sticky toolbar title',
        }
        const localState = {
            ...state,
            cards: {
                ...state.cards,
                cards: {
                    ...state.cards.cards,
                    [stickyCard.id]: stickyCard,
                },
            },
        }
        const localStore = mockStateStore([], localState)

        const intersectionObserverCallbackRef: {current?: IntersectionObserverCallback} = {}
        const observeMock = jest.fn()
        const mockObserver = createIntersectionObserverMock(intersectionObserverCallbackRef, observeMock)

        let container: any
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={localStore}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[stickyCard]}
                        cardId={stickyCard.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        expect(observeMock).toHaveBeenCalledTimes(1)
        expect(container.querySelector('.cardDialog__toolbar-card-context')).not.toBeInTheDocument()

        act(() => {
            intersectionObserverCallbackRef.current?.(
                [createIntersectionObserverEntry(false)],
                mockObserver,
            )
        })

        const stickyContext = container.querySelector('.cardDialog__toolbar-card-context')
        expect(stickyContext).toBeInTheDocument()
        expect(stickyContext?.querySelector('.card-code-text')?.textContent).toBe(stickyCard.code)
        expect(stickyContext?.querySelector('.cardDialog__toolbar-card-title')?.textContent).toBe(stickyCard.title)

        act(() => {
            intersectionObserverCallbackRef.current?.(
                [createIntersectionObserverEntry(true)],
                mockObserver,
            )
        })

        expect(container.querySelector('.cardDialog__toolbar-card-context')).not.toBeInTheDocument()
    })

    test('fallback sticky context visibility works without IntersectionObserver', async () => {
        const stickyCard = {
            ...card,
            code: 'IT-610',
            title: 'Sticky toolbar title',
        }
        const localState = {
            ...state,
            cards: {
                ...state.cards,
                cards: {
                    ...state.cards.cards,
                    [stickyCard.id]: stickyCard,
                },
            },
        }
        const localStore = mockStateStore([], localState)
        Object.defineProperty(window, 'IntersectionObserver', {
            configurable: true,
            writable: true,
            value: undefined,
        })

        let container: any
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={localStore}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[stickyCard]}
                        cardId={stickyCard.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        const dialog = container.querySelector('.dialog')
        const toolbar = container.querySelector('.toolbar')
        const cardIdentityElement = container.querySelector('.card-code-header')?.parentElement

        expect(dialog).toBeTruthy()
        expect(toolbar).toBeTruthy()
        expect(cardIdentityElement).toBeTruthy()
        if (!dialog || !toolbar || !cardIdentityElement) {
            throw new Error('Expected dialog, toolbar, and cardIdentityElement to be present in DOM')
        }

        const toolbarRectSpy = jest.spyOn(toolbar, 'getBoundingClientRect').mockReturnValue(getRect({top: 0, bottom: 64}))
        const identityRectSpy = jest.spyOn(cardIdentityElement, 'getBoundingClientRect').mockReturnValue(getRect({top: 32, bottom: 72}))

        try {
            act(() => {
                dialog.dispatchEvent(new Event('scroll'))
            })

            expect(container.querySelector('.cardDialog__toolbar-card-context')).toBeInTheDocument()

            identityRectSpy.mockReturnValue(getRect({top: 120, bottom: 160}))
            act(() => {
                window.dispatchEvent(new Event('resize'))
            })

            expect(container.querySelector('.cardDialog__toolbar-card-context')).not.toBeInTheDocument()
        } finally {
            toolbarRectSpy.mockRestore()
            identityRectSpy.mockRestore()
        }
    })

    test('does not render sticky card context when card code and title are missing', async () => {
        const intersectionObserverCallbackRef: {current?: IntersectionObserverCallback} = {}
        const mockObserver = createIntersectionObserverMock(intersectionObserverCallbackRef)

        const emptyIdentityCard = {
            ...card,
            code: '',
            title: '',
        }

        const localState = {
            ...state,
            cards: {
                ...state.cards,
                cards: {
                    ...state.cards.cards,
                    [emptyIdentityCard.id]: emptyIdentityCard,
                },
            },
        }
        const localStore = mockStateStore([], localState)

        let container: any
        await act(async () => {
            const result = render(wrapDNDIntl(
                <ReduxProvider store={localStore}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[emptyIdentityCard]}
                        cardId={emptyIdentityCard.id}
                        onClose={jest.fn()}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        act(() => {
            intersectionObserverCallbackRef.current?.(
                [createIntersectionObserverEntry(false)],
                mockObserver,
            )
        })

        expect(container.querySelector('.cardDialog__toolbar-card-context')).not.toBeInTheDocument()
    })

    test('should cleanup empty blocks on close', async () => {
        const textBlock1 = TestBlockFactory.createText(card)
        textBlock1.id = 'text-block-1'
        textBlock1.title = 'Some text'

        const textBlock2 = TestBlockFactory.createText(card)
        textBlock2.id = 'text-block-2'
        textBlock2.title = ''

        const textBlock3 = TestBlockFactory.createText(card)
        textBlock3.id = 'text-block-3'
        textBlock3.title = '   '

        const dividerBlock = TestBlockFactory.createDivider(card)
        dividerBlock.id = 'divider-block'

        const testCard = {...card}
        testCard.fields = {
            ...testCard.fields,
            contentOrder: [textBlock1.id, textBlock2.id, textBlock3.id, dividerBlock.id],
        }

        const newState = {
            ...state,
            cards: {
                ...state.cards,
                cards: {
                    ...state.cards.cards,
                    [testCard.id]: testCard,
                },
            },
            contents: {
                contents: {
                    [textBlock1.id]: textBlock1,
                    [textBlock2.id]: textBlock2,
                    [textBlock3.id]: textBlock3,
                    [dividerBlock.id]: dividerBlock,
                },
                contentsByCard: {
                    [testCard.id]: [textBlock1, textBlock2, textBlock3, dividerBlock],
                },
            },
        }

        const newStore = mockStateStore([], newState)
        const onClose = jest.fn()

        await act(async () => {
            render(wrapDNDIntl(
                <ReduxProvider store={newStore}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[testCard]}
                        cardId={testCard.id}
                        onClose={onClose}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
        })

        const closeButton = screen.getByRole('button', {name: 'Close dialog'})
        await act(async () => {
            userEvent.click(closeButton)
            await new Promise((resolve) => setTimeout(resolve, 100))
        })

        expect(mockedMutator.deleteBlock).toHaveBeenCalledWith(textBlock2, 'cleanup empty blocks')
        expect(mockedMutator.deleteBlock).toHaveBeenCalledWith(textBlock3, 'cleanup empty blocks')
        expect(mockedMutator.deleteBlock).not.toHaveBeenCalledWith(textBlock1, expect.anything())
        expect(mockedMutator.deleteBlock).not.toHaveBeenCalledWith(dividerBlock, expect.anything())
        expect(onClose).toHaveBeenCalled()
    })

    test('should not cleanup divider blocks even if empty', async () => {
        const dividerBlock1 = TestBlockFactory.createDivider(card)
        dividerBlock1.id = 'divider-block-1'

        const dividerBlock2 = TestBlockFactory.createDivider(card)
        dividerBlock2.id = 'divider-block-2'

        const testCard = {...card}
        testCard.fields = {
            ...testCard.fields,
            contentOrder: [dividerBlock1.id, dividerBlock2.id],
        }

        const newState = {
            ...state,
            cards: {
                ...state.cards,
                cards: {
                    ...state.cards.cards,
                    [testCard.id]: testCard,
                },
            },
            contents: {
                contents: {
                    [dividerBlock1.id]: dividerBlock1,
                    [dividerBlock2.id]: dividerBlock2,
                },
                contentsByCard: {
                    [testCard.id]: [dividerBlock1, dividerBlock2],
                },
            },
        }

        const newStore = mockStateStore([], newState)
        const onClose = jest.fn()

        await act(async () => {
            render(wrapDNDIntl(
                <ReduxProvider store={newStore}>
                    <CardDialog
                        board={board}
                        activeView={boardView}
                        views={[boardView]}
                        cards={[testCard]}
                        cardId={testCard.id}
                        onClose={onClose}
                        showCard={jest.fn()}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
        })

        const closeButton = screen.getByRole('button', {name: 'Close dialog'})
        await act(async () => {
            userEvent.click(closeButton)
            await new Promise((resolve) => setTimeout(resolve, 100))
        })

        expect(mockedMutator.deleteBlock).not.toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
    })
})
