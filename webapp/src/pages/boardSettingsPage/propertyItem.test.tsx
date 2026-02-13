// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {mockDOM, wrapIntl} from '../../testUtils'

import PropertyItem from './propertyItem'

beforeAll(() => {
    mockDOM()
})

describe('pages/boardSettingsPage/PropertyItem', () => {
    const mockOnUpdate = jest.fn()
    const mockOnDelete = jest.fn()
    const mockOnReorder = jest.fn()
    const mockOnToggleExpand = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Status property protection', () => {
        test('should show lock icon for Status property (exact case)', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const lockIcon = container.querySelector('.LockOutlineIcon')
            expect(lockIcon).toBeInTheDocument()

            // Lock icon should have the specific class
            const lockButton = container.querySelector('.PropertyItem__lock-icon')
            expect(lockButton).toBeInTheDocument()
        })

        test('should show lock icon for status property (lowercase)', () => {
            const property = {
                id: 'status-prop-id',
                name: 'status',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const lockIcon = container.querySelector('.LockOutlineIcon')
            expect(lockIcon).toBeInTheDocument()
        })

        test('should show lock icon for STATUS property (uppercase)', () => {
            const property = {
                id: 'status-prop-id',
                name: 'STATUS',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const lockIcon = container.querySelector('.LockOutlineIcon')
            expect(lockIcon).toBeInTheDocument()
        })

        test('should show delete button for non-Status properties', () => {
            const property = {
                id: 'priority-prop-id',
                name: 'Priority',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            // Should show delete icon
            const deleteIcon = container.querySelector('.DeleteIcon')
            expect(deleteIcon).toBeInTheDocument()

            // Should not show lock icon
            const lockIcon = container.querySelector('.LockOutlineIcon')
            expect(lockIcon).not.toBeInTheDocument()

            const lockButton = container.querySelector('.PropertyItem__lock-icon')
            expect(lockButton).not.toBeInTheDocument()
        })

        test('should show delete button for properties with "status" in name but not exactly "Status"', () => {
            const property = {
                id: 'other-prop-id',
                name: 'Status Review',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const deleteIcon = container.querySelector('.DeleteIcon')
            expect(deleteIcon).toBeInTheDocument()

            const lockIcon = container.querySelector('.LockOutlineIcon')
            expect(lockIcon).not.toBeInTheDocument()
        })

        test('should not call onDelete when lock icon is clicked', async () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const lockButton = container.querySelector('.PropertyItem__lock-icon')!

            await act(async () => {
                await userEvent.click(lockButton)
            })

            expect(mockOnDelete).not.toHaveBeenCalled()
        })
    })

    describe('Property options editor integration', () => {
        test('should pass isStatusProperty to PropertyOptionsEditor for Status property', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Todo', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'Done', color: 'propColorGreen'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            // PropertyOptionsEditor should be rendered
            const optionsEditor = container.querySelector('.PropertyOptionsEditor')
            expect(optionsEditor).toBeInTheDocument()
        })

        test('should pass isStatusProperty=false for non-Status properties', () => {
            const property = {
                id: 'priority-prop-id',
                name: 'Priority',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Low', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'High', color: 'propColorRed'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            // PropertyOptionsEditor should be rendered
            const optionsEditor = container.querySelector('.PropertyOptionsEditor')
            expect(optionsEditor).toBeInTheDocument()
        })
    })

    describe('Property reordering', () => {
        test('should show up and down buttons when there are multiple properties', () => {
            const property = {
                id: 'prop-2',
                name: 'Property 2',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={1}
                    totalCount={3}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            // Both up and down buttons should be shown
            const upIcon = container.querySelector('.SortUpIcon')
            const downIcon = container.querySelector('.SortDownIcon')
            expect(upIcon).toBeInTheDocument()
            expect(downIcon).toBeInTheDocument()
        })

        test('should only show down button when property is first', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={2}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const upIcon = container.querySelector('.SortUpIcon')
            const downIcon = container.querySelector('.SortDownIcon')
            expect(upIcon).not.toBeInTheDocument()
            expect(downIcon).toBeInTheDocument()
        })

        test('should only show up button when property is last', () => {
            const property = {
                id: 'prop-2',
                name: 'Property 2',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={1}
                    totalCount={2}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const upIcon = container.querySelector('.SortUpIcon')
            const downIcon = container.querySelector('.SortDownIcon')
            expect(upIcon).toBeInTheDocument()
            expect(downIcon).not.toBeInTheDocument()
        })

        test('should call onReorder with correct index when up button is clicked', async () => {
            const property = {
                id: 'prop-2',
                name: 'Property 2',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={1}
                    totalCount={2}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const iconButtons = container.querySelectorAll('.IconButton')
            // First IconButton is expand/collapse, second is up
            const upButton = iconButtons[1]

            await act(async () => {
                await userEvent.click(upButton)
            })

            expect(mockOnReorder).toHaveBeenCalledWith('prop-2', 0)
        })

        test('should call onReorder with correct index when down button is clicked', async () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={2}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const iconButtons = container.querySelectorAll('.IconButton')
            // First is expand/collapse, second is down
            const downButton = iconButtons[1]

            await act(async () => {
                await userEvent.click(downButton)
            })

            expect(mockOnReorder).toHaveBeenCalledWith('prop-1', 1)
        })
    })

    describe('Property name editing', () => {
        test('should render editable property name', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [],
            }

            render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            expect(screen.getByPlaceholderText('Property name')).toBeInTheDocument()
        })
    })

    describe('Expand/collapse', () => {
        test('should call onToggleExpand when expand/collapse button is clicked', async () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const expandButton = container.querySelector('.IconButton')!

            await act(async () => {
                await userEvent.click(expandButton)
            })

            expect(mockOnToggleExpand).toHaveBeenCalledTimes(1)
        })
    })

    describe('Hide if empty checkbox', () => {
        test('should show hide if empty checkbox when expanded', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'text' as const,
                options: [],
            }

            render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            expect(screen.getByText('Hide this property if empty')).toBeInTheDocument()
        })

        test('should call onPropertyUpdate when hide if empty checkbox is changed', async () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'text' as const,
                options: [],
                hideIfEmpty: false,
            }

            render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            const checkbox = screen.getByRole('checkbox')

            await act(async () => {
                await userEvent.click(checkbox)
            })

            expect(mockOnUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    hideIfEmpty: true,
                }),
            )
        })
    })

    describe('Sort rule dropdown', () => {
        test('should show sort rule dropdown for select properties when expanded', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [],
                sortRule: 'default' as const,
            }

            render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            expect(screen.getByText('Sort Rule')).toBeInTheDocument()
        })

        test('should show sort rule dropdown for multiSelect properties when expanded', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'multiSelect' as const,
                options: [],
                sortRule: 'default' as const,
            }

            render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            expect(screen.getByText('Sort Rule')).toBeInTheDocument()
        })

        test('should not show sort rule dropdown for non-select properties', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'text' as const,
                options: [],
            }

            render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            expect(screen.queryByText('Sort Rule')).not.toBeInTheDocument()
        })
    })

    describe('Snapshots', () => {
        test('should match snapshot for Status property (expanded)', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Todo', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'Done', color: 'propColorGreen'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={true}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            expect(container).toMatchSnapshot()
        })

        test('should match snapshot for Status property (collapsed)', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Todo', color: 'propColorDefault'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            expect(container).toMatchSnapshot()
        })

        test('should match snapshot for non-Status property with delete button', () => {
            const property = {
                id: 'priority-prop-id',
                name: 'Priority',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Low', color: 'propColorDefault'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyItem
                    property={property}
                    index={0}
                    totalCount={1}
                    isExpanded={false}
                    onToggleExpand={mockOnToggleExpand}
                    onUpdate={mockOnUpdate}
                    onDelete={mockOnDelete}
                    onReorder={mockOnReorder}
                />,
            ))

            expect(container).toMatchSnapshot()
        })
    })
})
