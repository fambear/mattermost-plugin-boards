// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, screen, fireEvent} from '@testing-library/react'

import {wrapIntl} from '../../testUtils'

import VideoViewer from './videoViewer'

// Mock react-hotkeys-hook
const mockUseHotkeys = jest.fn()
jest.mock('react-hotkeys-hook', () => ({
    useHotkeys: (...args: unknown[]) => mockUseHotkeys(...args),
}))

describe('components/videoViewer/VideoViewer', () => {
    const mockOnClose = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('YouTube video', () => {
        test('should match snapshot for YouTube video', () => {
            const {container} = render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='dQw4w9WgXcQ'
                        onClose={mockOnClose}
                    />,
                ),
            )
            expect(container).toMatchSnapshot()
        })

        test('should render YouTube iframe with correct src', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='dQw4w9WgXcQ'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const iframe = document.querySelector('.VideoViewer__iframe') as HTMLIFrameElement
            expect(iframe).toBeTruthy()
            expect(iframe.src).toContain('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1')
        })

        test('should render YouTube iframe with correct attributes', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const iframe = document.querySelector('.VideoViewer__iframe') as HTMLIFrameElement
            expect(iframe).toBeTruthy()
            expect(iframe.title).toBe('YouTube video player')
            expect(iframe.frameBorder).toBe('0')
            expect(iframe.getAttribute('allow')).toContain('accelerometer')
            expect(iframe.getAttribute('allow')).toContain('autoplay')
            expect(iframe.getAttribute('allow')).toContain('clipboard-write')
            expect(iframe.getAttribute('allow')).toContain('encrypted-media')
            expect(iframe.getAttribute('allow')).toContain('gyroscope')
            expect(iframe.getAttribute('allow')).toContain('picture-in-picture')
        })
    })

    describe('Google Drive video', () => {
        test('should match snapshot for Google Drive video', () => {
            const {container} = render(
                wrapIntl(
                    <VideoViewer
                        sourceType='gdrive'
                        videoId='abc123xyz456'
                        onClose={mockOnClose}
                    />,
                ),
            )
            expect(container).toMatchSnapshot()
        })

        test('should render Google Drive iframe with correct src', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='gdrive'
                        videoId='abc123xyz456'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const iframe = document.querySelector('.VideoViewer__iframe') as HTMLIFrameElement
            expect(iframe).toBeTruthy()
            expect(iframe.src).toContain('https://drive.google.com/file/d/abc123xyz456/preview')
        })

        test('should render Google Drive iframe with correct attributes', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='gdrive'
                        videoId='test456'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const iframe = document.querySelector('.VideoViewer__iframe') as HTMLIFrameElement
            expect(iframe).toBeTruthy()
            expect(iframe.title).toBe('Google Drive video player')
            expect(iframe.frameBorder).toBe('0')
            expect(iframe.getAttribute('allow')).toContain('autoplay')
        })
    })

    describe('File video', () => {
        test('should match snapshot for file video', () => {
            const {container} = render(
                wrapIntl(
                    <VideoViewer
                        sourceType='file'
                        videoUrl='blob:test-video.mp4'
                        onClose={mockOnClose}
                    />,
                ),
            )
            expect(container).toMatchSnapshot()
        })

        test('should render video element with correct src', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='file'
                        videoUrl='blob:test-video.mp4'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const video = document.querySelector('.VideoViewer__video') as HTMLVideoElement
            expect(video).toBeTruthy()
            expect(video.querySelector('source')?.getAttribute('src')).toBe('blob:test-video.mp4')
        })

        test('should render video element with correct attributes', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='file'
                        videoUrl='blob:test-video.mp4'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const video = document.querySelector('.VideoViewer__video') as HTMLVideoElement
            expect(video).toBeTruthy()
            expect(video.controls).toBe(true)
            expect(video.autoplay).toBe(true)
        })

        test('should stop click propagation on video element', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='file'
                        videoUrl='blob:test-video.mp4'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const video = document.querySelector('.VideoViewer__video')
            if (video) {
                fireEvent.click(video)
                // onClose should NOT be called because stopPropagation prevents
                // the click from reaching the backdrop
                expect(mockOnClose).not.toHaveBeenCalled()
            }
        })
    })

    describe('close behavior', () => {
        test('should call onClose when close button is clicked', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const closeButton = screen.getByTitle(/Close video/i)
            fireEvent.click(closeButton)

            expect(mockOnClose).toHaveBeenCalledTimes(1)
        })

        test('should call onClose when backdrop is clicked', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const backdrop = document.querySelector('.VideoViewer__backdrop')
            if (backdrop) {
                fireEvent.click(backdrop)
                expect(mockOnClose).toHaveBeenCalledTimes(1)
            }
        })

        test('should call onClose when clicking outside content area', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const viewer = document.querySelector('.VideoViewer')
            if (viewer) {
                fireEvent.click(viewer)
                expect(mockOnClose).toHaveBeenCalledTimes(1)
            }
        })

        test('should not call onClose when clicking inside content', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const content = document.querySelector('.VideoViewer__content')
            if (content) {
                fireEvent.click(content)
                expect(mockOnClose).not.toHaveBeenCalled()
            }
        })
    })

    describe('edge cases', () => {
        test('should render null when sourceType is youtube but no videoId', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        onClose={mockOnClose}
                    />,
                ),
            )

            // Should render the wrapper but not an iframe
            const iframe = document.querySelector('.VideoViewer__iframe')
            expect(iframe).not.toBeTruthy()

            // Hotkeys should still be registered
            expect(mockUseHotkeys).toHaveBeenCalled()
        })

        test('should render null when sourceType is gdrive but no videoId', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='gdrive'
                        onClose={mockOnClose}
                    />,
                ),
            )

            // Should render the wrapper but not an iframe
            const iframe = document.querySelector('.VideoViewer__iframe')
            expect(iframe).not.toBeTruthy()

            // Hotkeys should still be registered
            expect(mockUseHotkeys).toHaveBeenCalled()
        })

        test('should render null when sourceType is file but no videoUrl', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='file'
                        onClose={mockOnClose}
                    />,
                ),
            )

            // Should render the wrapper but not a video element
            const video = document.querySelector('.VideoViewer__video')
            expect(video).not.toBeTruthy()

            // Hotkeys should still be registered
            expect(mockUseHotkeys).toHaveBeenCalled()
        })
    })

    describe('keyboard shortcuts', () => {
        test('should register escape hotkey', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            expect(mockUseHotkeys).toHaveBeenCalledWith(
                'esc',
                expect.any(Function),
                [mockOnClose],
            )
        })
    })

    describe('accessibility', () => {
        test('should have accessible close button with title', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const closeButton = screen.getByTitle(/Close video/i)
            expect(closeButton).toBeTruthy()
        })

        test('should have proper iframe titles for screen readers', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const youtubeIframe = document.querySelector('.VideoViewer__iframe') as HTMLIFrameElement
            expect(youtubeIframe?.title).toBe('YouTube video player')
        })

        test('should have proper Google Drive iframe title', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='gdrive'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const gdriveIframe = document.querySelector('.VideoViewer__iframe') as HTMLIFrameElement
            expect(gdriveIframe?.title).toBe('Google Drive video player')
        })
    })

    describe('component structure', () => {
        test('should render backdrop element', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const backdrop = document.querySelector('.VideoViewer__backdrop')
            expect(backdrop).toBeTruthy()
        })

        test('should render controls element', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const controls = document.querySelector('.VideoViewer__controls')
            expect(controls).toBeTruthy()
            expect(controls?.className).toContain('VideoViewer__controls--top')
        })

        test('should render content element', () => {
            render(
                wrapIntl(
                    <VideoViewer
                        sourceType='youtube'
                        videoId='test123'
                        onClose={mockOnClose}
                    />,
                ),
            )

            const content = document.querySelector('.VideoViewer__content')
            expect(content).toBeTruthy()
        })
    })
})
