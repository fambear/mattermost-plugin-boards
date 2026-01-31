// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useRef, useCallback} from 'react'
import {useIntl} from 'react-intl'
import {useHotkeys} from 'react-hotkeys-hook'

import CompassIcon from '../../widgets/icons/compassIcon'
import IconButton from '../../widgets/buttons/iconButton'
import CloseIcon from '../../widgets/icons/close'

import './videoAddDialog.scss'

type VideoSourceType = 'file' | 'youtube' | 'gdrive'

// URL detection patterns
const YOUTUBE_PATTERNS = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
]

const GDRIVE_PATTERN = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/

const detectVideoSource = (url: string): {sourceType: VideoSourceType; videoId: string} | null => {
    for (const pattern of YOUTUBE_PATTERNS) {
        const match = url.match(pattern)
        if (match) {
            return {sourceType: 'youtube', videoId: match[1]}
        }
    }
    const gdriveMatch = url.match(GDRIVE_PATTERN)
    if (gdriveMatch) {
        return {sourceType: 'gdrive', videoId: gdriveMatch[1]}
    }
    return null
}

export type VideoAddResult = {
    type: 'file'
    file: File
} | {
    type: 'url'
    sourceType: VideoSourceType
    videoId: string
    videoUrl: string
} | null

type Props = {
    onSelect: (result: VideoAddResult) => void
    onClose: () => void
}

const VideoAddDialog = (props: Props): JSX.Element => {
    const {onSelect, onClose} = props
    const intl = useIntl()
    const [urlInput, setUrlInput] = useState('')
    const [urlError, setUrlError] = useState('')
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useHotkeys('esc', (e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
    }, {enableOnFormTags: ['INPUT']})

    const handleUrlSubmit = useCallback(() => {
        const trimmed = urlInput.trim()
        if (!trimmed) {
            return
        }
        const detected = detectVideoSource(trimmed)
        if (detected) {
            onSelect({
                type: 'url',
                sourceType: detected.sourceType,
                videoId: detected.videoId,
                videoUrl: trimmed,
            })
        } else {
            setUrlError(intl.formatMessage({
                id: 'VideoAddDialog.invalidUrl',
                defaultMessage: 'Unsupported URL. Use YouTube or Google Drive links.',
            }))
        }
    }, [urlInput, onSelect, intl])

    const handleFileSelected = useCallback((file: File) => {
        if (file.type.startsWith('video/')) {
            onSelect({type: 'file', file})
        } else {
            setUrlError(intl.formatMessage({
                id: 'VideoAddDialog.notVideo',
                defaultMessage: 'Please select a video file.',
            }))
        }
    }, [onSelect, intl])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) {
            handleFileSelected(file)
        }
    }, [handleFileSelected])

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileSelected(file)
        }
    }, [handleFileSelected])

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }, [onClose])

    return (
        <div
            className='VideoAddDialog'
            onClick={handleBackdropClick}
        >
            <div className='VideoAddDialog__backdrop'/>
            <div className='VideoAddDialog__wrapper' onClick={handleBackdropClick}>
                <div
                    className='VideoAddDialog__dialog'
                    role='dialog'
                    aria-label={intl.formatMessage({id: 'VideoAddDialog.title', defaultMessage: 'Add video'})}
                >
                    <div className='VideoAddDialog__header'>
                        <h2 className='VideoAddDialog__title'>
                            <CompassIcon icon='file-video-outline'/>
                            {intl.formatMessage({id: 'VideoAddDialog.title', defaultMessage: 'Add video'})}
                        </h2>
                        <IconButton
                            onClick={onClose}
                            icon={<CloseIcon/>}
                            title={intl.formatMessage({id: 'VideoAddDialog.close', defaultMessage: 'Close'})}
                            size='medium'
                        />
                    </div>

                    <div className='VideoAddDialog__body'>
                        {/* Drop zone for file upload */}
                        <div
                            className={`VideoAddDialog__dropzone ${isDragging ? 'VideoAddDialog__dropzone--active' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            role='button'
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    fileInputRef.current?.click()
                                }
                            }}
                        >
                            <CompassIcon
                                icon='upload'
                                className='VideoAddDialog__upload-icon'
                            />
                            <span className='VideoAddDialog__dropzone-text'>
                                {intl.formatMessage({
                                    id: 'VideoAddDialog.dropzone',
                                    defaultMessage: 'Drop a video file here or click to browse',
                                })}
                            </span>
                            <span className='VideoAddDialog__dropzone-hint'>
                                {intl.formatMessage({
                                    id: 'VideoAddDialog.dropzoneHint',
                                    defaultMessage: 'MP4, WebM, MOV, AVI',
                                })}
                            </span>
                            <input
                                ref={fileInputRef}
                                type='file'
                                accept='video/*'
                                className='VideoAddDialog__file-input'
                                onChange={handleFileInputChange}
                            />
                        </div>

                        {/* Separator */}
                        <div className='VideoAddDialog__separator'>
                            <span>{intl.formatMessage({id: 'VideoAddDialog.or', defaultMessage: 'or'})}</span>
                        </div>

                        {/* URL input */}
                        <div className='VideoAddDialog__url-section'>
                            <label
                                className='VideoAddDialog__url-label'
                                htmlFor='video-add-url-input'
                            >
                                {intl.formatMessage({
                                    id: 'VideoAddDialog.urlLabel',
                                    defaultMessage: 'Paste a video link',
                                })}
                            </label>
                            <div className='VideoAddDialog__url-input-row'>
                                <input
                                    id='video-add-url-input'
                                    className='VideoAddDialog__url-input'
                                    type='text'
                                    placeholder={intl.formatMessage({
                                        id: 'VideoAddDialog.urlPlaceholder',
                                        defaultMessage: 'https://youtube.com/watch?v=... or drive.google.com/file/d/...',
                                    })}
                                    value={urlInput}
                                    onChange={(e) => {
                                        setUrlInput(e.target.value)
                                        setUrlError('')
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleUrlSubmit()
                                        }
                                    }}
                                    autoFocus={false}
                                />
                                <button
                                    className='VideoAddDialog__url-submit'
                                    onClick={handleUrlSubmit}
                                    disabled={!urlInput.trim()}
                                >
                                    {intl.formatMessage({id: 'VideoAddDialog.add', defaultMessage: 'Add'})}
                                </button>
                            </div>
                            {urlError && (
                                <span className='VideoAddDialog__url-error'>{urlError}</span>
                            )}
                            <div className='VideoAddDialog__url-providers'>
                                <span className='VideoAddDialog__provider'>
                                    <CompassIcon icon='youtube'/>
                                    YouTube
                                </span>
                                <span className='VideoAddDialog__provider'>
                                    <CompassIcon icon='google-drive'/>
                                    Google Drive
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default React.memo(VideoAddDialog)
