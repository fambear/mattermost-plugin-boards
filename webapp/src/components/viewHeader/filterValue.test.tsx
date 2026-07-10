// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react'
import {Provider as ReduxProvider} from 'react-redux'

import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'

import {mocked} from 'jest-mock'

import {FilterClause} from '../../blocks/filterClause'
import {IPropertyTemplate} from '../../blocks/board'

import {TestBlockFactory} from '../../test/testBlockFactory'

import {wrapIntl, mockStateStore} from '../../testUtils'

import mutator from '../../mutator'
import propsRegistry from '../../properties'

import FilterValue from './filterValue'

jest.mock('../../mutator')
const mockedMutator = mocked(mutator, true)

const board = TestBlockFactory.createBoard()
const activeView = TestBlockFactory.createBoardView(board)
const state = {
    users: {
        me: {
            id: 'user-id-1',
            username: 'username_1',
        },
    },
}
const store = mockStateStore([], state)
const filter: FilterClause = {
    propertyId: '1',
    condition: 'includes',
    values: ['Status'],
}

describe('components/viewHeader/filterValue', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        board.cardProperties[0].options = [{id: 'Status', value: 'Status', color: ''}]
        activeView.fields.filter.filters = [filter]
    })
    test('return filterValue', () => {
        const {container} = render(
            wrapIntl(
                <ReduxProvider store={store}>
                    <FilterValue
                        view={activeView}
                        filter={filter}
                        template={board.cardProperties[0]}
                        propertyType={propsRegistry.get(board.cardProperties[0].type)}
                    />
                </ReduxProvider>,
            ),
        )
        const buttonElement = screen.getByRole('button', {name: 'menuwrapper'})
        userEvent.click(buttonElement)
        expect(container).toMatchSnapshot()
    })
    test('return filterValue and click Status', () => {
        const {container} = render(
            wrapIntl(
                <ReduxProvider store={store}>
                    <FilterValue
                        view={activeView}
                        filter={filter}
                        template={board.cardProperties[0]}
                        propertyType={propsRegistry.get(board.cardProperties[0].type)}
                    />
                </ReduxProvider>,
            ),
        )
        const buttonElement = screen.getByRole('button', {name: 'menuwrapper'})
        userEvent.click(buttonElement)
        const switchStatus = screen.getAllByText('Status')[1]
        userEvent.click(switchStatus)
        expect(mockedMutator.changeViewFilter).toBeCalledTimes(1)
        expect(container).toMatchSnapshot()
    })
    test('return filterValue and click Status with Status not in filter', () => {
        filter.values = ['test']
        activeView.fields.filter.filters = [filter]
        const {container} = render(
            wrapIntl(
                <ReduxProvider store={store}>
                    <FilterValue
                        view={activeView}
                        filter={filter}
                        template={board.cardProperties[0]}
                        propertyType={propsRegistry.get(board.cardProperties[0].type)}
                    />
                </ReduxProvider>,
            ),
        )
        const buttonElement = screen.getByRole('button', {name: 'menuwrapper'})
        userEvent.click(buttonElement)
        const switchStatus = screen.getAllByText('Status')[0]
        userEvent.click(switchStatus)
        expect(mockedMutator.changeViewFilter).toBeCalledTimes(1)
        expect(container).toMatchSnapshot()
    })
    test('return filterValue and verify that menu is not closed after clicking on the item', () => {
        filter.values = []
        activeView.fields.filter.filters = [filter]
        render(
            wrapIntl(
                <ReduxProvider store={store}>
                    <FilterValue
                        view={activeView}
                        filter={filter}
                        template={board.cardProperties[0]}
                        propertyType={propsRegistry.get(board.cardProperties[0].type)}
                    />
                </ReduxProvider>,
            ),
        )
        const buttonElement = screen.getByRole('button', {name: '(empty)'})
        userEvent.click(buttonElement)

        const switchStatus = screen.getByRole('button', {name: 'Status'})
        userEvent.click(switchStatus)
        expect(switchStatus).toBeInTheDocument()
    })

    test('return date filter value', () => {
        const propertyTemplate: IPropertyTemplate = {
            id: 'datePropertyID',
            name: 'My Date Property',
            type: 'date',
            options: [],
        }
        board.cardProperties.push(propertyTemplate)

        const dateFilter: FilterClause = {
            propertyId: 'datePropertyID',
            condition: 'is',
            values: [],
        }

        // filter.values = []
        activeView.fields.filter.filters = [dateFilter]
        const {container} = render(
            wrapIntl(
                <ReduxProvider store={store}>
                    <FilterValue
                        view={activeView}
                        filter={filter}
                        template={propertyTemplate}
                        propertyType={propsRegistry.get(propertyTemplate.type)}
                    />
                </ReduxProvider>,
            ),
        )
        expect(container).toMatchSnapshot()

        const buttonElement = screen.getByRole('button', {name: 'Empty'})
        userEvent.click(buttonElement)

        // make sure modal is displayed
        const clearButton = screen.getByRole('button', {name: 'Clear'})
        expect(clearButton).toBeInTheDocument()
    })

    describe('text filter value', () => {
        const textTemplate: IPropertyTemplate = {
            id: 'textPropertyID',
            name: 'My Text Property',
            type: 'text',
            options: [],
        }

        const renderTextFilter = (textFilter: FilterClause) => {
            board.cardProperties.push(textTemplate)
            activeView.fields.filter.filters = [textFilter]
            render(
                wrapIntl(
                    <ReduxProvider store={store}>
                        <FilterValue
                            view={activeView}
                            filter={textFilter}
                            template={textTemplate}
                            propertyType={propsRegistry.get(textTemplate.type)}
                        />
                    </ReduxProvider>,
                ),
            )
            return screen.getByPlaceholderText('filter text')
        }

        const savedValues = (): string[] => {
            const newFilterGroup = mockedMutator.changeViewFilter.mock.calls[0][3]
            return (newFilterGroup.filters[0] as FilterClause).values
        }

        test('saves no values when the input is blurred while empty, so the clause stays inactive', () => {
            const input = renderTextFilter({propertyId: 'textPropertyID', condition: 'contains', values: []})
            fireEvent.blur(input)
            expect(mockedMutator.changeViewFilter).toBeCalledTimes(1)
            expect(savedValues()).toEqual([])
        })

        test('saves the typed text', () => {
            const input = renderTextFilter({propertyId: 'textPropertyID', condition: 'contains', values: []})
            userEvent.type(input, 'Red')
            fireEvent.blur(input)
            expect(savedValues()).toEqual(['Red'])
        })
    })
})
