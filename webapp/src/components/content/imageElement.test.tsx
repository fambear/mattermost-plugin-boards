// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render, fireEvent, waitFor, cleanup} from '@testing-library/react'
import {act} from 'react-dom/test-utils'

import {ImageBlock} from '../../blocks/imageBlock'

import {wrapIntl} from '../../testUtils'

import octoClient from '../../octoClient'

import ImageElement from './imageElement'

jest.mock('../../octoClient')


jest.mock('../rootPortal', () => ({
    __esModule: true,
    default: ({children}: {children: React.ReactNode}) => <div data-testid='root-portal'>{children}</div>,
}))

describe('components/content/ImageElement', () => {
    const defaultBlock: ImageBlock = {
        id: 'test-id',
        boardId: '1',
        parentId: '',
        modifiedBy: 'test-user-id',
        schema: 0,
        type: 'image',
        title: 'test-title',
        fields: {
            fileId: 'test.jpg',
        },
        createdBy: 'test-user-id',
        createAt: 0,
        updateAt: 0,
        deleteAt: 0,
        limited: false,
    }

    afterEach(async () => {
        cleanup()
        await new Promise((resolve) => setTimeout(resolve, 0))
    })

    beforeEach(() => {
        jest.clearAllMocks()
        ;(octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: 'test.jpg'})
        ;(octoClient.getFileInfo as jest.Mock).mockResolvedValue({
            url: 'test.jpg',
            name: 'test-image.jpg',
            extension: '.jpg',
            size: 165002,
        })
        ;(octoClient.getFileImageMetadata as jest.Mock).mockResolvedValue({width: 800, height: 600})
        ;(octoClient.patchBlock as jest.Mock).mockResolvedValue({})
    })

    test('should match snapshot', async () => {
        const component = wrapIntl(
            <ImageElement
                block={defaultBlock}
            />,
        )
        let imageContainer: Element | undefined
        await act(async () => {
            const {container} = render(component)
            imageContainer = container
        })
        expect(imageContainer).toMatchSnapshot()
    })

    test('archived file', async () => {
        (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({
            archived: true,
            name: 'Filename',
            extension: '.txt',
            size: 165002,
        })
        ;(octoClient.getFileInfo as jest.Mock).mockResolvedValue({
            archived: true,
            name: 'Filename',
            extension: '.txt',
            size: 165002,
        })

        const component = wrapIntl(
            <ImageElement
                block={defaultBlock}
            />,
        )
        let imageContainer: Element | undefined
        await act(async () => {
            const {container} = render(component)
            imageContainer = container
        })
        expect(imageContainer).toMatchSnapshot()
    })

    describe('loading state', () => {
        test('should show loading spinner while image is loading', async () => {
            // Create a promise that we can resolve manually
            let resolveLoad: (value: {url: string}) => void
            (octoClient.getFileAsDataUrl as jest.Mock).mockImplementation(() => new Promise((resolve) => {
                resolveLoad = resolve
            }))

            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Should show loading spinner (rendered directly, not via MediaLoader wrapper)
            const spinnerElement = document.querySelector('.MediaLoader__spinner')
            expect(spinnerElement).toBeTruthy()

            // Resolve the promise
            await act(async () => {
                resolveLoad!({url: 'test.jpg'})
            })

            // Spinner stays until img onLoad fires
            await act(async () => {
                const img = document.querySelector('.ImageElement') as HTMLImageElement
                if (img) {
                    fireEvent.load(img)
                }
            })

            // Wait for spinner to disappear
            await waitFor(() => {
                const spinner = document.querySelector('.MediaLoader__spinner')
                expect(spinner).toBeNull()
            })
        })

        test('should hide loading spinner after image loads', async () => {
            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Fire onLoad on the img element
            await act(async () => {
                const img = document.querySelector('.ImageElement') as HTMLImageElement
                if (img) {
                    fireEvent.load(img)
                }
            })

            await waitFor(() => {
                const spinner = document.querySelector('.MediaLoader__spinner')
                expect(spinner).toBeNull()
            })
        })
    })

    describe('error state', () => {
        test('should show error state when image fails to load (empty url)', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: ''})

            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.MediaLoader__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should show error state when getFileAsDataUrl throws exception', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockRejectedValue(new Error('Network error'))

            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const errorElement = document.querySelector('.MediaLoader__error')
                expect(errorElement).toBeTruthy()
            })
        })

        test('should show retry button on error', async () => {
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: ''})

            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                expect(retryButton).toBeTruthy()
            })
        })

        test('should retry loading when retry button is clicked', async () => {
            // First call fails
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValueOnce({url: ''})

            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                expect(retryButton).toBeTruthy()
            })

            // Second call succeeds
            ;(octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: 'test.jpg'})

            await act(async () => {
                const retryButton = document.querySelector('.MediaLoader__retry-button')
                if (retryButton) {
                    fireEvent.click(retryButton)
                }
            })

            // Should have called getFileAsDataUrl twice (initial + retry)
            expect((octoClient.getFileAsDataUrl as jest.Mock)).toHaveBeenCalledTimes(2)
        })

        test('should track multiple retry attempts', async () => {
            // All calls fail
            (octoClient.getFileAsDataUrl as jest.Mock).mockResolvedValue({url: ''})

            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Click retry button 3 times
            for (let i = 0; i < 3; i++) {
                await waitFor(() => {
                    const retryButton = document.querySelector('.MediaLoader__retry-button')
                    expect(retryButton).toBeTruthy()
                })

                await act(async () => {
                    const retryButton = document.querySelector('.MediaLoader__retry-button')
                    if (retryButton) {
                        fireEvent.click(retryButton)
                    }
                })
            }

            // Should have called getFileAsDataUrl 4 times (initial + 3 retries)
            expect((octoClient.getFileAsDataUrl as jest.Mock)).toHaveBeenCalledTimes(4)
        })
    })

    describe('accessibility', () => {
        test('should have proper ARIA labels for image overlay', async () => {
            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const overlay = document.querySelector('.ImageElement__overlay')
                expect(overlay).toBeTruthy()
                expect(overlay?.getAttribute('role')).toBe('button')
                expect(overlay?.getAttribute('tabindex')).toBe('0')
            })
        })
    })

    describe('loaded state', () => {
        test('should display image when loaded successfully', async () => {
            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            await waitFor(() => {
                const image = document.querySelector('.ImageElement') as HTMLImageElement
                expect(image).toBeTruthy()
                expect(image.src).toContain('test.jpg')
            })
        })

        test('should show image metadata when loaded', async () => {
            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Fire onLoad to transition to loaded state
            await act(async () => {
                const img = document.querySelector('.ImageElement') as HTMLImageElement
                if (img) {
                    fireEvent.load(img)
                }
            })

            await waitFor(() => {
                const metadata = document.querySelector('.ImageElement__metadata')
                expect(metadata).toBeTruthy()
            })
        })

        test('should show download link when loaded', async () => {
            const component = wrapIntl(
                <ImageElement
                    block={defaultBlock}
                />,
            )
            await act(async () => {
                render(component)
            })

            // Fire onLoad to transition to loaded state
            await act(async () => {
                const img = document.querySelector('.ImageElement') as HTMLImageElement
                if (img) {
                    fireEvent.load(img)
                }
            })

            await waitFor(() => {
                const downloadLink = document.querySelector('.ImageElement__download')
                expect(downloadLink).toBeTruthy()
            })
        })
    })
})
