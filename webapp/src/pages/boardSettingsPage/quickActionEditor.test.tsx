// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {TestBlockFactory} from '../../test/testBlockFactory'
import {mockDOM, wrapIntl} from '../../testUtils'
import {QuickAction} from '../../blocks/quickAction'

import QuickActionEditor from './quickActionEditor'

beforeAll(() => {
    mockDOM()
})

describe('pages/boardSettingsPage/QuickActionEditor', () => {
    const board = TestBlockFactory.createBoard()

    const mockAction: QuickAction = {
        id: 'action-1',
        name: 'Start Work',
        style: {color: 'propColorBlue'},
        confirmRequired: false,
        confirmText: '',
        conditions: [],
        actions: [],
    }

    const mockOnToggleExpand = jest.fn()
    const mockOnUpdate = jest.fn()
    const mockOnDelete = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('should render collapsed action editor', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={false}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(container.querySelector('.QuickActionEditor')).toBeInTheDocument()
        expect(container.querySelector('.QuickActionEditor__header')).toBeInTheDocument()
        expect(screen.getByText('Start Work')).toBeInTheDocument()

        // Content should not be visible when collapsed
        expect(container.querySelector('.QuickActionEditor__content')).not.toBeInTheDocument()
    })

    test('should render expanded action editor with all fields', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(container.querySelector('.QuickActionEditor')).toBeInTheDocument()
        expect(container.querySelector('.QuickActionEditor__content')).toBeInTheDocument()

        // Check for name field
        expect(screen.getByText('Name')).toBeInTheDocument()

        // Check for color field
        expect(screen.getByText('Color')).toBeInTheDocument()

        // Check for confirmation checkbox
        expect(screen.getByText('Require confirmation')).toBeInTheDocument()

        // Check for sections
        expect(screen.getByText('Conditions (ALL must match)')).toBeInTheDocument()
        expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    test('should call onToggleExpand when header is clicked', async () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={false}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        const header = container.querySelector('.QuickActionEditor__header')!

        await act(async () => {
            await userEvent.click(header)
        })

        expect(mockOnToggleExpand).toHaveBeenCalledTimes(1)
    })

    test('should call onToggleExpand when expand button is clicked', async () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={false}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        const expandButton = container.querySelector('.IconButton')!

        await act(async () => {
            await userEvent.click(expandButton)
        })

        expect(mockOnToggleExpand).toHaveBeenCalledTimes(1)
    })

    test('should call onDelete when delete button is clicked', async () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        // Find delete button (second icon button in header actions)
        const deleteButtons = container.querySelectorAll('.IconButton')
        const deleteButton = deleteButtons[deleteButtons.length - 1]

        await act(async () => {
            await userEvent.click(deleteButton)
        })

        expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })

    test('should show confirmation text field when confirmRequired is true', () => {
        const actionWithConfirm: QuickAction = {
            ...mockAction,
            confirmRequired: true,
            confirmText: 'Are you sure?',
        }

        render(wrapIntl(
            <QuickActionEditor
                action={actionWithConfirm}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(screen.getByText('Confirmation text')).toBeInTheDocument()
    })

    test('should not show confirmation text field when confirmRequired is false', () => {
        render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(screen.queryByText('Confirmation text')).not.toBeInTheDocument()
    })

    test('should show correct color badge', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={false}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        const badge = container.querySelector('.QuickActionEditor__name-badge')
        expect(badge).toHaveClass('propColorBlue')
    })

    test('should display action name in header', () => {
        render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={false}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(screen.getByText('Start Work')).toBeInTheDocument()
    })

    test('should render expand icon when collapsed', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={false}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        const iconButton = container.querySelector('.IconButton')
        expect(iconButton).toBeInTheDocument()
        // Should show collapse icon (chevron right) when collapsed
        expect(iconButton?.querySelector('svg')).toBeInTheDocument()
    })

    test('should render collapse icon when expanded', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        const iconButton = container.querySelector('.IconButton')
        expect(iconButton).toBeInTheDocument()
        // Should show expand icon (chevron down) when expanded
        expect(iconButton?.querySelector('svg')).toBeInTheDocument()
    })

    test('should render QuickActionConditionBuilder when expanded', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(container.querySelector('.QuickActionConditionBuilder')).toBeInTheDocument()
    })

    test('should render QuickActionBuilder when expanded', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(container.querySelector('.QuickActionBuilder')).toBeInTheDocument()
    })

    test('should match snapshot when collapsed', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={false}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot when expanded without confirmation', () => {
        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={mockAction}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot when expanded with confirmation', () => {
        const actionWithConfirm: QuickAction = {
            ...mockAction,
            confirmRequired: true,
            confirmText: 'Are you sure you want to proceed?',
        }

        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={actionWithConfirm}
                board={board}
                isExpanded={true}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with different colors', () => {
        const redAction: QuickAction = {
            ...mockAction,
            style: {color: 'propColorRed'},
        }

        const {container} = render(wrapIntl(
            <QuickActionEditor
                action={redAction}
                board={board}
                isExpanded={false}
                onToggleExpand={mockOnToggleExpand}
                onUpdate={mockOnUpdate}
                onDelete={mockOnDelete}
            />,
        ))

        expect(container).toMatchSnapshot()
    })
})
