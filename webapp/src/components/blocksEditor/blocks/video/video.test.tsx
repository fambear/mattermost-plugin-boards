// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React from 'react'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {mocked} from 'jest-mock'

import octoClient from '../../../../octoClient'

import {wrapIntl} from '../../../../testUtils'

import VideoBlock from '.'

jest.mock('../../../../octoClient')
jest.mock('../../../rootPortal', () => ({
    __esModule: true,
    default: ({children}: {children: React.ReactNode}) => <div data-testid='root-portal'>{children}</div>,
}))

describe('components/blocksEditor/blocks/video', () => {
    const mockOnSave = jest.fn()
    const mockOnCancel = jest.fn()
    const mockOnChange = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Display component', () => {
        test('should match Display snapshot for file upload', async () => {
            const mockedOcto = mocked(octoClient, true)
            mockedOcto.getFileAsDataUrl.mockResolvedValue({url: 'test.jpg'})
            const Component = VideoBlock.Display
            const {container} = render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{file: 'test', filename: 'test-filename', sourceType: 'file'}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))
            await screen.findByTestId('video')
            expect(container).toMatchSnapshot()
        })

        test('should match Display snapshot for file upload with fileId', async () => {
            const mockedOcto = mocked(octoClient, true)
            mockedOcto.getFileAsDataUrl.mockResolvedValue({url: 'test.mp4'})
            const Component = VideoBlock.Display
            const {container} = render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{fileId: 'test-file-id', filename: 'test-video.mp4', sourceType: 'file'}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))
            await screen.findByTestId('video')
            expect(container).toMatchSnapshot()
            expect(mockedOcto.getFileAsDataUrl).toHaveBeenCalledWith('', 'test-file-id')
        })

        test('should match Display snapshot for YouTube', async () => {
            const Component = VideoBlock.Display
            const {container} = render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{sourceType: 'youtube', videoId: 'dQw4w9WgXcQ', videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ'}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))
            await screen.findByTestId('video-thumbnail')
            expect(container).toMatchSnapshot()
        })

        test('should match Display snapshot for Google Drive', async () => {
            const Component = VideoBlock.Display
            const {container} = render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{sourceType: 'gdrive', videoId: 'abc123xyz456', videoUrl: 'https://drive.google.com/file/d/abc123xyz456/view'}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))
            expect(container.querySelector('.VideoElement__gdrive-placeholder')).toBeTruthy()
            expect(container).toMatchSnapshot()
        })

        test('should match Display snapshot with empty value', async () => {
            const Component = VideoBlock.Display
            const {container} = render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{file: '', filename: ''}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                    currentBoardId=''
                />,
            ))
            expect(container).toMatchSnapshot()
        })

        test('should open viewer when clicking YouTube video thumbnail', async () => {
            const Component = VideoBlock.Display
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{sourceType: 'youtube', videoId: 'dQw4w9WgXcQ'}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))

            const thumbnail = screen.getByTestId('video-thumbnail')
            fireEvent.click(thumbnail)

            await waitFor(() => {
                expect(screen.queryByTestId('root-portal')).toBeTruthy()
            })
        })

        test('should open viewer with Enter key', async () => {
            const Component = VideoBlock.Display
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{sourceType: 'youtube', videoId: 'dQw4w9WgXcQ'}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))

            const overlay = screen.getByRole('button')
            fireEvent.keyDown(overlay, {key: 'Enter'})

            await waitFor(() => {
                expect(screen.queryByTestId('root-portal')).toBeTruthy()
            })
        })

        test('should open viewer with Space key', async () => {
            const Component = VideoBlock.Display
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{sourceType: 'youtube', videoId: 'dQw4w9WgXcQ'}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))

            const overlay = screen.getByRole('button')
            fireEvent.keyDown(overlay, {key: ' '})

            await waitFor(() => {
                expect(screen.queryByTestId('root-portal')).toBeTruthy()
            })
        })
    })

    describe('Input component', () => {
        test('should match Input snapshot', async () => {
            const Component = VideoBlock.Input
            const {container} = render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{file: 'test', filename: 'test-filename'}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))
            expect(container).toMatchSnapshot()
        })

        test('should match Input snapshot with empty input', async () => {
            const Component = VideoBlock.Input
            const {container} = render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{file: '', filename: ''}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))
            expect(container).toMatchSnapshot()
        })

        test('should handle URL input and submission', async () => {
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={jest.fn()}
                    onSave={onSave}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.change(input, {target: {value: 'https://youtube.com/watch?v=dQw4w9WgXcQ'}})

            const addButton = screen.getByText('Add')
            fireEvent.click(addButton)

            expect(onSave).toBeCalledWith({
                sourceType: 'youtube',
                videoId: 'dQw4w9WgXcQ',
                videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
            })
        })

        test('should switch to file upload mode', async () => {
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={jest.fn()}
                    onSave={jest.fn()}
                />,
            ))

            const uploadButton = screen.getByText('Upload File')
            fireEvent.click(uploadButton)

            // After clicking, the file input should be shown
            const fileInput = screen.getByTestId('video-input')
            expect(fileInput).toBeTruthy()
        })

        test('should save file on file selection', async () => {
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            const file = new File(['video content'], 'test.mp4', {type: 'video/mp4'})

            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={jest.fn()}
                    onSave={onSave}
                />,
            ))

            const uploadButton = screen.getByText('Upload File')
            fireEvent.click(uploadButton)

            const fileInput = screen.getByTestId('video-input')
            fireEvent.change(fileInput, {target: {files: [file]}})

            expect(onSave).toHaveBeenCalledWith({
                file,
                filename: 'test.mp4',
                sourceType: 'file',
            })
        })

        test('should cancel when no file selected', async () => {
            const onCancel = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={onCancel}
                    onSave={jest.fn()}
                />,
            ))

            const uploadButton = screen.getByText('Upload File')
            fireEvent.click(uploadButton)

            const fileInput = screen.getByTestId('video-input')
            fireEvent.change(fileInput, {target: {files: []}})

            expect(onCancel).toHaveBeenCalled()
        })

        test('should cancel on empty URL', async () => {
            const onCancel = jest.fn()
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={onCancel}
                    onSave={onSave}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.change(input, {target: {value: '   '}})
            fireEvent.click(screen.getByText('Add'))

            expect(onSave).not.toHaveBeenCalled()
            expect(onCancel).toHaveBeenCalled()
        })

        test('should cancel on invalid URL', async () => {
            const onCancel = jest.fn()
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={onCancel}
                    onSave={onSave}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.change(input, {target: {value: 'https://example.com/not-a-video'}})
            fireEvent.click(screen.getByText('Add'))

            expect(onSave).not.toHaveBeenCalled()
            expect(onCancel).toHaveBeenCalled()
        })

        test('should cancel on Escape key', async () => {
            const onCancel = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={onCancel}
                    onSave={jest.fn()}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.keyDown(input, {key: 'Escape'})

            expect(onCancel).toHaveBeenCalled()
        })
    })

    describe('URL detection patterns', () => {
        test('should detect youtube.com/watch URL', () => {
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={jest.fn()}
                    onSave={onSave}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.change(input, {target: {value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}})
            fireEvent.click(screen.getByText('Add'))

            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                sourceType: 'youtube',
                videoId: 'dQw4w9WgXcQ',
            }))
        })

        test('should detect youtu.be short URL', () => {
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={jest.fn()}
                    onSave={onSave}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.change(input, {target: {value: 'https://youtu.be/dQw4w9WgXcQ'}})
            fireEvent.click(screen.getByText('Add'))

            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                sourceType: 'youtube',
                videoId: 'dQw4w9WgXcQ',
            }))
        })

        test('should detect youtube.com/embed URL', () => {
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={jest.fn()}
                    onSave={onSave}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.change(input, {target: {value: 'https://www.youtube.com/embed/dQw4w9WgXcQ'}})
            fireEvent.click(screen.getByText('Add'))

            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                sourceType: 'youtube',
                videoId: 'dQw4w9WgXcQ',
            }))
        })

        test('should detect drive.google.com/file URL', () => {
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={jest.fn()}
                    onSave={onSave}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.change(input, {target: {value: 'https://drive.google.com/file/d/abc123xyz456/view'}})
            fireEvent.click(screen.getByText('Add'))

            expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
                sourceType: 'gdrive',
                videoId: 'abc123xyz456',
            }))
        })

        test('should reject invalid URL', () => {
            const onSave = jest.fn()
            const onCancel = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={{}}
                    onCancel={onCancel}
                    onSave={onSave}
                />,
            ))

            const input = screen.getByPlaceholderText('Paste YouTube or Google Drive URL...')
            fireEvent.change(input, {target: {value: 'https://vimeo.com/123456'}})
            fireEvent.click(screen.getByText('Add'))

            expect(onSave).not.toHaveBeenCalled()
            expect(onCancel).toHaveBeenCalled()
        })
    })

    describe('Auto-detection from string value', () => {
        test('should auto-detect YouTube URL from string value', async () => {
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={'https://www.youtube.com/watch?v=dQw4w9WgXcQ' as any}
                    onCancel={jest.fn()}
                    onSave={onSave}
                />,
            ))

            await waitFor(() => {
                expect(onSave).toHaveBeenCalledWith({
                    sourceType: 'youtube',
                    videoId: 'dQw4w9WgXcQ',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                })
            })
        })

        test('should auto-detect Google Drive URL from string value', async () => {
            const onSave = jest.fn()
            const Component = VideoBlock.Input
            render(wrapIntl(
                <Component
                    onChange={jest.fn()}
                    value={'https://drive.google.com/file/d/abc123xyz456/view' as any}
                    onCancel={jest.fn()}
                    onSave={onSave}
                />,
            ))

            await waitFor(() => {
                expect(onSave).toHaveBeenCalledWith({
                    sourceType: 'gdrive',
                    videoId: 'abc123xyz456',
                    videoUrl: 'https://drive.google.com/file/d/abc123xyz456/view',
                })
            })
        })
    })
})
