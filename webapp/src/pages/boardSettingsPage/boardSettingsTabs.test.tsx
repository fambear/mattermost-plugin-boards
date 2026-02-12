// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import '@testing-library/jest-dom'

import {wrapIntl} from '../../testUtils'

import BoardSettingsTabs from './boardSettingsTabs'

describe('components/boardSettingsTabs', () => {
    const mockOnTabChange = jest.fn()
    const defaultProps = {
        activeTab: 'general' as const,
        onTabChange: mockOnTabChange,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('should render all tabs', () => {
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )
        expect(container).toMatchSnapshot()
    })

    test('should render all five tab buttons', () => {
        render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )

        expect(screen.getByRole('button', {name: 'General'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Views Management'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Card Properties and Options'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Status Transition Rules'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Quick Actions'})).toBeInTheDocument()
    })

    test('should mark the active tab with active class', () => {
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )

        const activeTab = container.querySelector('.BoardSettingsTabs__tab.active')
        expect(activeTab).toBeInTheDocument()
        expect(activeTab).toHaveTextContent('General')
    })

    test('should call onTabChange when a tab is clicked', async () => {
        render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )

        const viewsTab = screen.getByRole('button', {name: 'Views Management'})
        await userEvent.click(viewsTab)

        expect(mockOnTabChange).toHaveBeenCalledTimes(1)
        expect(mockOnTabChange).toHaveBeenCalledWith('views')
    })

    test('should correctly mark views tab as active', () => {
        const props = {
            ...defaultProps,
            activeTab: 'views' as const,
        }
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...props} />,
            ),
        )

        const activeTab = container.querySelector('.BoardSettingsTabs__tab.active')
        expect(activeTab).toBeInTheDocument()
        expect(activeTab).toHaveTextContent('Views Management')
    })

    test('should correctly mark properties tab as active', () => {
        const props = {
            ...defaultProps,
            activeTab: 'properties' as const,
        }
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...props} />,
            ),
        )

        const activeTab = container.querySelector('.BoardSettingsTabs__tab.active')
        expect(activeTab).toBeInTheDocument()
        expect(activeTab).toHaveTextContent('Card Properties and Options')
    })

    test('should correctly mark status tab as active', () => {
        const props = {
            ...defaultProps,
            activeTab: 'status' as const,
        }
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...props} />,
            ),
        )

        const activeTab = container.querySelector('.BoardSettingsTabs__tab.active')
        expect(activeTab).toBeInTheDocument()
        expect(activeTab).toHaveTextContent('Status Transition Rules')
    })

    test('should correctly mark quickActions tab as active', () => {
        const props = {
            ...defaultProps,
            activeTab: 'quickActions' as const,
        }
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...props} />,
            ),
        )

        const activeTab = container.querySelector('.BoardSettingsTabs__tab.active')
        expect(activeTab).toBeInTheDocument()
        expect(activeTab).toHaveTextContent('Quick Actions')
    })

    test('should not mark inactive tabs with active class', () => {
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )

        const activeTabs = container.querySelectorAll('.BoardSettingsTabs__tab.active')
        expect(activeTabs.length).toBe(1)
    })

    test('should switch active tab when clicking different tabs', async () => {
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )

        // Initial state: general tab is active
        const activeTab = container.querySelector('.BoardSettingsTabs__tab.active')
        expect(activeTab).toHaveTextContent('General')

        // Click on properties tab
        const propertiesTab = screen.getByRole('button', {name: 'Card Properties and Options'})
        await userEvent.click(propertiesTab)

        expect(mockOnTabChange).toHaveBeenCalledWith('properties')
    })

    test('should handle multiple tab clicks in sequence', async () => {
        render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )

        const statusTab = screen.getByRole('button', {name: 'Status Transition Rules'})
        const quickActionsTab = screen.getByRole('button', {name: 'Quick Actions'})

        await userEvent.click(statusTab)
        expect(mockOnTabChange).toHaveBeenCalledWith('status')

        await userEvent.click(quickActionsTab)
        expect(mockOnTabChange).toHaveBeenCalledWith('quickActions')

        expect(mockOnTabChange).toHaveBeenCalledTimes(2)
    })

    test('should apply proper CSS classes to tab container', () => {
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )

        const tabContainer = container.querySelector('.BoardSettingsTabs')
        expect(tabContainer).toBeInTheDocument()
    })

    test('should apply proper CSS classes to individual tabs', () => {
        const {container} = render(
            wrapIntl(
                <BoardSettingsTabs {...defaultProps} />,
            ),
        )

        const tabs = container.querySelectorAll('.BoardSettingsTabs__tab')
        expect(tabs.length).toBe(5)

        // All tabs should have the base class
        tabs.forEach((tab) => {
            expect(tab).toHaveClass('BoardSettingsTabs__tab')
        })
    })
})
