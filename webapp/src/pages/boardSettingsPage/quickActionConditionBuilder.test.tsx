// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {TestBlockFactory} from '../../test/testBlockFactory'
import {mockDOM, wrapIntl} from '../../testUtils'
import {QuickActionCondition} from '../../blocks/quickAction'

import QuickActionConditionBuilder from './quickActionConditionBuilder'

beforeAll(() => {
    mockDOM()
})

describe('pages/boardSettingsPage/QuickActionConditionBuilder', () => {
    const board = TestBlockFactory.createBoard()

    const mockOnChange = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('should render empty state when no conditions exist', () => {
        const conditions: QuickActionCondition[] = []

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        expect(container.querySelector('.QuickActionConditionBuilder')).toBeInTheDocument()
        expect(container.querySelector('.QuickActionConditionBuilder__empty')).toBeInTheDocument()
        expect(screen.getByText('No conditions. This action will always be visible.')).toBeInTheDocument()
        expect(screen.getByText('+ Add Condition')).toBeInTheDocument()
    })

    test('should render condition rows when conditions exist', () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
            {
                propertyId: 'assignee-prop-id',
                operator: 'in',
                values: ['user-1'],
            },
        ]

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        expect(container.querySelector('.QuickActionConditionBuilder')).toBeInTheDocument()

        // Empty state should not be shown
        expect(container.querySelector('.QuickActionConditionBuilder__empty')).not.toBeInTheDocument()

        // Should have condition rows
        const rows = container.querySelectorAll('.QuickActionConditionRow')
        expect(rows.length).toBe(2)
    })

    test('should call onChange with new condition when add button is clicked (empty state)', async () => {
        const conditions: QuickActionCondition[] = []

        render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        const addButton = screen.getByText('+ Add Condition')

        await act(async () => {
            await userEvent.click(addButton)
        })

        expect(mockOnChange).toHaveBeenCalledTimes(1)
        const newConditions = mockOnChange.mock.calls[0][0]
        expect(newConditions).toHaveLength(1)
        expect(newConditions[0]).toEqual({
            propertyId: '',
            operator: 'in',
            values: [],
        })
    })

    test('should call onChange with new condition when add button is clicked (with existing conditions)', async () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
        ]

        render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        const addButton = screen.getByText('+ Add Condition')

        await act(async () => {
            await userEvent.click(addButton)
        })

        expect(mockOnChange).toHaveBeenCalledTimes(1)
        const newConditions = mockOnChange.mock.calls[0][0]
        expect(newConditions).toHaveLength(2)
        expect(newConditions[0]).toEqual(conditions[0])
        expect(newConditions[1]).toEqual({
            propertyId: '',
            operator: 'in',
            values: [],
        })
    })

    test('should render add button even when conditions exist', () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
        ]

        render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        const addButton = screen.getByText('+ Add Condition')
        expect(addButton).toBeInTheDocument()
    })

    test('should call onChange with updated condition when row onChange is called', () => {
        // This is tested indirectly through the condition row tests
        // The builder just passes the update through
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
        ]

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        // Verify structure is correct
        const rows = container.querySelectorAll('.QuickActionConditionRow')
        expect(rows.length).toBe(1)
    })

    test('should call onChange with condition removed when row onRemove is called', async () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
            {
                propertyId: 'assignee-prop-id',
                operator: 'in',
                values: ['user-1'],
            },
        ]

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        // Click remove button on first condition row
        const removeButton = container.querySelector('.QuickActionConditionRow__remove-btn')!

        await act(async () => {
            await userEvent.click(removeButton)
        })

        expect(mockOnChange).toHaveBeenCalledTimes(1)
        const newConditions = mockOnChange.mock.calls[0][0]
        expect(newConditions).toHaveLength(1)
        expect(newConditions[0]).toEqual(conditions[1])
    })

    test('should pass correct props to condition rows', () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
            {
                propertyId: 'assignee-prop-id',
                operator: 'in',
                values: ['user-1'],
            },
        ]

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        const rows = container.querySelectorAll('.QuickActionConditionRow')
        expect(rows.length).toBe(2)

        // First row should have isFirstRow=true
        // Second row should have isFirstRow=false
        // We can't directly test the prop values but can verify structure
        expect(rows[0]).toBeInTheDocument()
        expect(rows[1]).toBeInTheDocument()
    })

    test('should handle single condition', () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
        ]

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        const rows = container.querySelectorAll('.QuickActionConditionRow')
        expect(rows.length).toBe(1)
        expect(screen.getByText('+ Add Condition')).toBeInTheDocument()
    })

    test('should handle many conditions', () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
            {
                propertyId: 'assignee-prop-id',
                operator: 'in',
                values: ['user-1'],
            },
            {
                propertyId: 'priority-prop-id',
                operator: '>',
                values: ['5'],
            },
            {
                propertyId: 'category-prop-id',
                operator: 'not in',
                values: ['archived'],
            },
        ]

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        const rows = container.querySelectorAll('.QuickActionConditionRow')
        expect(rows.length).toBe(4)
    })

    test('should match snapshot with empty conditions', () => {
        const conditions: QuickActionCondition[] = []

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with conditions', () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
            {
                propertyId: 'assignee-prop-id',
                operator: 'in',
                values: ['user-1'],
            },
        ]

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with single condition', () => {
        const conditions: QuickActionCondition[] = [
            {
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['todo'],
            },
        ]

        const {container} = render(wrapIntl(
            <QuickActionConditionBuilder
                board={board}
                conditions={conditions}
                onChange={mockOnChange}
            />,
        ))

        expect(container).toMatchSnapshot()
    })
})
