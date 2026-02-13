// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {mockDOM, wrapIntl} from '../../testUtils'

import PropertyOptionsEditor from './propertyOptionsEditor'

beforeAll(() => {
    mockDOM()
})

describe('pages/boardSettingsPage/PropertyOptionsEditor', () => {
    const mockOnUpdate = jest.fn()
    const mockOnPropertyUpdate = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Workflow tag dropdown for Status properties', () => {
        test('should show workflow tag dropdown when isStatusProperty is true', () => {
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
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={true}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            // Should have tag dropdown for each option
            const tagDropdowns = container.querySelectorAll('.PropertyOptionsEditor__option-tag')
            expect(tagDropdowns.length).toBe(2)
        })

        test('should show "No tag" as default when option has no tag', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Todo', color: 'propColorDefault'},
                ],
            }

            render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={true}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            expect(screen.getByText('No tag')).toBeInTheDocument()
        })

        test('should show existing tag when option has a tag set', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Done', color: 'propColorGreen', tag: 'Finished' as const},
                ],
            }

            render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={true}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            expect(screen.getByText('Finished')).toBeInTheDocument()
        })

        test('should render all workflow tag options for Status property', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Todo', color: 'propColorDefault'},
                ],
            }

            render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={true}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            // Should show "No tag" default
            expect(screen.getByText('No tag')).toBeInTheDocument()
        })
    })

    describe('No workflow tag dropdown for non-Status properties', () => {
        test('should not show workflow tag dropdown when isStatusProperty is false', () => {
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
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            // Count color buttons - should only have color dropdowns (no tag dropdowns)
            const colorButtons = container.querySelectorAll('.PropertyOptionsEditor__color-button')
            // Two options, one color button each = 2
            expect(colorButtons.length).toBe(2)

            // No tag dropdowns should be present
            const tagDropdowns = container.querySelectorAll('.PropertyOptionsEditor__option-tag')
            expect(tagDropdowns.length).toBe(0)
        })

        test('should not show workflow tag dropdown when isStatusProperty is undefined', () => {
            const property = {
                id: 'priority-prop-id',
                name: 'Priority',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Low', color: 'propColorDefault'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    // isStatusProperty not provided (undefined)
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            // Only color dropdown
            const colorButtons = container.querySelectorAll('.PropertyOptionsEditor__color-button')
            expect(colorButtons.length).toBe(1)

            const tagDropdowns = container.querySelectorAll('.PropertyOptionsEditor__option-tag')
            expect(tagDropdowns.length).toBe(0)
        })
    })

    describe('Adding options', () => {
        test('should call onUpdate with new option when add button is clicked', async () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [],
            }

            render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            const addButton = screen.getByText('+ Add Option')

            await act(async () => {
                await userEvent.click(addButton)
            })

            expect(mockOnUpdate).toHaveBeenCalledTimes(1)
            const newOptions = mockOnUpdate.mock.calls[0][0]
            expect(newOptions).toHaveLength(1)
            expect(newOptions[0]).toMatchObject({
                color: 'propColorDefault',
                hideIfEmpty: false,
            })
            expect(newOptions[0].id).toBeDefined()
            expect(newOptions[0].value).toBeDefined()
        })

        test('should add option to existing options', async () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Existing', color: 'propColorDefault'},
                ],
            }

            render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            const addButton = screen.getByText('+ Add Option')

            await act(async () => {
                await userEvent.click(addButton)
            })

            const newOptions = mockOnUpdate.mock.calls[0][0]
            expect(newOptions).toHaveLength(2)
            expect(newOptions[0]).toEqual({id: 'opt-1', value: 'Existing', color: 'propColorDefault'})
            expect(newOptions[1]).toMatchObject({
                color: 'propColorDefault',
                hideIfEmpty: false,
            })
        })
    })

    describe('Deleting options', () => {
        test('should call onUpdate with option removed when delete button is clicked', async () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Option 1', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'Option 2', color: 'propColorGreen'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            // Find delete buttons - they are IconButtons containing DeleteIcon
            const deleteIcons = container.querySelectorAll('.DeleteIcon')
            expect(deleteIcons.length).toBe(2)

            // Click the first delete button's parent IconButton
            await act(async () => {
                await userEvent.click(deleteIcons[0].closest('button')!)
            })

            expect(mockOnUpdate).toHaveBeenCalledTimes(1)
            const newOptions = mockOnUpdate.mock.calls[0][0]
            expect(newOptions).toHaveLength(1)
            expect(newOptions[0].id).toBe('opt-2')
        })
    })

    describe('Reordering options', () => {
        test('should call onUpdate when option is moved up', async () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Option 1', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'Option 2', color: 'propColorGreen'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            // Find up button icon
            const upIcons = container.querySelectorAll('.SortUpIcon')
            expect(upIcons.length).toBe(1)

            await act(async () => {
                await userEvent.click(upIcons[0].closest('button')!)
            })

            expect(mockOnUpdate).toHaveBeenCalledTimes(1)
            const newOptions = mockOnUpdate.mock.calls[0][0]
            expect(newOptions).toHaveLength(2)
            expect(newOptions[0].id).toBe('opt-2')
            expect(newOptions[1].id).toBe('opt-1')
        })

        test('should call onUpdate when option is moved down', async () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Option 1', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'Option 2', color: 'propColorGreen'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            // Find down button icon
            const downIcons = container.querySelectorAll('.SortDownIcon')
            expect(downIcons.length).toBe(1)

            await act(async () => {
                await userEvent.click(downIcons[0].closest('button')!)
            })

            expect(mockOnUpdate).toHaveBeenCalledTimes(1)
            const newOptions = mockOnUpdate.mock.calls[0][0]
            expect(newOptions).toHaveLength(2)
            expect(newOptions[0].id).toBe('opt-2')
            expect(newOptions[1].id).toBe('opt-1')
        })

        test('should not show up button for first option', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Option 1', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'Option 2', color: 'propColorGreen'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            const options = container.querySelectorAll('.PropertyOptionsEditor__option')

            // First option should not have up button
            const firstOptionUpButtons = options[0].querySelectorAll('.SortUpIcon')
            expect(firstOptionUpButtons.length).toBe(0)

            // Second option should have up button
            const secondOptionUpButtons = options[1].querySelectorAll('.SortUpIcon')
            expect(secondOptionUpButtons.length).toBe(1)
        })

        test('should not show down button for last option', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Option 1', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'Option 2', color: 'propColorGreen'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            const options = container.querySelectorAll('.PropertyOptionsEditor__option')

            // First option should have down button
            const firstOptionDownButtons = options[0].querySelectorAll('.SortDownIcon')
            expect(firstOptionDownButtons.length).toBe(1)

            // Second option should not have down button
            const secondOptionDownButtons = options[1].querySelectorAll('.SortDownIcon')
            expect(secondOptionDownButtons.length).toBe(0)
        })
    })

    describe('Option value editing', () => {
        test('should render editable input for option value', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Original', color: 'propColorDefault'},
                ],
            }

            render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            expect(screen.getByPlaceholderText('Option value')).toBeInTheDocument()
        })
    })

    describe('Color picker', () => {
        test('should show color button for each option', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Option 1', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'Option 2', color: 'propColorGreen'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            const colorButtons = container.querySelectorAll('.PropertyOptionsEditor__color-button')
            expect(colorButtons.length).toBe(2)
        })
    })

    describe('Edge cases and error handling', () => {
        test('should handle empty options array', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            const options = container.querySelectorAll('.PropertyOptionsEditor__option')
            expect(options.length).toBe(0)
        })

        test('should handle single option', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Single', color: 'propColorDefault'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            const options = container.querySelectorAll('.PropertyOptionsEditor__option')
            expect(options.length).toBe(1)

            // Single option should have delete button but no reorder buttons
            const upIcons = options[0].querySelectorAll('.SortUpIcon')
            const downIcons = options[0].querySelectorAll('.SortDownIcon')
            const deleteIcons = options[0].querySelectorAll('.DeleteIcon')

            expect(upIcons.length).toBe(0)
            expect(downIcons.length).toBe(0)
            expect(deleteIcons.length).toBe(1)
        })

        test('should handle options with various workflow tags', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Todo', color: 'propColorDefault', tag: 'Preparation' as const},
                    {id: 'opt-2', value: 'In Progress', color: 'propColorBlue', tag: 'Execution' as const},
                    {id: 'opt-3', value: 'Done', color: 'propColorGreen', tag: 'Finished' as const},
                    {id: 'opt-4', value: 'Cancelled', color: 'propColorRed', tag: 'Rejected' as const},
                    {id: 'opt-5', value: 'Review', color: 'propColorYellow', tag: 'Review' as const},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={true}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            // All options should be rendered
            const options = container.querySelectorAll('.PropertyOptionsEditor__option')
            expect(options.length).toBe(5)

            // Tag dropdowns should be present for Status property
            const tagDropdowns = container.querySelectorAll('.PropertyOptionsEditor__option-tag')
            // Each option has a tag dropdown
            expect(tagDropdowns.length).toBe(5)
        })
    })

    describe('Snapshots', () => {
        test('should match snapshot for Status property with workflow tags', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Todo', color: 'propColorDefault', tag: 'Preparation' as const},
                    {id: 'opt-2', value: 'Done', color: 'propColorGreen', tag: 'Finished' as const},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={true}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            expect(container).toMatchSnapshot()
        })

        test('should match snapshot for Status property without tags', () => {
            const property = {
                id: 'status-prop-id',
                name: 'Status',
                type: 'select' as const,
                options: [
                    {id: 'opt-1', value: 'Todo', color: 'propColorDefault'},
                    {id: 'opt-2', value: 'In Progress', color: 'propColorBlue'},
                ],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={true}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            expect(container).toMatchSnapshot()
        })

        test('should match snapshot for non-Status property', () => {
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
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            expect(container).toMatchSnapshot()
        })

        test('should match snapshot for empty options', () => {
            const property = {
                id: 'prop-1',
                name: 'Property 1',
                type: 'select' as const,
                options: [],
            }

            const {container} = render(wrapIntl(
                <PropertyOptionsEditor
                    property={property}
                    isStatusProperty={false}
                    onUpdate={mockOnUpdate}
                    onPropertyUpdate={mockOnPropertyUpdate}
                />,
            ))

            expect(container).toMatchSnapshot()
        })
    })
})
