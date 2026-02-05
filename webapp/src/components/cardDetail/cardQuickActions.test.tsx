// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom'
import {act, render} from '@testing-library/react'
import React from 'react'
import {Provider as ReduxProvider} from 'react-redux'

import {TestBlockFactory} from '../../test/testBlockFactory'
import {mockDOM, mockStateStore, wrapIntl} from '../../testUtils'

import CardQuickActions from './cardQuickActions'

beforeAll(() => {
    mockDOM()
})

describe('components/cardDetail/CardQuickActions', () => {
    const board = TestBlockFactory.createBoard()
    board.id = 'boardId'

    const card = TestBlockFactory.createCard(board)
    card.id = 'cardId'
    card.fields.properties = {
        'status-prop-id': 'waiting',
    }

    const me = {
        id: 'user-id-1',
        username: 'testuser',
        email: 'test@example.com',
    }

    const state = {
        users: {
            me,
            boardUsers: {},
        },
        teams: {
            current: {id: 'team-id'},
        },
        boards: {
            current: board.id,
            boards: {
                [board.id]: board,
            },
            myBoardMemberships: {
                [board.id]: {userId: 'user-id-1', schemeAdmin: true},
            },
        },
    }

    const store = mockStateStore([], state)

    const quickActions = [
        {
            id: 'action-1',
            name: 'Start Work',
            style: {color: 'propColorRed'},
            confirmRequired: false,
            confirmText: '',
            conditions: [
                {
                    propertyId: 'status-prop-id',
                    operator: 'in' as const,
                    values: ['waiting'],
                },
            ],
            actions: [
                {
                    type: 'setProperty' as const,
                    propertyId: 'status-prop-id',
                    value: 'in-progress',
                },
            ],
        },
        {
            id: 'action-2',
            name: 'Complete',
            style: {color: 'propColorGreen'},
            confirmRequired: false,
            confirmText: '',
            conditions: [
                {
                    propertyId: 'status-prop-id',
                    operator: 'in' as const,
                    values: ['in-progress'],
                },
            ],
            actions: [
                {
                    type: 'setProperty' as const,
                    propertyId: 'status-prop-id',
                    value: 'done',
                },
            ],
        },
    ]

    test('should render null when readonly is true', async () => {
        board.properties = {quickActions}

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={true}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        expect(container).toBeEmptyDOMElement()
    })

    test('should render null when me is null', async () => {
        const stateWithoutMe = {
            ...state,
            users: {
                me: null,
                boardUsers: {},
            },
        }
        const storeWithoutMe = mockStateStore([], stateWithoutMe)

        board.properties = {quickActions}

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={storeWithoutMe}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        expect(container).toBeEmptyDOMElement()
    })

    test('should render null when board has no quick actions', async () => {
        board.properties = {}

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        expect(container).toBeEmptyDOMElement()
    })

    test('should render null when no actions match conditions', async () => {
        board.properties = {quickActions}

        // Change card status so no conditions match
        card.fields.properties = {
            'status-prop-id': 'done',
        }

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        expect(container).toBeEmptyDOMElement()
    })

    test('should render quick actions section with matching actions', async () => {
        board.properties = {quickActions}
        card.fields.properties = {
            'status-prop-id': 'waiting',
        }

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        expect(container).not.toBeEmptyDOMElement()
        expect(container!.querySelector('.CardQuickActions')).toBeInTheDocument()

        // Should show title
        const title = container!.querySelector('.CardQuickActions__title')
        expect(title).toBeInTheDocument()

        // Should show the "Start Work" button (matching action)
        const buttons = container!.querySelectorAll('.QuickActionButton')
        expect(buttons.length).toBe(1)
        expect(buttons[0]).toHaveTextContent('Start Work')
    })

    test('should render all matching actions', async () => {
        // Create quick actions that will both match
        const matchingActions = [
            {
                id: 'action-1',
                name: 'Start Work',
                style: {color: 'propColorRed'},
                confirmRequired: false,
                confirmText: '',
                conditions: [
                    {
                        propertyId: 'status-prop-id',
                        operator: 'in' as const,
                        values: ['waiting'],
                    },
                ],
                actions: [
                    {
                        type: 'setProperty' as const,
                        propertyId: 'status-prop-id',
                        value: 'in-progress',
                    },
                ],
            },
            {
                id: 'action-2',
                name: 'Add Comment',
                style: {color: 'propColorBlue'},
                confirmRequired: false,
                confirmText: '',
                conditions: [
                    {
                        propertyId: 'status-prop-id',
                        operator: 'in' as const,
                        values: ['waiting', 'in-progress'],
                    },
                ],
                actions: [
                    {
                        type: 'addComment' as const,
                        text: 'Processing',
                    },
                ],
            },
        ]

        board.properties = {quickActions: matchingActions}
        card.fields.properties = {
            'status-prop-id': 'waiting',
        }

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        const buttons = container!.querySelectorAll('.QuickActionButton')
        expect(buttons.length).toBe(2)
        expect(buttons[0]).toHaveTextContent('Start Work')
        expect(buttons[1]).toHaveTextContent('Add Comment')
    })

    test('should render action with no conditions', async () => {
        const actionWithoutConditions = [
            {
                id: 'action-1',
                name: 'Always Show',
                style: {color: 'propColorDefault'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [
                    {
                        type: 'addComment' as const,
                        text: 'Test',
                    },
                ],
            },
        ]

        board.properties = {quickActions: actionWithoutConditions}

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        const buttons = container!.querySelectorAll('.QuickActionButton')
        expect(buttons.length).toBe(1)
        expect(buttons[0]).toHaveTextContent('Always Show')
    })

    test('should filter actions based on conditions correctly', async () => {
        board.properties = {quickActions}
        card.fields.properties = {
            'status-prop-id': 'in-progress',
        }

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        // Only "Complete" action should be visible (status is 'in-progress')
        const buttons = container!.querySelectorAll('.QuickActionButton')
        expect(buttons.length).toBe(1)
        expect(buttons[0]).toHaveTextContent('Complete')
    })

    test('should match snapshot', async () => {
        board.properties = {quickActions}
        card.fields.properties = {
            'status-prop-id': 'waiting',
        }

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with multiple actions', async () => {
        const multipleActions = [
            {
                id: 'action-1',
                name: 'Action 1',
                style: {color: 'propColorRed'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [
                    {
                        type: 'addComment' as const,
                        text: 'Test 1',
                    },
                ],
            },
            {
                id: 'action-2',
                name: 'Action 2',
                style: {color: 'propColorBlue'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [
                    {
                        type: 'addComment' as const,
                        text: 'Test 2',
                    },
                ],
            },
            {
                id: 'action-3',
                name: 'Action 3',
                style: {color: 'propColorGreen'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [
                    {
                        type: 'addComment' as const,
                        text: 'Test 3',
                    },
                ],
            },
        ]

        board.properties = {quickActions: multipleActions}

        let container: Element | DocumentFragment | null = null
        await act(async () => {
            const result = render(wrapIntl(
                <ReduxProvider store={store}>
                    <CardQuickActions
                        board={board}
                        card={card}
                        readonly={false}
                    />
                </ReduxProvider>,
            ))
            container = result.container
        })

        expect(container).toMatchSnapshot()
    })
})
