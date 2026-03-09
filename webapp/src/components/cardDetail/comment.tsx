// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {FC, useRef, useState, useEffect, useCallback} from 'react'
import {useIntl} from 'react-intl'

import {getChannelsNameMapInTeam} from 'mattermost-redux/selectors/entities/channels'

import {Provider} from 'react-redux'

import {Block} from '../../blocks/block'
import mutator from '../../mutator'
import {Utils} from '../../utils'
import IconButton from '../../widgets/buttons/iconButton'
import DeleteIcon from '../../widgets/icons/delete'
import OptionsIcon from '../../widgets/icons/options'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import {getUser} from '../../store/users'
import {useAppSelector} from '../../store/hooks'
import Tooltip from '../../widgets/tooltip'
import GuestBadge from '../../widgets/guestBadge'
import CompassIcon from '../../widgets/icons/compassIcon'
import Files from '../../file'
import FileIcons from '../../fileIcons'

import octoClient from '../../octoClient'
import ImageViewer from '../imageViewer/imageViewer'
import VideoViewer from '../videoViewer/videoViewer'
import RootPortal from '../rootPortal'
import './comment.scss'
import {formatText, messageHtmlToComponent} from '../../webapp_globals'
import {getCurrentTeam} from '../../store/teams'
import {sendFlashMessage} from '../flashMessages'

import {CommentType, CommentAttachment} from '../../blocks/commentBlock'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg']
const VIDEO_EXTENSIONS = ['mp4', 'avi', 'webm', 'mkv', 'wmv', 'mpg', 'mov', 'flv']
const PDF_EXTENSIONS = ['pdf']

type AttachmentType = 'image' | 'video' | 'pdf' | 'file'

const getAttachmentExt = (att: CommentAttachment): string => {
    return att.fileName?.split('.').pop()?.toLowerCase() || ''
}

const getAttachmentType = (att: CommentAttachment): AttachmentType => {
    if (att.mimeType?.startsWith('image/') || IMAGE_EXTENSIONS.includes(getAttachmentExt(att))) {
        return 'image'
    }
    if (att.mimeType?.startsWith('video/') || VIDEO_EXTENSIONS.includes(getAttachmentExt(att))) {
        return 'video'
    }
    if (att.mimeType === 'application/pdf' || PDF_EXTENSIONS.includes(getAttachmentExt(att))) {
        return 'pdf'
    }
    return 'file'
}

const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    for (const [category, extensions] of Object.entries(Files)) {
        if (extensions.includes(ext)) {
            return FileIcons[category] || 'file-outline'
        }
    }
    return 'file-outline'
}

// Image attachment with loading placeholder, miniPreview, and lightbox
const ImageAttachmentPreview: FC<{attachment: CommentAttachment; boardId: string}> = ({attachment, boardId}) => {
    const [url, setUrl] = useState<string>('')
    const [imgLoaded, setImgLoaded] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)
    const [showViewer, setShowViewer] = useState(false)

    useEffect(() => {
        let cancelled = false
        let objectUrl: string | undefined
        octoClient.getFileAsDataUrl(boardId, attachment.fileId).then((fileInfo) => {
            if (cancelled) {
                if (fileInfo.url) {
                    URL.revokeObjectURL(fileInfo.url)
                }
                return
            }
            if (fileInfo.url) {
                objectUrl = fileInfo.url
                setUrl(fileInfo.url)
            } else {
                setLoadFailed(true)
            }
        }).catch(() => {
            if (!cancelled) {
                setLoadFailed(true)
            }
        })
        return () => {
            cancelled = true
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [boardId, attachment.fileId])

    const humanSize = Utils.humanFileSize(attachment.fileSize)

    if (loadFailed) {
        return <FileAttachmentPreview attachment={attachment} boardId={boardId}/>
    }

    const MAX_W = 300
    const MAX_H = 200
    const aw = attachment.width || 0
    const ah = attachment.height || 0
    let placeholderStyle: React.CSSProperties | undefined
    if (aw > 0 && ah > 0) {
        const scale = Math.min(MAX_W / aw, MAX_H / ah, 1)
        placeholderStyle = {
            width: `${Math.round(aw * scale)}px`,
            height: `${Math.round(ah * scale)}px`,
        }
    }
    const miniPreviewSrc = attachment.miniPreview
        ? `data:image/jpeg;base64,${attachment.miniPreview}`
        : undefined

    return (
        <div className='comment-attachment comment-attachment--image'>
            {!imgLoaded && (
                <div
                    className='comment-attachment-placeholder'
                    style={placeholderStyle}
                >
                    {miniPreviewSrc && (
                        <img
                            className='comment-attachment-mini-preview'
                            src={miniPreviewSrc}
                            alt=''
                        />
                    )}
                    <div className='comment-attachment-spinner'>
                        <div className='MediaLoader__spinner'/>
                    </div>
                </div>
            )}
            {url && (
                <img
                    className={!imgLoaded ? 'preloading' : undefined}
                    src={url}
                    alt={attachment.fileName}
                    tabIndex={0}
                    role='button'
                    onClick={() => setShowViewer(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setShowViewer(true)
                        }
                    }}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setLoadFailed(true)}
                />
            )}
            {imgLoaded && (
                <div className='comment-attachment-image-name'>
                    {attachment.fileName}
                    <span className='comment-attachment-size'>{` (${humanSize})`}</span>
                </div>
            )}
            {showViewer && url && (
                <RootPortal>
                    <ImageViewer
                        imageUrl={url}
                        onClose={() => setShowViewer(false)}
                    />
                </RootPortal>
            )}
        </div>
    )
}

// Video attachment with preview thumbnail and VideoViewer playback
const VideoAttachmentPreview: FC<{attachment: CommentAttachment; boardId: string}> = ({attachment, boardId}) => {
    const [url, setUrl] = useState<string>('')
    const [loadFailed, setLoadFailed] = useState(false)
    const [showViewer, setShowViewer] = useState(false)
    const intl = useIntl()

    useEffect(() => {
        let cancelled = false
        let objectUrl: string | undefined
        octoClient.getFileAsDataUrl(boardId, attachment.fileId).then((fileInfo) => {
            if (cancelled) {
                if (fileInfo.url) {
                    URL.revokeObjectURL(fileInfo.url)
                }
                return
            }
            if (fileInfo.url) {
                objectUrl = fileInfo.url
                setUrl(fileInfo.url)
            } else {
                setLoadFailed(true)
            }
        }).catch(() => {
            if (!cancelled) {
                setLoadFailed(true)
            }
        })
        return () => {
            cancelled = true
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [boardId, attachment.fileId])

    if (loadFailed || !url) {
        if (loadFailed) {
            return <FileAttachmentPreview attachment={attachment} boardId={boardId}/>
        }
        return (
            <div className='comment-attachment comment-attachment--video'>
                <div className='comment-attachment-video-wrapper'>
                    <div className='comment-attachment-spinner'>
                        <div className='MediaLoader__spinner'/>
                    </div>
                </div>
                <div className='comment-attachment-video-name'>{attachment.fileName}</div>
            </div>
        )
    }

    return (
        <div className='comment-attachment comment-attachment--video'>
            <div className='comment-attachment-video-wrapper'>
                <video className='comment-attachment-video-preview'>
                    <source src={url}/>
                </video>
                <div
                    className='comment-attachment-video-overlay'
                    onClick={() => setShowViewer(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setShowViewer(true)
                        }
                    }}
                    tabIndex={0}
                    role='button'
                    aria-label={intl.formatMessage({id: 'Comment.play-video', defaultMessage: 'Play video'})}
                >
                    <div className='comment-attachment-video-play'>
                        <CompassIcon
                            icon='play'
                            className='PlayIcon'
                        />
                    </div>
                </div>
            </div>
            <div className='comment-attachment-video-name'>
                {attachment.fileName}
                <span className='comment-attachment-size'>{` (${Utils.humanFileSize(attachment.fileSize)})`}</span>
            </div>
            {showViewer && (
                <RootPortal>
                    <VideoViewer
                        sourceType='file'
                        videoUrl={url}
                        onClose={() => setShowViewer(false)}
                    />
                </RootPortal>
            )}
        </div>
    )
}

// PDF attachment with thumbnail preview via pdf.js
const PdfAttachmentPreview: FC<{attachment: CommentAttachment; boardId: string}> = ({attachment, boardId}) => {
    const [dataUrl, setDataUrl] = useState<string>('')
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
    const [pageCount, setPageCount] = useState(0)
    const [downloading, setDownloading] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const intl = useIntl()

    useEffect(() => {
        let cancelled = false
        let objectUrl: string | undefined
        octoClient.getFileAsDataUrl(boardId, attachment.fileId).then((fileInfo) => {
            if (cancelled) {
                if (fileInfo.url) {
                    URL.revokeObjectURL(fileInfo.url)
                }
                return
            }
            if (fileInfo.url) {
                objectUrl = fileInfo.url
                setDataUrl(fileInfo.url)
            }
        }).catch(() => { /* ignore */ })
        return () => {
            cancelled = true
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [boardId, attachment.fileId])

    // Render PDF thumbnail
    useEffect(() => {
        if (!dataUrl) {
            return
        }
        let cancelled = false
        const renderThumbnail = async () => {
            try {
                const pdfjsLib = await import('pdfjs-dist')
                await import('pdfjs-dist/build/pdf.worker.entry')
                if (cancelled) {
                    return
                }
                const pdf = await pdfjsLib.getDocument(dataUrl).promise
                if (cancelled) {
                    return
                }
                setPageCount(pdf.numPages)
                const page = await pdf.getPage(1)
                if (cancelled) {
                    return
                }
                const canvas = canvasRef.current
                if (!canvas) {
                    return
                }
                const viewport = page.getViewport({scale: 0.5})
                canvas.height = viewport.height
                canvas.width = viewport.width
                const context = canvas.getContext('2d')
                if (!context) {
                    return
                }
                await page.render({canvasContext: context, viewport}).promise
                if (!cancelled) {
                    setThumbnailUrl(canvas.toDataURL('image/png'))
                }
            } catch {
                // PDF thumbnail rendering failed — show placeholder icon
            }
        }
        renderThumbnail()
        return () => {
            cancelled = true
        }
    }, [dataUrl])

    const handleDownload = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (downloading) {
            return
        }
        setDownloading(true)
        let fetchedUrl: string | undefined
        try {
            let url = dataUrl
            if (!url) {
                const fileInfo = await octoClient.getFileAsDataUrl(boardId, attachment.fileId)
                url = fileInfo.url
                fetchedUrl = url
            }
            if (url) {
                const link = document.createElement('a')
                link.href = url
                link.download = attachment.fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
        } catch {
            sendFlashMessage({content: `Failed to download ${attachment.fileName}`, severity: 'normal'})
        } finally {
            if (fetchedUrl) {
                URL.revokeObjectURL(fetchedUrl)
            }
            setDownloading(false)
        }
    }, [dataUrl, boardId, attachment.fileId, attachment.fileName, downloading])

    const humanSize = Utils.humanFileSize(attachment.fileSize)

    return (
        <div className='comment-attachment comment-attachment--pdf'>
            <div className='comment-attachment-pdf-thumbnail'>
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={attachment.fileName}
                        className='comment-attachment-pdf-thumbnail-image'
                    />
                ) : (
                    <div className='comment-attachment-pdf-thumbnail-placeholder'>
                        <CompassIcon
                            icon='file-pdf-outline-large'
                            className='comment-attachment-pdf-icon'
                        />
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    style={{display: 'none'}}
                />
            </div>
            <div className='comment-attachment-pdf-info'>
                <span className='comment-attachment-pdf-filename'>{attachment.fileName}</span>
                <span className='comment-attachment-pdf-metadata'>
                    {humanSize}
                    {pageCount > 0 && ` · ${intl.formatMessage({id: 'Comment.pdf-pages', defaultMessage: '{count} pages'}, {count: pageCount})}`}
                </span>
                <button
                    className='comment-attachment-pdf-download'
                    onClick={handleDownload}
                    type='button'
                >
                    <CompassIcon icon='download-outline'/>
                    {intl.formatMessage({id: 'Comment.download', defaultMessage: 'Download'})}
                </button>
            </div>
        </div>
    )
}

// Generic file attachment with icon and download
const FileAttachmentPreview: FC<{attachment: CommentAttachment; boardId: string}> = ({attachment, boardId}) => {
    const [downloading, setDownloading] = useState(false)
    const intl = useIntl()
    const icon = getFileIcon(attachment.fileName)
    const humanSize = Utils.humanFileSize(attachment.fileSize)

    const handleDownload = useCallback(async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault()
        if (downloading) {
            return
        }
        setDownloading(true)
        try {
            const fileInfo = await octoClient.getFileAsDataUrl(boardId, attachment.fileId)
            if (fileInfo.url) {
                const a = document.createElement('a')
                a.href = fileInfo.url
                a.download = attachment.fileName
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(fileInfo.url)
            } else {
                sendFlashMessage({content: `Failed to download ${attachment.fileName}`, severity: 'normal'})
            }
        } catch {
            sendFlashMessage({content: `Failed to download ${attachment.fileName}`, severity: 'normal'})
        } finally {
            setDownloading(false)
        }
    }, [boardId, attachment.fileId, attachment.fileName, downloading])

    return (
        <div
            className='comment-attachment comment-attachment--generic'
            onClick={handleDownload}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleDownload(e)
                }
            }}
            role='button'
            tabIndex={0}
        >
            <div className='comment-attachment-generic-icon'>
                <CompassIcon
                    icon={icon}
                    className='comment-attachment-generic-icon-image'
                />
            </div>
            <div className='comment-attachment-generic-info'>
                <span className='comment-attachment-generic-filename'>{attachment.fileName}</span>
                <span className='comment-attachment-generic-metadata'>
                    {humanSize}
                    {humanSize && ' · '}
                    {intl.formatMessage({id: 'Comment.click-to-download', defaultMessage: 'Click to download'})}
                </span>
            </div>
        </div>
    )
}

// Router component that picks the right preview based on attachment type
const AttachmentPreview: FC<{attachment: CommentAttachment; boardId: string}> = ({attachment, boardId}) => {
    const type = getAttachmentType(attachment)
    switch (type) {
    case 'image':
        return <ImageAttachmentPreview attachment={attachment} boardId={boardId}/>
    case 'video':
        return <VideoAttachmentPreview attachment={attachment} boardId={boardId}/>
    case 'pdf':
        return <PdfAttachmentPreview attachment={attachment} boardId={boardId}/>
    default:
        return <FileAttachmentPreview attachment={attachment} boardId={boardId}/>
    }
}

type Props = {
    comment: Block
    userId: string
    userImageUrl: string
    readonly: boolean
    canDelete: boolean
    commentType?: CommentType
    onReply?: (commentId: string, quotedText: string) => void
}

const Comment: FC<Props> = (props: Props) => {
    const {comment, userId, userImageUrl, onReply} = props
    const intl = useIntl()
    const user = useAppSelector(getUser(userId))
    const date = new Date(comment.createAt)
    const commentRef = useRef<HTMLDivElement>(null)

    const selectedTeam = useAppSelector(getCurrentTeam)
    const channelNamesMap =  getChannelsNameMapInTeam((window as any).store.getState(), selectedTeam!.id)

    const formattedText =
    <Provider store={(window as any).store}>
        {messageHtmlToComponent(formatText(comment.title, {
            atMentions: true,
            team: selectedTeam,
            channelNamesMap,
        }), {
            fetchMissingUsers: true,
        })}
    </Provider>

    const handleReply = () => {
        if (!onReply) {
            return
        }

        const selection = window.getSelection()
        let textToQuote = comment.title

        // Check if selection is fully within this comment
        if (selection && !selection.isCollapsed && commentRef.current) {
            const anchorInComment = commentRef.current.contains(selection.anchorNode)
            const focusInComment = commentRef.current.contains(selection.focusNode)

            if (anchorInComment && focusInComment) {
                const selectedText = selection.toString().trim()
                if (selectedText) {
                    textToQuote = selectedText
                }
            } else {
                // Selection is outside or partially outside this comment - clear it
                selection.removeAllRanges()
            }
        }

        const quotedText = textToQuote.split('\n').map((line) => `> ${line}`).join('\n')
        onReply(comment.id, quotedText)
    }

    return (
        <div
            key={comment.id}
            className='Comment comment'
            ref={commentRef}
        >
            <div className='comment-header'>
                <img
                    className='comment-avatar'
                    src={userImageUrl}
                />
                <div className='comment-username'>{user?.username}</div>
                <GuestBadge show={user?.is_guest}/>

                <Tooltip title={Utils.displayDateTime(date, intl)}>
                    <div className='comment-date'>
                        {Utils.relativeDisplayDateTime(date, intl)}
                    </div>
                </Tooltip>

                {!props.readonly && onReply && props.commentType !== 'edits' && props.commentType !== 'bot' && (
                    <button
                        type='button'
                        className='comment-reply'
                        onClick={handleReply}
                    >
                        {intl.formatMessage({id: 'Comment.reply', defaultMessage: '↩ Reply'})}
                    </button>
                )}

                {!props.readonly && props.canDelete && (
                    <MenuWrapper>
                        <IconButton icon={<OptionsIcon/>}/>
                        <Menu position='left'>
                            <Menu.Text
                                icon={<DeleteIcon/>}
                                id='delete'
                                name={intl.formatMessage({id: 'Comment.delete', defaultMessage: 'Delete'})}
                                onClick={() => mutator.deleteBlock(comment)}
                            />
                        </Menu>
                    </MenuWrapper>
                )}
            </div>
            <div className='comment-markdown'>
                {formattedText}
            </div>
            {(comment.fields?.attachments as CommentAttachment[] | undefined)?.length ? (
                <div className='comment-attachments'>
                    {(comment.fields.attachments as CommentAttachment[]).map((att) => (
                        <AttachmentPreview
                            key={att.fileId}
                            attachment={att}
                            boardId={comment.boardId}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    )
}

export default Comment
