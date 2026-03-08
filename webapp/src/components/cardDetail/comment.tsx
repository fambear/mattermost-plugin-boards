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
import './comment.scss'
import {formatText, messageHtmlToComponent} from '../../webapp_globals'
import {getCurrentTeam} from '../../store/teams'


import {CommentType, CommentAttachment} from '../../blocks/commentBlock'

const AttachmentPreview: FC<{attachment: CommentAttachment; boardId: string}> = ({attachment, boardId}) => {
    const [url, setUrl] = useState<string>('')

    useEffect(() => {
        let cancelled = false
        let objectUrl: string | undefined
        octoClient.getFileAsDataUrl(boardId, attachment.fileId).then((fileInfo) => {
            if (!cancelled && fileInfo.url) {
                objectUrl = fileInfo.url
                setUrl(fileInfo.url)
            }
        })
        return () => {
            cancelled = true
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [boardId, attachment.fileId])

    const isImage = attachment.mimeType?.startsWith('image/') ?? false

    if (isImage && url) {
        return (
            <div className='comment-attachment comment-attachment--image'>
                <img
                    src={url}
                    alt={attachment.fileName}
                    style={{maxWidth: 300, maxHeight: 200, borderRadius: 4}}
                />
            </div>
        )
    }

    const humanSize = attachment.fileSize < 1024 * 1024
        ? `${Math.round(attachment.fileSize / 1024)} KB`
        : `${(attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`

    return (
        <div className='comment-attachment comment-attachment--file'>
            <a
                href={url || '#'}
                download={attachment.fileName}
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
