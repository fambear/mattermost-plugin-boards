// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useMemo, useRef, useCallback} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {CommentBlock, createCommentBlock, CommentType, CommentAttachment} from '../../blocks/commentBlock'
import mutator from '../../mutator'
import {useAppSelector} from '../../store/hooks'
import {Utils} from '../../utils'
import Button from '../../widgets/buttons/button'
import octoClient from '../../octoClient'

import {MarkdownEditor} from '../markdownEditor'
import {sendFlashMessage} from '../flashMessages'

import {IUser} from '../../user'
import {getMe} from '../../store/users'
import {useHasCurrentBoardPermissions} from '../../hooks/permissions'
import {Permission} from '../../constants'

import AddCommentTourStep from '../onboardingTour/addComments/addComments'

import Comment from './comment'

import './commentsList.scss'

type Props = {
    comments: readonly CommentBlock[]
    boardId: string
    cardId: string
    readonly: boolean
}

type CommentNode = {
    comment: CommentBlock
    children: CommentNode[]
}

function buildCommentTree(comments: readonly CommentBlock[]): CommentNode[] {
    const commentMap = new Map<string, CommentNode>()
    const rootComments: CommentNode[] = []

    comments.forEach((comment) => {
        commentMap.set(comment.id, {comment, children: []})
    })

    comments.forEach((comment) => {
        const node = commentMap.get(comment.id)!
        const parentId = comment.fields?.parentCommentId as string | undefined

        if (parentId && commentMap.has(parentId)) {
            const parentNode = commentMap.get(parentId)!
            parentNode.children.push(node)
        } else {
            rootComments.push(node)
        }
    })

    const sortByDate = (nodes: CommentNode[]) => {
        nodes.sort((a, b) => a.comment.createAt - b.comment.createAt)
        nodes.forEach((node) => sortByDate(node.children))
    }

    sortByDate(rootComments)

    return rootComments
}

type CommentTreeNodeProps = {
    node: CommentNode
    level: number
    readonly: boolean
    canDeleteOthersComments: boolean
    me: IUser | null
    onReply?: (commentId: string, quotedText: string) => void
    getCommentType: (comment: CommentBlock) => CommentType
}

const CommentTreeNode: React.FC<CommentTreeNodeProps> = ({node, level, readonly, canDeleteOthersComments, me, onReply, getCommentType}) => {
    const canDeleteComment = canDeleteOthersComments || me?.id === node.comment.modifiedBy
    const isReply = level > 0
    const commentType = getCommentType(node.comment)

    return (
        <>
            <div
                className={`comment-thread-item ${isReply ? 'comment-reply' : ''}`}
                style={{marginLeft: `${level * 40}px`}}
            >
                <Comment
                    key={node.comment.id}
                    comment={node.comment}
                    userImageUrl={Utils.getProfilePicture(node.comment.modifiedBy)}
                    userId={node.comment.modifiedBy}
                    readonly={readonly}
                    canDelete={canDeleteComment}
                    commentType={commentType}
                    onReply={!readonly ? onReply : undefined}
                />
            </div>
            {node.children.map((childNode) => (
                <CommentTreeNode
                    key={childNode.comment.id}
                    node={childNode}
                    level={level + 1}
                    readonly={readonly}
                    canDeleteOthersComments={canDeleteOthersComments}
                    me={me}
                    onReply={onReply}
                    getCommentType={getCommentType}
                />
            ))}
        </>
    )
}

const CommentsList = (props: Props) => {
    const [newComment, setNewComment] = useState('')
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<CommentType>('comment')
    const [pendingAttachments, setPendingAttachments] = useState<CommentAttachment[]>([])
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const me = useAppSelector<IUser|null>(getMe)
    const canDeleteOthersComments = useHasCurrentBoardPermissions([Permission.DeleteOthersComments])
    const intl = useIntl()

    const {comments} = props

    const uploadFiles = useCallback(async (files: FileList) => {
        if (!files.length) {
            return
        }
        setUploading(true)
        const results = await Promise.allSettled(
            Array.from(files).map(async (file) => {
                const result = await octoClient.uploadFile(props.boardId, file)
                if (!result?.fileId) {
                    throw new Error('no fileId')
                }
                return {
                    fileId: result.fileId,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type || '',
                    width: result.width,
                    height: result.height,
                    miniPreview: result.miniPreview,
                } as CommentAttachment
            }),
        )
        const newAttachments: CommentAttachment[] = []
        let hadFailures = false
        for (const r of results) {
            if (r.status === 'fulfilled') {
                newAttachments.push(r.value)
            } else {
                hadFailures = true
            }
        }
        if (hadFailures) {
            sendFlashMessage({content: intl.formatMessage({id: 'CommentsList.upload-failed', defaultMessage: 'Some files failed to upload'}), severity: 'normal'})
        }
        if (newAttachments.length) {
            setPendingAttachments((prev) => [...prev, ...newAttachments])
        }
        setUploading(false)
    }, [props.boardId, intl])

    const handleAttachClick = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            uploadFiles(e.target.files)
        }
        e.target.value = ''
    }, [uploadFiles])

    const removePendingAttachment = useCallback((fileId: string) => {
        setPendingAttachments((prev) => prev.filter((a) => a.fileId !== fileId))
    }, [])

    const getCommentType = (comment: CommentBlock): CommentType => {
        return (comment.fields?.commentType as CommentType | undefined) || 'comment'
    }

    const counts = useMemo(() => {
        return comments.reduce((acc, comment) => {
            const type = getCommentType(comment)
            acc[type] = (acc[type] || 0) + 1
            return acc
        }, {} as Record<CommentType, number>)
    }, [comments])

    const filteredComments = useMemo(() => {
        return comments.filter((comment) => getCommentType(comment) === activeTab)
    }, [comments, activeTab])

    const onSendClicked = () => {
        const commentText = newComment
        if (commentText || pendingAttachments.length > 0) {
            const {cardId, boardId} = props
            Utils.log(`Send comment: ${commentText}`)
            Utils.assertValue(cardId)

            const comment = createCommentBlock()
            comment.parentId = cardId
            comment.boardId = boardId
            comment.title = commentText

            if (replyToCommentId) {
                comment.fields = {
                    ...comment.fields,
                    parentCommentId: replyToCommentId,
                }
            }

            if (pendingAttachments.length > 0) {
                comment.fields = {
                    ...comment.fields,
                    attachments: pendingAttachments,
                }
            }

            mutator.insertBlock(boardId, comment, 'add comment')
            setNewComment('')
            setReplyToCommentId(null)
            setPendingAttachments([])
        }
    }

    const handleReply = (commentId: string, quotedText: string) => {
        setReplyToCommentId(commentId)
        setNewComment(quotedText + '\n\n')
    }

    const newCommentComponent = (
        <div className='CommentsList__new'>
            <input
                ref={fileInputRef}
                type='file'
                multiple={true}
                style={{display: 'none'}}
                onChange={handleFileInputChange}
            />
            <div className='newcomment-wrapper'>
                <MarkdownEditor
                    className='newcomment'
                    text={newComment}
                    placeholderText={intl.formatMessage({id: 'CardDetail.new-comment-placeholder', defaultMessage: 'Add a comment...'})}
                    onChange={(value: string) => {
                        if (newComment !== value) {
                            setNewComment(value)
                        }
                    }}
                    showToolbar={true}
                    onFilePaste={uploadFiles}
                    onAttach={handleAttachClick}
                />
            </div>

            {pendingAttachments.length > 0 && (
                <div className='CommentsList__pending-attachments'>
                    {pendingAttachments.map((att) => (
                        <div
                            key={att.fileId}
                            className='CommentsList__pending-attachment'
                        >
                            <span className='CommentsList__pending-attachment-name'>{att.fileName}</span>
                            <button
                                type='button'
                                className='CommentsList__pending-attachment-remove'
                                onClick={() => removePendingAttachment(att.fileId)}
                            >
                                {'×'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {uploading && (
                <div className='CommentsList__uploading'>
                    <FormattedMessage
                        id='CommentsList.uploading'
                        defaultMessage='Uploading...'
                    />
                </div>
            )}

            {(newComment || pendingAttachments.length > 0) &&
            <Button
                filled={true}
                onClick={onSendClicked}
            >
                <FormattedMessage
                    id='CommentsList.send'
                    defaultMessage='Send'
                />
            </Button>
            }

            <AddCommentTourStep/>
        </div>
    )

    // Build comment tree and render with threading
    const commentTree = buildCommentTree(filteredComments)

    const renderTabBar = () => {
        const tabs: {type: CommentType, label: string, id: string}[] = [
            {type: 'comment', label: intl.formatMessage({id: 'CommentsList.tab.comments', defaultMessage: 'Comments'}), id: 'comments'},
            {type: 'edits', label: intl.formatMessage({id: 'CommentsList.tab.cardEvents', defaultMessage: 'Card events'}), id: 'edits'},
            {type: 'bot', label: intl.formatMessage({id: 'CommentsList.tab.botEvents', defaultMessage: 'Bot events'}), id: 'bot'},
        ]

        return (
            <div className='CommentsList__tabs'>
                {tabs.map((tab) => {
                    const count = counts[tab.type] || 0
                    return (
                        <button
                            key={tab.type}
                            type="button"
                            className={`CommentsList__tab ${activeTab === tab.type ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.type)}
                        >
                            {tab.label}
                            {count > 0 && <span className='CommentsList__tab-count'>({count})</span>}
                        </button>
                    )
                })}
            </div>
        )
    }

    return (
        <div className='CommentsList'>
            {renderTabBar()}
            {commentTree.map((node) => (
                <CommentTreeNode
                    key={node.comment.id}
                    node={node}
                    level={0}
                    readonly={props.readonly}
                    canDeleteOthersComments={canDeleteOthersComments}
                    me={me}
                    onReply={handleReply}
                    getCommentType={getCommentType}
                />
            ))}

            {/* New comment at the bottom */}
            {!props.readonly && activeTab === 'comment' && newCommentComponent}

            {/* horizontal divider below comments */}
            {!(comments.length === 0 && props.readonly) && <hr className='CommentsList__divider'/>}
        </div>
    )
}

export default React.memo(CommentsList)
