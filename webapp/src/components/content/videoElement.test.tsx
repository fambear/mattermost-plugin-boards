// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {mocked} from 'jest-mock'
import {act} from 'react-dom/test-utils'

import {VideoBlock} from '../../blocks/videoBlock'

import {wrapIntl} from '../../testUtils'

import octoClient from '../../octoClient'

import VideoElement from './videoElement'

jest.mock('../../octoClient')
jest.mock('../rootPortal', () => ({
    __esModule: true,
    default: ({children}: {children: React.ReactNode}) => <div data-testid='root-portal'>{children}</div>,
}))

const mockedOcto = mocked(octoClient, true)

describe('components/content/VideoElement', () => {
    const defaultBlock: VideoBlock = {
        id: 'test-id',
        boardId: 'board-123',
        parentId: '',
        modifiedBy: 'test-user-id',
        schema: 0,
        type: 'video',
        title: 'test-title',
        fields: {
            fileId: 'test-file-id',
            filename: 'test-video.mp4',
            sourceType: 'file',
        },
        createdBy: 'test-user-id',
        createAt: 0,
        updateAt: 0,
        deleteAt: 0,
        limited: false,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        // Default successful file load
        mockedOcto.getFileAsDataUrl.mockResolvedValue({
            url: 'blob:test-video.mp4',
        })
    })

    describe('file video type', () => {
        test('should match snapshot for file video', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            let container: Element | undefined
            await act(async () => {
                const {container: c} = render(component)
                container = c
            })

            // Wait for async video load to complete before snapshot
            await waitFor(() => {
                expect(screen.queryByTestId('video')).toBeTruthy()
            })
            expect(container).toMatchSnapshot()
        })

        test('should load and display video file', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            expect(mockedOcto.getFileAsDataUrl).toHaveBeenCalledWith('board-123', 'test-file-id')
            await waitFor(() => {
                const video = screen.queryByTestId('video')
                expect(video).toBeTruthy()
            })
        })

        test('should show error placeholder on load failure', async () => {
            mockedOcto.getFileAsDataUrl.mockResolvedValue({
                url: '',
            })

            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.VideoElement__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should show error placeholder on exception', async () => {
            mockedOcto.getFileAsDataUrl.mockRejectedValue(new Error('Network error'))

            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.VideoElement__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should open viewer on click', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const overlay = document.querySelector('.VideoElement__overlay')
                if (overlay) {
                    fireEvent.click(overlay)
                }
            })

            await waitFor(() => {
                expect(screen.queryByTestId('root-portal')).toBeTruthy()
            })
        })

        test('should open viewer on Enter key', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const overlay = document.querySelector('.VideoElement__overlay')
                if (overlay) {
                    fireEvent.keyDown(overlay, {key: 'Enter'})
                }
            })

            await waitFor(() => {
                expect(screen.queryByTestId('root-portal')).toBeTruthy()
            })
        })

        test('should open viewer on Space key', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const overlay = document.querySelector('.VideoElement__overlay')
                if (overlay) {
                    fireEvent.keyDown(overlay, {key: ' '})
                }
            })

            await waitFor(() => {
                expect(screen.queryByTestId('root-portal')).toBeTruthy()
            })
        })

        test('should show filename in metadata', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const metadata = document.querySelector('.VideoElement__source')
                expect(metadata?.textContent).toBe('test-video.mp4')
            })
        })
    })

    describe('YouTube video type', () => {
        const youtubeBlock: VideoBlock = {
            ...defaultBlock,
            fields: {
                sourceType: 'youtube',
                videoId: 'dQw4w9WgXcQ',
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            },
        }

        test('should match snapshot for YouTube video', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={youtubeBlock}
                />,
            )
            let container: Element | undefined
            await act(async () => {
                const {container: c} = render(component)
                container = c
            })
            expect(container).toMatchSnapshot()
        })

        test('should display YouTube thumbnail', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={youtubeBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            const thumbnail = document.querySelector('.VideoElement__thumbnail') as HTMLImageElement
            expect(thumbnail).toBeTruthy()
            expect(thumbnail.src).toContain('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg')
        })

        test('should show YouTube source label', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={youtubeBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const metadata = document.querySelector('.VideoElement__source')
                expect(metadata?.textContent).toBe('YouTube')
            })
        })

        test('should open viewer on click', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={youtubeBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const overlay = document.querySelector('.VideoElement__overlay')
                if (overlay) {
                    fireEvent.click(overlay)
                }
            })

            await waitFor(() => {
                expect(screen.queryByTestId('root-portal')).toBeTruthy()
            })
        })
    })

    describe('Google Drive video type', () => {
        const gdriveBlock: VideoBlock = {
            ...defaultBlock,
            fields: {
                sourceType: 'gdrive',
                videoId: 'abc123xyz456',
                videoUrl: 'https://drive.google.com/file/d/abc123xyz456/view',
            },
        }

        test('should match snapshot for Google Drive video', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={gdriveBlock}
                />,
            )
            let container: Element | undefined
            await act(async () => {
                const {container: c} = render(component)
                container = c
            })
            expect(container).toMatchSnapshot()
        })

        test('should display Google Drive placeholder icon', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={gdriveBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            const placeholder = document.querySelector('.VideoElement__gdrive-placeholder')
            expect(placeholder).toBeTruthy()
        })

        test('should show Google Drive source label', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={gdriveBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const metadata = document.querySelector('.VideoElement__source')
                expect(metadata?.textContent).toBe('Google Drive')
            })
        })

        test('should open viewer on click', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={gdriveBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const overlay = document.querySelector('.VideoElement__overlay')
                if (overlay) {
                    fireEvent.click(overlay)
                }
            })

            await waitFor(() => {
                expect(screen.queryByTestId('root-portal')).toBeTruthy()
            })
        })
    })

    describe('edge cases', () => {
        test('should return null for block without videoId when sourceType is youtube', async () => {
            const invalidBlock: VideoBlock = {
                ...defaultBlock,
                fields: {
                    sourceType: 'youtube',
                    videoId: '',
                },
            }

            const component = wrapIntl(
                <VideoElement
                    block={invalidBlock}
                />,
            )
            let container: Element | undefined
            await act(async () => {
                const {container: c} = render(component)
                container = c
            })

            // Should render null (empty container)
            expect(container?.firstChild).toBeNull()
        })

        test('should return null for block without videoId when sourceType is gdrive', async () => {
            const invalidBlock: VideoBlock = {
                ...defaultBlock,
                fields: {
                    sourceType: 'gdrive',
                    videoId: '',
                },
            }

            const component = wrapIntl(
                <VideoElement
                    block={invalidBlock}
                />,
            )
            let container: Element | undefined
            await act(async () => {
                const {container: c} = render(component)
                container = c
            })

            // Should render null (empty container)
            expect(container?.firstChild).toBeNull()
        })

        test('should return null for file video without fileId', async () => {
            const invalidBlock: VideoBlock = {
                ...defaultBlock,
                fields: {
                    sourceType: 'file',
                    fileId: '',
                },
            }

            const component = wrapIntl(
                <VideoElement
                    block={invalidBlock}
                />,
            )
            let container: Element | undefined
            await act(async () => {
                const {container: c} = render(component)
                container = c
            })

            // Should render null (empty container)
            expect(container?.firstChild).toBeNull()
        })
    })

    describe('accessibility', () => {
        test('should have proper ARIA labels for video overlay', async () => {
            const component = wrapIntl(
                <VideoElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const overlay = document.querySelector('.VideoElement__overlay')
                expect(overlay).toBeTruthy()
                expect(overlay?.getAttribute('role')).toBe('button')
                expect(overlay?.getAttribute('tabindex')).toBe('0')
            })
        })
    })
})
