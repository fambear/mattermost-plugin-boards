// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useMemo} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {CommentBlock, createCommentBlock, CommentType} from '../../blocks/commentBlock'
import mutator from '../../mutator'
import {useAppSelector} from '../../store/hooks'
import {Utils} from '../../utils'
import Button from '../../widgets/buttons/button'

import {MarkdownEditor} from '../markdownEditor'

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
    const me = useAppSelector<IUser|null>(getMe)
    const canDeleteOthersComments = useHasCurrentBoardPermissions([Permission.DeleteOthersComments])
    const intl = useIntl()

    const {comments} = props

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
        if (commentText) {
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

            mutator.insertBlock(boardId, comment, 'add comment')
            setNewComment('')
            setReplyToCommentId(null)
        }
    }

    const handleReply = (commentId: string, quotedText: string) => {
        setReplyToCommentId(commentId)
        setNewComment(quotedText + '\n\n')
    }

    const newCommentComponent = (
        <div className='CommentsList__new'>
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
                />
            </div>

            {newComment &&
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
