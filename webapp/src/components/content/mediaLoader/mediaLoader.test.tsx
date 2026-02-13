// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, screen, fireEvent} from '@testing-library/react'

import {wrapIntl} from '../../../testUtils'

import MediaLoader from './mediaLoader'

describe('components/content/mediaLoader/MediaLoader', () => {
    test('should match snapshot when loading', () => {
        const component = wrapIntl(
            <MediaLoader isLoading={true}>
                <div>Content</div>
            </MediaLoader>,
        )
        const {container} = render(component)
        expect(container).toMatchSnapshot()
    })

    test('should match snapshot when loaded successfully', () => {
        const component = wrapIntl(
            <MediaLoader isLoading={false}>
                <div>Content</div>
            </MediaLoader>,
        )
        const {container} = render(component)
        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with error', () => {
        const component = wrapIntl(
            <MediaLoader
                isLoading={false}
                error='Failed to load'
                onRetry={jest.fn()}
            >
                <div>Content</div>
            </MediaLoader>,
        )
        const {container} = render(component)
        expect(container).toMatchSnapshot()
    })

    test('should display loading spinner when isLoading is true', () => {
        const component = wrapIntl(
            <MediaLoader isLoading={true}>
                <div data-testid='content'>Content</div>
            </MediaLoader>,
        )
        render(component)

        expect(screen.getByText('Loading...')).toBeTruthy()
        expect(screen.queryByTestId('content')).toBeNull()
    })

    test('should display content when loaded', () => {
        const component = wrapIntl(
            <MediaLoader isLoading={false}>
                <div data-testid='content'>Content</div>
            </MediaLoader>,
        )
        render(component)

        expect(screen.getByTestId('content')).toBeTruthy()
        expect(screen.queryByText('Loading...')).toBeNull()
    })

    test('should display error message when error is provided', () => {
        const component = wrapIntl(
            <MediaLoader
                isLoading={false}
                error='Unable to load media'
            >
                <div data-testid='content'>Content</div>
            </MediaLoader>,
        )
        render(component)

        expect(screen.getByText('Unable to load media')).toBeTruthy()
        expect(screen.queryByTestId('content')).toBeNull()
    })

    test('should display retry button when onRetry is provided', () => {
        const component = wrapIntl(
            <MediaLoader
                isLoading={false}
                error='Failed to load'
                onRetry={jest.fn()}
            >
                <div>Content</div>
            </MediaLoader>,
        )
        render(component)

        expect(screen.getByText('Retry')).toBeTruthy()
    })

    test('should not display retry button when onRetry is not provided', () => {
        const component = wrapIntl(
            <MediaLoader
                isLoading={false}
                error='Failed to load'
            >
                <div>Content</div>
            </MediaLoader>,
        )
        render(component)

        expect(screen.queryByText('Retry')).toBeNull()
    })

    test('should call onRetry when retry button is clicked', () => {
        const mockOnRetry = jest.fn()
        const component = wrapIntl(
            <MediaLoader
                isLoading={false}
                error='Failed to load'
                onRetry={mockOnRetry}
            >
                <div>Content</div>
            </MediaLoader>,
        )
        render(component)

        const retryButton = screen.getByText('Retry')
        fireEvent.click(retryButton)

        expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    test('should hide error when loading state changes to true', () => {
        const {rerender} = render(
            wrapIntl(
                <MediaLoader
                    isLoading={false}
                    error='Failed to load'
                    onRetry={jest.fn()}
                >
                    <div>Content</div>
                </MediaLoader>,
            ),
        )

        expect(screen.getByText('Failed to load')).toBeTruthy()

        rerender(
            wrapIntl(
                <MediaLoader
                    isLoading={true}
                    error='Failed to load'
                    onRetry={jest.fn()}
                >
                    <div>Content</div>
                </MediaLoader>,
            ),
        )

        expect(screen.getByText('Loading...')).toBeTruthy()
        expect(screen.queryByText('Failed to load')).toBeNull()
    })

    test('should apply custom className', () => {
        const component = wrapIntl(
            <MediaLoader
                isLoading={true}
                className='custom-class'
            >
                <div>Content</div>
            </MediaLoader>,
        )
        const {container} = render(component)

        expect(container.querySelector('.MediaLoader.custom-class')).toBeTruthy()
    })

    test('should handle null error gracefully', () => {
        const component = wrapIntl(
            <MediaLoader
                isLoading={false}
                error={null}
            >
                <div data-testid='content'>Content</div>
            </MediaLoader>,
        )
        render(component)

        expect(screen.getByTestId('content')).toBeTruthy()
    })

    test('should handle undefined error gracefully', () => {
        const component = wrapIntl(
            <MediaLoader
                isLoading={false}
                error={undefined}
            >
                <div data-testid='content'>Content</div>
            </MediaLoader>,
        )
        render(component)

        expect(screen.getByTestId('content')).toBeTruthy()
    })

    test('should show error icon when error is displayed', () => {
        const component = wrapIntl(
            <MediaLoader
                isLoading={false}
                error='Failed to load'
            >
                <div>Content</div>
            </MediaLoader>,
        )
        const {container} = render(component)

        expect(container.querySelector('.MediaLoader__error-icon')).toBeTruthy()
    })

    test('should show spinner element when loading', () => {
        const component = wrapIntl(
            <MediaLoader isLoading={true}>
                <div>Content</div>
            </MediaLoader>,
        )
        const {container} = render(component)

        expect(container.querySelector('.MediaLoader__spinner')).toBeTruthy()
    })
})
