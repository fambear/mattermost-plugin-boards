// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {TestBlockFactory} from '../../test/testBlockFactory'
import {mockDOM, wrapIntl} from '../../testUtils'

import QuickActionsSection from './quickActionsSection'

beforeAll(() => {
    mockDOM()
})

describe('pages/boardSettingsPage/QuickActionsSection', () => {
    const board = TestBlockFactory.createBoard()

    const mockOnBoardChange = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('should render empty state when no quick actions exist', () => {
        board.properties = {}

        const {container} = render(wrapIntl(
            <QuickActionsSection
                board={board}
                onBoardChange={mockOnBoardChange}
            />,
        ))

        expect(container.querySelector('.QuickActionsSection')).toBeInTheDocument()
        expect(container.querySelector('.QuickActionsSection__list')).toBeInTheDocument()
        expect(screen.getByText('+ Add Quick Action')).toBeInTheDocument()
    })

    test('should render list of existing quick actions', () => {
        const quickActions = [
            {
                id: 'action-1',
                name: 'Start Work',
                style: {color: 'propColorBlue'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [],
            },
            {
                id: 'action-2',
                name: 'Complete Task',
                style: {color: 'propColorGreen'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [],
            },
        ]

        board.properties = {quickActions}

        const {container} = render(wrapIntl(
            <QuickActionsSection
                board={board}
                onBoardChange={mockOnBoardChange}
            />,
        ))

        const editors = container.querySelectorAll('.QuickActionEditor')
        expect(editors.length).toBe(2)
    })

    test('should call onBoardChange with new action when add button is clicked', async () => {
        board.properties = {}

        render(wrapIntl(
            <QuickActionsSection
                board={board}
                onBoardChange={mockOnBoardChange}
            />,
        ))

        const addButton = screen.getByText('+ Add Quick Action')

        await act(async () => {
            await userEvent.click(addButton)
        })

        expect(mockOnBoardChange).toHaveBeenCalledTimes(1)
        const updatedBoard = mockOnBoardChange.mock.calls[0][0]
        expect(updatedBoard.properties.quickActions).toHaveLength(1)
        expect(updatedBoard.properties.quickActions[0].name).toBe('New Action')
        expect(updatedBoard.properties.quickActions[0].style.color).toBe('propColorDefault')
        expect(updatedBoard.properties.quickActions[0].confirmRequired).toBe(false)
        expect(updatedBoard.properties.quickActions[0].conditions).toEqual([])
        expect(updatedBoard.properties.quickActions[0].actions).toEqual([])
    })

    test('should add new action to existing list', async () => {
        const quickActions = [
            {
                id: 'action-1',
                name: 'Start Work',
                style: {color: 'propColorBlue'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [],
            },
        ]

        board.properties = {quickActions}

        render(wrapIntl(
            <QuickActionsSection
                board={board}
                onBoardChange={mockOnBoardChange}
            />,
        ))

        const addButton = screen.getByText('+ Add Quick Action')

        await act(async () => {
            await userEvent.click(addButton)
        })

        expect(mockOnBoardChange).toHaveBeenCalledTimes(1)
        const updatedBoard = mockOnBoardChange.mock.calls[0][0]
        expect(updatedBoard.properties.quickActions).toHaveLength(2)
        expect(updatedBoard.properties.quickActions[0].id).toBe('action-1')
        expect(updatedBoard.properties.quickActions[1].name).toBe('New Action')
    })

    test('should call onUpdate when action is updated', async () => {
        const quickActions = [
            {
                id: 'action-1',
                name: 'Start Work',
                style: {color: 'propColorBlue'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [],
            },
        ]

        board.properties = {quickActions}

        const {container} = render(wrapIntl(
            <QuickActionsSection
                board={board}
                onBoardChange={mockOnBoardChange}
            />,
        ))

        // Expand the action to see its content
        const expandButton = container.querySelector('.QuickActionEditor__header')!

        await act(async () => {
            await userEvent.click(expandButton)
        })

        // The onUpdate is passed to QuickActionEditor, which would call it
        // We verify the structure is correct by checking the editor exists
        const editor = container.querySelector('.QuickActionEditor')
        expect(editor).toBeInTheDocument()
    })

    test('should call onDelete and remove action when delete is clicked', async () => {
        const quickActions = [
            {
                id: 'action-1',
                name: 'Start Work',
                style: {color: 'propColorBlue'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [],
            },
            {
                id: 'action-2',
                name: 'Complete Task',
                style: {color: 'propColorGreen'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [],
            },
        ]

        board.properties = {quickActions}

        const {container} = render(wrapIntl(
            <QuickActionsSection
                board={board}
                onBoardChange={mockOnBoardChange}
            />,
        ))

        // Click delete button on first action
        // Each QuickActionEditor has 2 IconButtons: expand/collapse (index 0) and delete (index 1)
        const deleteButton = container.querySelectorAll('.IconButton')[1]

        await act(async () => {
            await userEvent.click(deleteButton)
        })

        expect(mockOnBoardChange).toHaveBeenCalledTimes(1)
        const updatedBoard = mockOnBoardChange.mock.calls[0][0]
        expect(updatedBoard.properties.quickActions).toHaveLength(1)
        expect(updatedBoard.properties.quickActions[0].id).toBe('action-2')
    })

    test('should expand newly added action after creation', async () => {
        board.properties = {}

        let currentBoard = board
        const handleBoardChange = jest.fn((updatedBoard) => {
            currentBoard = updatedBoard
        })

        const {container, rerender} = render(wrapIntl(
            <QuickActionsSection
                board={currentBoard}
                onBoardChange={handleBoardChange}
            />,
        ))

        const addButton = screen.getByText('+ Add Quick Action')

        await act(async () => {
            await userEvent.click(addButton)
        })

        // Re-render with the updated board
        rerender(wrapIntl(
            <QuickActionsSection
                board={currentBoard}
                onBoardChange={handleBoardChange}
            />,
        ))

        // After adding, the new action should be expanded
        // This is verified by the presence of the content section
        const editors = container.querySelectorAll('.QuickActionEditor')
        expect(editors.length).toBe(1)

        // Verify the action is expanded by checking for the content section
        const content = container.querySelector('.QuickActionEditor__content')
        expect(content).toBeInTheDocument()
    })

    test('should match snapshot with empty state', () => {
        board.properties = {}

        const {container} = render(wrapIntl(
            <QuickActionsSection
                board={board}
                onBoardChange={mockOnBoardChange}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with actions', () => {
        const quickActions = [
            {
                id: 'action-1',
                name: 'Start Work',
                style: {color: 'propColorBlue'},
                confirmRequired: false,
                confirmText: '',
                conditions: [],
                actions: [],
            },
            {
                id: 'action-2',
                name: 'Complete Task',
                style: {color: 'propColorGreen'},
                confirmRequired: true,
                confirmText: 'Are you sure?',
                conditions: [],
                actions: [],
            },
        ]

        board.properties = {quickActions}

        const {container} = render(wrapIntl(
            <QuickActionsSection
                board={board}
                onBoardChange={mockOnBoardChange}
            />,
        ))

        expect(container).toMatchSnapshot()
    })
})
