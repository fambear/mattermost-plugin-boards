// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {TestBlockFactory} from '../../test/testBlockFactory'
import {mockDOM, wrapIntl} from '../../testUtils'
import {QuickActionCondition} from '../../blocks/quickAction'

import QuickActionConditionRow from './quickActionConditionRow'

beforeAll(() => {
    mockDOM()
})

describe('pages/boardSettingsPage/QuickActionConditionRow', () => {
    const board = TestBlockFactory.createBoard()

    // Add card properties to the board for testing
    board.cardProperties = [
        {
            id: 'status-prop-id',
            name: 'Status',
            type: 'select',
            options: [
                {id: 'opt-1', value: 'Todo', color: 'propColorDefault'},
                {id: 'opt-2', value: 'In Progress', color: 'propColorBlue'},
                {id: 'opt-3', value: 'Done', color: 'propColorGreen'},
            ],
        },
        {
            id: 'assignee-prop-id',
            name: 'Assignee',
            type: 'person',
            options: [],
        },
        {
            id: 'priority-prop-id',
            name: 'Priority',
            type: 'number',
            options: [],
        },
        {
            id: 'due-date-prop-id',
            name: 'Due Date',
            type: 'date',
            options: [],
        },
        {
            id: 'description-prop-id',
            name: 'Description',
            type: 'text',
            options: [],
        },
        {
            id: 'approved-prop-id',
            name: 'Approved',
            type: 'checkbox',
            options: [],
        },
    ]

    const mockOnChange = jest.fn()
    const mockOnRemove = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('should render condition row with remove button', () => {
        const condition: QuickActionCondition = {
            propertyId: '',
            operator: 'in',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(container.querySelector('.QuickActionConditionRow')).toBeInTheDocument()
        expect(container.querySelector('.QuickActionConditionRow__remove-btn')).toBeInTheDocument()
    })

    test('should render property selector when no property is selected', () => {
        const condition: QuickActionCondition = {
            propertyId: '',
            operator: 'in',
            values: [],
        }

        render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(screen.getByText('Select property')).toBeInTheDocument()
    })

    test('should render selected property name', () => {
        const condition: QuickActionCondition = {
            propertyId: 'status-prop-id',
            operator: 'in',
            values: ['opt-1'],
        }

        render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(screen.getByText('Status')).toBeInTheDocument()
    })

    test('should call onRemove when remove button is clicked', async () => {
        const condition: QuickActionCondition = {
            propertyId: 'status-prop-id',
            operator: 'in',
            values: ['opt-1'],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        const removeButton = container.querySelector('.QuickActionConditionRow__remove-btn')!

        await act(async () => {
            await userEvent.click(removeButton)
        })

        expect(mockOnRemove).toHaveBeenCalledTimes(1)
    })

    test('should show operator selector after property is selected', () => {
        const condition: QuickActionCondition = {
            propertyId: 'status-prop-id',
            operator: 'in',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Operator button should be present
        const operatorButtons = container.querySelectorAll('.QuickActionConditionRow__operator-select')
        expect(operatorButtons.length).toBeGreaterThan(0)
    })

    test('should show value input for select property with in operator', () => {
        const condition: QuickActionCondition = {
            propertyId: 'status-prop-id',
            operator: 'in',
            values: ['opt-1'],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Value input should be shown
        const valueButtons = container.querySelectorAll('button')
        const hasValueButton = Array.from(valueButtons).some(btn => btn.textContent?.includes('Todo'))
        expect(hasValueButton).toBe(true)
    })

    test('should not show value input for empty operator', () => {
        const condition: QuickActionCondition = {
            propertyId: 'status-prop-id',
            operator: 'empty',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Value input should not be shown for empty operator
        // The component only shows 3 elements max when no value: remove button, property select, operator select
        const buttons = container.querySelectorAll('button')
        // We expect remove button, property selector, and operator selector
        expect(buttons.length).toBeLessThanOrEqual(3)
    })

    test('should not show value input for not empty operator', () => {
        const condition: QuickActionCondition = {
            propertyId: 'status-prop-id',
            operator: 'not empty',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Value input should not be shown for not empty operator
        const buttons = container.querySelectorAll('button')
        expect(buttons.length).toBeLessThanOrEqual(3)
    })

    test('should show text input for text property', () => {
        const condition: QuickActionCondition = {
            propertyId: 'description-prop-id',
            operator: 'contains',
            values: ['test'],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Should have editable input for text
        const editables = container.querySelectorAll('.Editable')
        expect(editables.length).toBeGreaterThan(0)
    })

    test('should show number input for number property', () => {
        const condition: QuickActionCondition = {
            propertyId: 'priority-prop-id',
            operator: '>',
            values: ['5'],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Should have editable input for number
        const editables = container.querySelectorAll('.Editable')
        expect(editables.length).toBeGreaterThan(0)
    })

    test('should show date input with {now} placeholder for date property', () => {
        const condition: QuickActionCondition = {
            propertyId: 'due-date-prop-id',
            operator: '>',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Should have editable input for date
        const editables = container.querySelectorAll('.Editable')
        expect(editables.length).toBeGreaterThan(0)
    })

    test('should show person input with {current_user} placeholder', () => {
        const condition: QuickActionCondition = {
            propertyId: 'assignee-prop-id',
            operator: 'in',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Should have editable input for person
        const editables = container.querySelectorAll('.Editable')
        expect(editables.length).toBeGreaterThan(0)
    })

    test('should not show value input for checked operator on checkbox', () => {
        const condition: QuickActionCondition = {
            propertyId: 'approved-prop-id',
            operator: 'checked',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Value input should not be shown for checkbox operators
        const buttons = container.querySelectorAll('button')
        expect(buttons.length).toBeLessThanOrEqual(3)
    })

    test('should not show value input for not checked operator on checkbox', () => {
        const condition: QuickActionCondition = {
            propertyId: 'approved-prop-id',
            operator: 'not checked',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        // Value input should not be shown for checkbox operators
        const buttons = container.querySelectorAll('button')
        expect(buttons.length).toBeLessThanOrEqual(3)
    })

    test('should handle condition with no property selected', () => {
        const condition: QuickActionCondition = {
            propertyId: '',
            operator: 'in',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(container.querySelector('.QuickActionConditionRow')).toBeInTheDocument()
        expect(screen.getByText('Select property')).toBeInTheDocument()
    })

    test('should handle multi-select property type', () => {
        // Add a multi-select property
        board.cardProperties.push({
            id: 'tags-prop-id',
            name: 'Tags',
            type: 'multiSelect',
            options: [
                {id: 'tag-1', value: 'Urgent', color: 'propColorRed'},
                {id: 'tag-2', value: 'Bug', color: 'propColorOrange'},
            ],
        })

        const condition: QuickActionCondition = {
            propertyId: 'tags-prop-id',
            operator: 'in',
            values: ['tag-1'],
        }

        render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(screen.getByText('Tags')).toBeInTheDocument()
    })

    test('should match snapshot for select property', () => {
        const condition: QuickActionCondition = {
            propertyId: 'status-prop-id',
            operator: 'in',
            values: ['opt-1'],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot for text property', () => {
        const condition: QuickActionCondition = {
            propertyId: 'description-prop-id',
            operator: 'contains',
            values: ['test'],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot for date property', () => {
        const condition: QuickActionCondition = {
            propertyId: 'due-date-prop-id',
            operator: '>',
            values: ['{now}'],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot for checkbox property', () => {
        const condition: QuickActionCondition = {
            propertyId: 'approved-prop-id',
            operator: 'checked',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot for empty operator', () => {
        const condition: QuickActionCondition = {
            propertyId: 'status-prop-id',
            operator: 'empty',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with no property selected', () => {
        const condition: QuickActionCondition = {
            propertyId: '',
            operator: 'in',
            values: [],
        }

        const {container} = render(wrapIntl(
            <QuickActionConditionRow
                condition={condition}
                board={board}
                isFirstRow={false}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
            />,
        ))

        expect(container).toMatchSnapshot()
    })
})
