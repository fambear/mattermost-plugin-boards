// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useCallback} from 'react'
import {IntlShape, useIntl} from 'react-intl'

import {ContentBlock} from '../../blocks/contentBlock'
import {VideoBlock, createVideoBlock, VideoSourceType} from '../../blocks/videoBlock'
import octoClient from '../../octoClient'
import {Utils} from '../../utils'
import CompassIcon from '../../widgets/icons/compassIcon'
import {sendFlashMessage} from '../../components/flashMessages'
import VideoViewer from '../videoViewer/videoViewer'
import RootPortal from '../rootPortal'

import {contentRegistry} from './contentRegistry'

import './videoElement.scss'

type Props = {
    block: ContentBlock
}

// URL detection patterns
const YOUTUBE_PATTERNS = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
]

const GDRIVE_PATTERN = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/

const detectVideoSource = (url: string): {sourceType: VideoSourceType; videoId: string} | null => {
    // Check YouTube patterns
    for (const pattern of YOUTUBE_PATTERNS) {
        const match = url.match(pattern)
        if (match) {
            return {sourceType: 'youtube', videoId: match[1]}
        }
    }

    // Check Google Drive pattern
    const gdriveMatch = url.match(GDRIVE_PATTERN)
    if (gdriveMatch) {
        return {sourceType: 'gdrive', videoId: gdriveMatch[1]}
    }

    return null
}

const VideoElement = (props: Props): JSX.Element|null => {
    const [videoDataUrl, setVideoDataUrl] = useState<string|null>(null)
    const [showViewer, setShowViewer] = useState(false)
    const [loadError, setLoadError] = useState(false)
    const intl = useIntl()

    const {block} = props
    const videoBlock = block as VideoBlock
    const sourceType = videoBlock.fields.sourceType || 'file'
    const videoId = videoBlock.fields.videoId || ''

    useEffect(() => {
        if (sourceType === 'file' && !videoDataUrl && !loadError) {
            const loadVideo = async () => {
                const fileId = videoBlock.fields.fileId
                if (fileId) {
                    try {
                        const fileURL = await octoClient.getFileAsDataUrl(block.boardId, fileId)
                        if (fileURL.url && fileURL.url.length > 0) {
                            setVideoDataUrl(fileURL.url)
                        } else {
                            setLoadError(true)
                            sendFlashMessage({
                                content: intl.formatMessage({
                                    id: 'VideoElement.load-failed',
                                    defaultMessage: 'Unable to load video file',
                                }),
                                severity: 'normal',
                            })
                        }
                    } catch (error) {
                        Utils.logError(`Failed to load video file: ${error}`)
                        setLoadError(true)
                        sendFlashMessage({
                            content: intl.formatMessage({
                                id: 'VideoElement.load-failed',
                                defaultMessage: 'Unable to load video file',
                            }),
                            severity: 'normal',
                        })
                    }
                }
            }
            loadVideo()
        }
    }, [videoBlock.fields.fileId, block.boardId, sourceType, videoDataUrl, loadError, intl])

    const handleVideoClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        setShowViewer(true)
    }, [])

    const handleVideoKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setShowViewer(true)
        }
    }, [])

    const handleCloseViewer = useCallback(() => {
        setShowViewer(false)
    }, [])

    // Show error placeholder if loading failed
    if (loadError && sourceType === 'file') {
        return (
            <div className='VideoElement__error'>
                <CompassIcon
                    icon='alert-outline'
                    className='ErrorIcon'
                />
                <span>
                    {intl.formatMessage({
                        id: 'VideoElement.error',
                        defaultMessage: 'Unable to load video',
                    })}
                </span>
            </div>
        )
    }

    // YouTube embed
    if (sourceType === 'youtube' && videoId) {
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        return (
            <>
                <div className='VideoElement__container'>
                    <div className='VideoElement__wrapper'>
                        <img
                            className='VideoElement__thumbnail'
                            src={thumbnailUrl}
                            alt='Video thumbnail'
                            data-testid='video-thumbnail'
                        />
                        <div
                            className='VideoElement__overlay'
                            onClick={handleVideoClick}
                            onKeyDown={handleVideoKeyDown}
                            tabIndex={0}
                            role='button'
                            aria-label='Play video in full screen'
                        >
                            <div className='VideoElement__play-icon'>
                                <CompassIcon
                                    icon='play'
                                    className='PlayIcon'
                                />
                            </div>
                        </div>
                    </div>
                    <div className='VideoElement__metadata'>
                        <span className='VideoElement__source'>{intl.formatMessage({id: 'VideoElement.youtube', defaultMessage: 'YouTube'})}</span>
                    </div>
                </div>
                {showViewer && (
                    <RootPortal>
                        <VideoViewer
                            sourceType='youtube'
                            videoId={videoId}
                            onClose={handleCloseViewer}
                        />
                    </RootPortal>
                )}
            </>
        )
    }

    // Google Drive embed
    if (sourceType === 'gdrive' && videoId) {
        return (
            <>
                <div className='VideoElement__container'>
                    <div className='VideoElement__wrapper'>
                        <div className='VideoElement__gdrive-placeholder'>
                            <CompassIcon
                                icon='file-video-outline'
                                className='GDriveIcon'
                            />
                        </div>
                        <div
                            className='VideoElement__overlay'
                            onClick={handleVideoClick}
                            onKeyDown={handleVideoKeyDown}
                            tabIndex={0}
                            role='button'
                            aria-label='Play video in full screen'
                        >
                            <div className='VideoElement__play-icon'>
                                <CompassIcon
                                    icon='play'
                                    className='PlayIcon'
                                />
                            </div>
                        </div>
                    </div>
                    <div className='VideoElement__metadata'>
                        <span className='VideoElement__source'>{intl.formatMessage({id: 'VideoElement.gdrive', defaultMessage: 'Google Drive'})}</span>
                    </div>
                </div>
                {showViewer && (
                    <RootPortal>
                        <VideoViewer
                            sourceType='gdrive'
                            videoId={videoId}
                            onClose={handleCloseViewer}
                        />
                    </RootPortal>
                )}
            </>
        )
    }

    // File upload
    if (videoDataUrl) {
        return (
            <>
                <div className='VideoElement__container'>
                    <div className='VideoElement__wrapper'>
                        <video
                            className='VideoElement__preview'
                            data-testid='video'
                        >
                            <source src={videoDataUrl}/>
                        </video>
                        <div
                            className='VideoElement__overlay'
                            onClick={handleVideoClick}
                            onKeyDown={handleVideoKeyDown}
                            tabIndex={0}
                            role='button'
                            aria-label='Play video in full screen'
                        >
                            <div className='VideoElement__play-icon'>
                                <CompassIcon
                                    icon='play'
                                    className='PlayIcon'
                                />
                            </div>
                        </div>
                    </div>
                    <div className='VideoElement__metadata'>
                        <span className='VideoElement__source'>{videoBlock.fields.filename || intl.formatMessage({id: 'VideoElement.file', defaultMessage: 'Video'})}</span>
                    </div>
                </div>
                {showViewer && (
                    <RootPortal>
                        <VideoViewer
                            sourceType='file'
                            videoUrl={videoDataUrl}
                            onClose={handleCloseViewer}
                        />
                    </RootPortal>
                )}
            </>
        )
    }

    return null
}


contentRegistry.registerContentType({
    type: 'video',
    getDisplayText: (intl: IntlShape) => intl.formatMessage({id: 'ContentBlock.video', defaultMessage: 'video'}),
    getIcon: () => <CompassIcon icon='file-video-outline'/>,
    createBlock: async (boardId: string, intl: IntlShape) => {
        return new Promise<VideoBlock>((resolve) => {
            const promptForUrl = () => {
                const url = window.prompt(intl.formatMessage({
                    id: 'VideoElement.enterUrl',
                    defaultMessage: 'Enter YouTube or Google Drive URL (or leave empty to upload a file):',
                }))

                if (url === null) {
                    // User cancelled - resolve with empty block instead of rejecting
                    resolve(createVideoBlock())
                    return
                }

                if (url.trim()) {
                    // User entered a URL - use trimmed URL
                    const trimmedUrl = url.trim()
                    const detected = detectVideoSource(trimmedUrl)
                    if (detected) {
                        const block = createVideoBlock()
                        block.fields.sourceType = detected.sourceType
                        block.fields.videoId = detected.videoId
                        block.fields.videoUrl = trimmedUrl
                        resolve(block)
                    } else {
                        sendFlashMessage({
                            content: intl.formatMessage({
                                id: 'createVideoBlock.invalidUrl',
                                defaultMessage: 'Invalid video URL. Please use YouTube or Google Drive links.',
                            }),
                            severity: 'normal',
                        })
                        // Resolve with empty block instead of rejecting to avoid unhandled promise rejection
                        resolve(createVideoBlock())
                    }
                } else {
                    // User wants to upload a file
                    Utils.selectLocalFile(async (file) => {
                        try {
                            const fileId = await octoClient.uploadFile(boardId, file)
                            if (fileId) {
                                const block = createVideoBlock()
                                block.fields.fileId = fileId
                                block.fields.filename = file.name
                                block.fields.sourceType = 'file'
                                resolve(block)
                            } else {
                                sendFlashMessage({
                                    content: intl.formatMessage({
                                        id: 'createVideoBlock.failed',
                                        defaultMessage: 'Unable to upload the file. File size limit reached.',
                                    }),
                                    severity: 'normal',
                                })
                                // Resolve with empty block instead of rejecting
                                resolve(createVideoBlock())
                            }
                        } catch (error) {
                            sendFlashMessage({
                                content: intl.formatMessage({
                                    id: 'createVideoBlock.uploadError',
                                    defaultMessage: 'Error uploading video file.',
                                }),
                                severity: 'normal',
                            })
                            // Resolve with empty block instead of rejecting
                            resolve(createVideoBlock())
                        }
                    }, 'video/*')
                }
            }

            promptForUrl()
        })
    },
    createComponent: (block) => <VideoElement block={block}/>,
})

export default React.memo(VideoElement)
