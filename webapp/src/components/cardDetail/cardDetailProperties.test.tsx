// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React from 'react'
import {render, screen} from '@testing-library/react'
import '@testing-library/jest-dom'

import configureStore from 'redux-mock-store'
import {Provider as ReduxProvider} from 'react-redux'

import {wrapIntl} from '../../testUtils'
import {TestBlockFactory} from '../../test/testBlockFactory'

import CardDetailProperties from './cardDetailProperties'

describe('components/cardDetail/CardDetailProperties', () => {
    const board = TestBlockFactory.createBoard()
    board.cardProperties = [
        {
            id: 'property_id_1',
            name: 'Owner',
            type: 'select',
            options: [
                {
                    color: 'propColorDefault',
                    id: 'property_value_id_1',
                    value: 'Jean-Luc Picard',
                },
                {
                    color: 'propColorDefault',
                    id: 'property_value_id_2',
                    value: 'William Riker',
                },
                {
                    color: 'propColorDefault',
                    id: 'property_value_id_3',
                    value: 'Deanna Troi',
                },
            ],
        },
        {
            id: 'property_id_2',
            name: 'MockStatus',
            type: 'number',
            options: [],
        },
    ]

    const card = TestBlockFactory.createCard(board)
    card.fields.properties.property_id_1 = 'property_value_id_1'
    card.fields.properties.property_id_2 = '1234'

    const state = {
        users: {
            me: {
                id: 'user_id_1',
            },
            myConfig: {
                onboardingTourStarted: {value: true},
                tourCategory: {value: 'card'},
                onboardingTourStep: {value: '1'},
            },
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
        cards: {
            cards: {
                [card.id]: card,
            },
            current: card.id,
        },
        clientConfig: {
            value: {},
        },
    }

    const mockStore = configureStore([])
    let store = mockStore(state)

    beforeEach(() => {
        store = mockStore(state)
    })

    function renderComponent() {
        const component = wrapIntl(
            <ReduxProvider store={store}>
                <CardDetailProperties
                    board={board!}
                    card={card}
                    readonly={false}
                />
            </ReduxProvider>,
        )

        return render(component)
    }

    it('should match snapshot', async () => {
        const {container} = renderComponent()
        expect(container).toMatchSnapshot()
    })

    it('should display all visible properties', () => {
        renderComponent()

        // Verify property names are displayed
        expect(screen.getByText('Owner')).toBeInTheDocument()
        expect(screen.getByText('MockStatus')).toBeInTheDocument()

        // Verify the select property value is displayed
        expect(screen.getByText('Jean-Luc Picard')).toBeInTheDocument()

        // Number property uses Editable component which stores value in state
        // The value '1234' is set in card.fields.properties.property_id_2
        expect(card.fields.properties.property_id_2).toBe('1234')
    })

    it('should not display "+ Add a property" button', () => {
        renderComponent()

        // Verify the "Add a property" button is not present
        const addButton = screen.queryByRole('button', {name: /add a property/i})
        expect(addButton).not.toBeInTheDocument()
    })

    it('should not display property menu (edit controls)', () => {
        const {container} = renderComponent()

        // Verify there are no property menu wrappers (the three-dot menu)
        const menuWrappers = container.querySelectorAll('.MenuWrapper')
        expect(menuWrappers.length).toBe(0)
    })

    it('should not allow property renaming via UI', () => {
        const {container} = renderComponent()

        // Verify there's no property name input field
        const propertyNameInput = container.querySelector('.PropertyMenu.menu-textbox')
        expect(propertyNameInput).not.toBeInTheDocument()
    })

    it('should display properties when readonly is false', () => {
        renderComponent()

        // Properties should be visible when not readonly
        expect(screen.getByText('Owner')).toBeInTheDocument()
        expect(screen.getByText('Jean-Luc Picard')).toBeInTheDocument()
    })

    it('should display properties when readonly is true', () => {
        const component = wrapIntl(
            <ReduxProvider store={store}>
                <CardDetailProperties
                    board={board!}
                    card={card}
                    readonly={true}
                />
            </ReduxProvider>,
        )

        render(component)

        // Properties should still be visible when readonly
        expect(screen.getByText('Owner')).toBeInTheDocument()
        expect(screen.getByText('Jean-Luc Picard')).toBeInTheDocument()
    })

    describe('hidden properties (hideIfEmpty)', () => {
        it('should hide empty properties with hideIfEmpty set', () => {
            const boardWithHiddenProps = TestBlockFactory.createBoard()
            boardWithHiddenProps.cardProperties = [
                {
                    id: 'visible_prop',
                    name: 'Visible Property',
                    type: 'text',
                    options: [],
                },
                {
                    id: 'hidden_prop',
                    name: 'Hidden Property',
                    type: 'text',
                    options: [],
                    hideIfEmpty: true,
                },
            ]

            const cardWithEmptyProps = TestBlockFactory.createCard(boardWithHiddenProps)
            cardWithEmptyProps.fields.properties = {
                visible_prop: 'has value',
                hidden_prop: '',
            }

            const stateWithHiddenProps = {
                ...state,
                boards: {
                    ...state.boards,
                    boards: {
                        [boardWithHiddenProps.id]: boardWithHiddenProps,
                    },
                    current: boardWithHiddenProps.id,
                },
                cards: {
                    ...state.cards,
                    cards: {
                        [cardWithEmptyProps.id]: cardWithEmptyProps,
                    },
                    current: cardWithEmptyProps.id,
                },
            }

            const storeWithHiddenProps = mockStore(stateWithHiddenProps)

            const component = wrapIntl(
                <ReduxProvider store={storeWithHiddenProps}>
                    <CardDetailProperties
                        board={boardWithHiddenProps}
                        card={cardWithEmptyProps}
                        readonly={false}
                    />
                </ReduxProvider>,
            )

            render(component)

            expect(screen.getByText('Visible Property')).toBeInTheDocument()
            expect(screen.queryByText('Hidden Property')).not.toBeInTheDocument()
        })

        it('should show "Display More" button when there are hidden properties', () => {
            const boardWithHiddenProps = TestBlockFactory.createBoard()
            boardWithHiddenProps.cardProperties = [
                {
                    id: 'visible_prop',
                    name: 'Visible Property',
                    type: 'text',
                    options: [],
                },
                {
                    id: 'hidden_prop',
                    name: 'Hidden Property',
                    type: 'text',
                    options: [],
                    hideIfEmpty: true,
                },
            ]

            const cardWithEmptyProps = TestBlockFactory.createCard(boardWithHiddenProps)
            cardWithEmptyProps.fields.properties = {
                visible_prop: 'has value',
                hidden_prop: '',
            }

            const stateWithHiddenProps = {
                ...state,
                boards: {
                    ...state.boards,
                    boards: {
                        [boardWithHiddenProps.id]: boardWithHiddenProps,
                    },
                    current: boardWithHiddenProps.id,
                },
                cards: {
                    ...state.cards,
                    cards: {
                        [cardWithEmptyProps.id]: cardWithEmptyProps,
                    },
                    current: cardWithEmptyProps.id,
                },
            }

            const storeWithHiddenProps = mockStore(stateWithHiddenProps)

            const component = wrapIntl(
                <ReduxProvider store={storeWithHiddenProps}>
                    <CardDetailProperties
                        board={boardWithHiddenProps}
                        card={cardWithEmptyProps}
                        readonly={false}
                    />
                </ReduxProvider>,
            )

            render(component)

            const displayMoreButton = screen.getByText(/-- Display More --/i)
            expect(displayMoreButton).toBeInTheDocument()
        })
    })
})
