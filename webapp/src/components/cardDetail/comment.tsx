// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {FC, useRef, useState, useEffect} from 'react'
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

import octoClient from '../../octoClient'
import ImageViewer from '../imageViewer/imageViewer'
import RootPortal from '../rootPortal'
import './comment.scss'
import {formatText, messageHtmlToComponent} from '../../webapp_globals'
import {getCurrentTeam} from '../../store/teams'
import {sendFlashMessage} from '../flashMessages'


import {CommentType, CommentAttachment} from '../../blocks/commentBlock'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg']

const isImageAttachment = (att: CommentAttachment): boolean => {
    if (att.mimeType?.startsWith('image/')) {
        return true
    }
    const ext = att.fileName?.split('.').pop()?.toLowerCase() || ''
    return IMAGE_EXTENSIONS.includes(ext)
}

const AttachmentPreview: FC<{attachment: CommentAttachment; boardId: string}> = ({attachment, boardId}) => {
    const isImage = isImageAttachment(attachment)
    const [url, setUrl] = useState<string>('')
    const [imgLoaded, setImgLoaded] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)
    const [showViewer, setShowViewer] = useState(false)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        if (!isImage) {
            return
        }
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
    }, [boardId, attachment.fileId, isImage])

    const humanSize = attachment.fileSize < 1024 * 1024
        ? `${Math.round(attachment.fileSize / 1024)} KB`
        : `${(attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`

    if (isImage && !loadFailed) {
        // Calculate proportional placeholder dimensions
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
                        src={url}
                        alt={attachment.fileName}
                        onClick={() => setShowViewer(true)}
                        onLoad={() => setImgLoaded(true)}
                        style={!imgLoaded ? {position: 'absolute', opacity: 0, pointerEvents: 'none'} : undefined}
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

    const handleDownload = async (e: React.MouseEvent) => {
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
                Utils.logError(`Failed to download attachment: no URL returned for fileId=${attachment.fileId} (${attachment.fileName})`)
                sendFlashMessage({content: `Failed to download ${attachment.fileName}`, severity: 'normal'})
            }
        } catch (err) {
            Utils.logError(`Failed to download attachment fileId=${attachment.fileId} (${attachment.fileName}): ${err}`)
            sendFlashMessage({content: `Failed to download ${attachment.fileName}`, severity: 'normal'})
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className='comment-attachment comment-attachment--file'>
            <a
                href='#'
                onClick={handleDownload}
                className='comment-attachment-link'
            >
                {attachment.fileName}
                <span className='comment-attachment-size'>{` (${humanSize})`}</span>
            </a>
        </div>
    )
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
