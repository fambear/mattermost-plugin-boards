// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {TestBlockFactory} from '../../test/testBlockFactory'
import {mockDOM, wrapIntl} from '../../testUtils'

import QuickActionRow from './quickActionRow'

beforeAll(() => {
    mockDOM()
})

describe('pages/boardSettingsPage/QuickActionRow', () => {
    const board = TestBlockFactory.createBoard()

    // Add some card properties to the board for testing
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
            id: 'comment-prop-id',
            name: 'Comment',
            type: 'text',
            options: [],
        },
        {
            id: 'date-prop-id',
            name: 'Due Date',
            type: 'date',
            options: [],
        },
    ]

    const mockOnChange = jest.fn()
    const mockOnRemove = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('should render setProperty action type selector', () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: '',
            value: '',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        expect(container.querySelector('.QuickActionRow')).toBeInTheDocument()
        expect(screen.getByText('Set property')).toBeInTheDocument()
    })

    test('should render clearProperty action type selector', () => {
        const action = {
            type: 'clearProperty' as const,
            propertyId: '',
        }

        render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        expect(screen.getByText('Clear property')).toBeInTheDocument()
    })

    test('should render addComment action type selector', () => {
        const action = {
            type: 'addComment' as const,
            text: '',
        }

        render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        expect(screen.getByText('Add comment')).toBeInTheDocument()
    })

    test('should show property selector for setProperty action', () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: '',
            value: '',
        }

        render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        expect(screen.getByText('Select property')).toBeInTheDocument()
    })

    test('should show selected property name for setProperty action', () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: 'status-prop-id',
            value: 'opt-1',
        }

        render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        expect(screen.getByText('Status')).toBeInTheDocument()
    })

    test('should show remove button when showRemove is true', () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: '',
            value: '',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={true}
            />,
        ))

        const removeButton = container.querySelector('.QuickActionRow__remove-btn')
        expect(removeButton).toBeInTheDocument()
        expect(removeButton).toHaveTextContent('[-]')
    })

    test('should not show remove button when showRemove is false', () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: '',
            value: '',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        const removeButton = container.querySelector('.QuickActionRow__remove-btn')
        expect(removeButton).not.toBeInTheDocument()
    })

    test('should call onRemove when remove button is clicked', async () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: '',
            value: '',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={true}
            />,
        ))

        const removeButton = container.querySelector('.QuickActionRow__remove-btn')!

        await act(async () => {
            await userEvent.click(removeButton)
        })

        expect(mockOnRemove).toHaveBeenCalledTimes(1)
    })

    test('should show value input with {now} placeholder for date property', () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: 'date-prop-id',
            value: '',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        // Check that the input with {now} placeholder is shown
        const editable = container.querySelector('.Editable')
        expect(editable).toBeInTheDocument()
    })

    test('should show value input with {current_user} placeholder for person property', () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: 'assignee-prop-id',
            value: '',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        // Check that the input with {current_user} placeholder is shown
        const editable = container.querySelector('.Editable')
        expect(editable).toBeInTheDocument()
    })

    test('should show comment text input for addComment action', () => {
        const action = {
            type: 'addComment' as const,
            text: '',
        }

        render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={false}
            />,
        ))

        expect(screen.getByPlaceholderText('Comment text')).toBeInTheDocument()
    })

    test('should match snapshot for setProperty action', () => {
        const action = {
            type: 'setProperty' as const,
            propertyId: 'status-prop-id',
            value: 'opt-1',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={true}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot for clearProperty action', () => {
        const action = {
            type: 'clearProperty' as const,
            propertyId: 'assignee-prop-id',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={true}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot for addComment action', () => {
        const action = {
            type: 'addComment' as const,
            text: 'Work started',
        }

        const {container} = render(wrapIntl(
            <QuickActionRow
                action={action}
                board={board}
                onChange={mockOnChange}
                onRemove={mockOnRemove}
                showRemove={true}
            />,
        ))

        expect(container).toMatchSnapshot()
    })
})
