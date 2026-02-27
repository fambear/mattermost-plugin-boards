// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback, useEffect, useRef} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Board} from '../blocks/board'
import {BoardView} from '../blocks/boardView'
import {Card} from '../blocks/card'
import octoClient from '../octoClient'
import mutator from '../mutator'
import {getCard} from '../store/cards'
import {getCardComments} from '../store/comments'
import {getCardContents} from '../store/contents'
import {useAppDispatch, useAppSelector} from '../store/hooks'
import {getCardAttachments, updateAttachments, updateUploadPrecent} from '../store/attachments'
import TelemetryClient, {TelemetryActions, TelemetryCategory} from '../telemetry/telemetryClient'
import {Utils} from '../utils'
import CompassIcon from '../widgets/icons/compassIcon'
import Menu from '../widgets/menu'
import {sendFlashMessage} from '../components/flashMessages'

import ConfirmationDialogBox, {ConfirmationDialogBoxProps} from '../components/confirmationDialogBox'


import {getUserBlockSubscriptionList} from '../store/initialLoad'
import {getClientConfig} from '../store/clientConfig'

import {IUser} from '../user'
import {getMe} from '../store/users'
import {Permission} from '../constants'
import {Block, createBlock} from '../blocks/block'
import {AttachmentBlock, createAttachmentBlock} from '../blocks/attachmentBlock'
import IconButton from '../widgets/buttons/iconButton'

import BoardPermissionGate from './permissions/boardPermissionGate'

import CardDetail from './cardDetail/cardDetail'
import Dialog from './dialog'

import './cardDialog.scss'
import CardActionsMenu from './cardActionsMenu/cardActionsMenu'

type Props = {
    board: Board
    activeView: BoardView
    views: BoardView[]
    cards: Card[]
    cardId: string
    onClose: () => void
    showCard: (cardId?: string) => void
    readonly: boolean
}

const CardDialog = (props: Props): JSX.Element => {
    const {board, activeView, cards, views} = props
    const card = useAppSelector(getCard(props.cardId))
    const contents = useAppSelector(getCardContents(props.cardId))
    const comments = useAppSelector(getCardComments(props.cardId))
    const attachments = useAppSelector(getCardAttachments(props.cardId))
    const clientConfig = useAppSelector(getClientConfig)
    const intl = useIntl()
    const dispatch = useAppDispatch()
    const me = useAppSelector<IUser|null>(getMe)
    const isTemplate = card && card.fields.isTemplate

    const [showConfirmationDialogBox, setShowConfirmationDialogBox] = useState<boolean>(false)
    const [cardIdentityElement, setCardIdentityElement] = useState<HTMLDivElement|null>(null)
    const [showStickyCardContext, setShowStickyCardContext] = useState(false)
    const dialogRef = useRef<HTMLDivElement>(null)
    const handleDeleteCard = async () => {
        if (!card) {
            Utils.assertFailure()
            return
        }
        TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.DeleteCard, {board: props.board.id, view: props.activeView.id, card: card.id})
        await mutator.deleteBlock(card, 'delete card')
        // No need to cleanup when deleting the entire card
        props.onClose()
    }

    const confirmDialogProps: ConfirmationDialogBoxProps = {
        heading: intl.formatMessage({id: 'CardDialog.delete-confirmation-dialog-heading', defaultMessage: 'Delete this card?'}),
        subText: intl.formatMessage({id: 'CardDialog.delete-confirmation-dialog-subtext', defaultMessage: 'This action is permanent and cannot be undone. All card data will be lost. Would you rather change the card status instead?'}),
        confirmButtonText: intl.formatMessage({id: 'CardDialog.delete-confirmation-dialog-button-text', defaultMessage: 'Delete'}),
        destructive: true,
        onConfirm: handleDeleteCard,
        onClose: () => {
            setShowConfirmationDialogBox(false)
        },
    }

    const handleDeleteButtonOnClick = () => {
        // use may be renaming a card title
        // and accidently delete the card
        // so adding des
        if (card?.title === '' && card?.fields.contentOrder.length === 0) {
            handleDeleteCard()
            return
        }

        setShowConfirmationDialogBox(true)
    }

    const handleDuplicateCard = async () => {
        if (!card) {
            return
        }
        TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.DuplicateCard, {board: board.id, card: card.id})
        const [, newCardId] = await mutator.duplicateCard(card.id, board.id)
        if (newCardId) {
            props.showCard(newCardId)
        }
    }

    const removeUploadingAttachment = (uploadingBlock: Block) => {
        uploadingBlock.deleteAt = 1
        const removeUploadingAttachmentBlock = createAttachmentBlock(uploadingBlock)
        dispatch(updateAttachments([removeUploadingAttachmentBlock]))
    }

    const selectAttachment = (boardId: string) => {
        return new Promise<AttachmentBlock>(
            (resolve) => {
                Utils.selectLocalFile(async (attachment) => {
                    const uploadingBlock = createBlock()
                    uploadingBlock.title = attachment.name
                    uploadingBlock.fields.fileId = attachment.name
                    uploadingBlock.boardId = boardId
                    if (card) {
                        uploadingBlock.parentId = card.id
                    }
                    const attachmentBlock = createAttachmentBlock(uploadingBlock)
                    attachmentBlock.isUploading = true
                    dispatch(updateAttachments([attachmentBlock]))
                    if (attachment.size > clientConfig.maxFileSize && Utils.isFocalboardPlugin()) {
                        removeUploadingAttachment(uploadingBlock)
                        sendFlashMessage({content: intl.formatMessage({id: 'AttachmentBlock.failed', defaultMessage: 'Unable to upload the file. Attachment size limit reached.'}), severity: 'normal'})
                    } else {
                        sendFlashMessage({content: intl.formatMessage({id: 'AttachmentBlock.upload', defaultMessage: 'Attachment uploading.'}), severity: 'normal'})
                        const xhr = await octoClient.uploadAttachment(boardId, attachment)
                        if (xhr) {
                            xhr.upload.onprogress = (event) => {
                                const percent = Math.floor((event.loaded / event.total) * 100)
                                dispatch(updateUploadPrecent({
                                    blockId: attachmentBlock.id,
                                    uploadPercent: percent,
                                }))
                            }

                            xhr.onload = () => {
                                if (xhr.status === 200 && xhr.readyState === 4) {
                                    const json = JSON.parse(xhr.response)
                                    const fileId = json.fileId
                                    if (fileId) {
                                        removeUploadingAttachment(uploadingBlock)
                                        const block = createAttachmentBlock()
                                        block.fields.fileId = fileId || ''
                                        block.title = attachment.name
                                        sendFlashMessage({content: intl.formatMessage({id: 'AttachmentBlock.uploadSuccess', defaultMessage: 'Attachment uploaded successfull.'}), severity: 'normal'})
                                        resolve(block)
                                    } else {
                                        removeUploadingAttachment(uploadingBlock)
                                        sendFlashMessage({content: intl.formatMessage({id: 'AttachmentBlock.failed', defaultMessage: 'Unable to upload the file. Attachment size limit reached.'}), severity: 'normal'})
                                    }
                                }
                            }
                        }
                    }
                },
                '')
            },
        )
    }

    const addElement = async () => {
        if (!card) {
            return
        }
        const block = await selectAttachment(board.id)
        block.parentId = card.id
        block.boardId = card.boardId
        const typeName = block.type
        const description = intl.formatMessage({id: 'AttachmentBlock.addElement', defaultMessage: 'add {type}'}, {type: typeName})
        await mutator.insertBlock(block.boardId, block, description)
    }

    const deleteBlock = useCallback(async (block: Block) => {
        if (!card) {
            return
        }
        const description = intl.formatMessage({id: 'AttachmentBlock.DeleteAction', defaultMessage: 'delete'})
        await mutator.deleteBlock(block, description)
        sendFlashMessage({content: intl.formatMessage({id: 'AttachmentBlock.delete', defaultMessage: 'Attachment Deleted Successfully.'}), severity: 'normal'})
    }, [card?.boardId, card?.id, card?.fields.contentOrder])

    const cleanupEmptyBlocks = useCallback(async () => {
        if (!card || props.readonly) {
            return
        }

        const textBlockTypes = ['text', 'h1', 'h2', 'h3', 'list-item', 'quote', 'checkbox']
        const emptyBlocks: Block[] = []
        const flatContents = contents.flat()
        for (const content of flatContents) {
            if (!textBlockTypes.includes(content.type)) {
                continue
            }
            if (!content.title || content.title.trim() === '') {
                emptyBlocks.push(content)
            }
        }

        if (emptyBlocks.length > 0) {
            for (const block of emptyBlocks) {
                await mutator.deleteBlock(block, 'cleanup empty blocks')
            }
        }
    }, [card, contents, props.readonly])

    const handleClose = useCallback(async () => {
        await cleanupEmptyBlocks()
        props.onClose()
    }, [cleanupEmptyBlocks, props.onClose])

    const menu = (
        <CardActionsMenu
            cardId={props.cardId}
            boardId={board.id}
            cardCode={card?.code}
            onClickDelete={handleDeleteButtonOnClick}
            onClickDuplicate={handleDuplicateCard}
        >
            <BoardPermissionGate permissions={[Permission.ManageBoardCards]}>
                <Menu.Text
                    icon={<CompassIcon icon='paperclip'/>}
                    id='attach'
                    name={intl.formatMessage({id: 'CardDetail.Attach', defaultMessage: 'Attach'})}
                    onClick={addElement}
                />
            </BoardPermissionGate>
        </CardActionsMenu>
    )

    const followActionButton = (following: boolean): React.ReactNode => {
        const followBtn = (
            <IconButton
                className='cardFollowBtn follow'
                title={intl.formatMessage({id: 'CardDetail.Follow', defaultMessage: 'Follow this card'})}
                icon={<CompassIcon icon='bell-outline'/>}
                onClick={() => mutator.followBlock(props.cardId, 'card', me!.id)}
            />
        )

        const unfollowBtn = (
            <IconButton
                className='cardFollowBtn unfollow'
                title={intl.formatMessage({id: 'CardDetail.Unfollow', defaultMessage: 'Stop following this card'})}
                icon={<CompassIcon icon='bell-ring-outline'/>}
                onClick={() => mutator.unfollowBlock(props.cardId, 'card', me!.id)}
            />
        )

        if (!isTemplate && Utils.isFocalboardPlugin() && !card?.limited) {
            return (<>{following ? unfollowBtn : followBtn}</>)
        }
        return null
    }

    const followingCards = useAppSelector(getUserBlockSubscriptionList)
    const isFollowingCard = Boolean(followingCards.find((following) => following.blockId === props.cardId))
    const toolbar = followActionButton(isFollowingCard)

    useEffect(() => {
        setShowStickyCardContext(false)
    }, [card?.id])

    useEffect(() => {
        const root = dialogRef.current
        const target = cardIdentityElement
        if (!root || !target) {
            return
        }

        const toolbarElement = root.querySelector(':scope > .toolbar') as HTMLElement | null
        const toolbarHeight = Math.ceil(toolbarElement?.getBoundingClientRect().height || 0)

        if (typeof IntersectionObserver === 'undefined') {
            const updateStickyContextVisibility = () => {
                if (!toolbarElement) {
                    return
                }
                const toolbarBottom = toolbarElement.getBoundingClientRect().bottom
                setShowStickyCardContext(target.getBoundingClientRect().top <= toolbarBottom)
            }
            updateStickyContextVisibility()
            root.addEventListener('scroll', updateStickyContextVisibility, {passive: true})
            window.addEventListener('resize', updateStickyContextVisibility)
            return () => {
                root.removeEventListener('scroll', updateStickyContextVisibility)
                window.removeEventListener('resize', updateStickyContextVisibility)
            }
        }

        const intersectionObserver = new IntersectionObserver(([entry]) => {
            if (!entry) {
                return
            }
            setShowStickyCardContext(!entry.isIntersecting)
        }, {
            root,
            threshold: 0,
            rootMargin: `-${toolbarHeight}px 0px 0px 0px`,
        })

        intersectionObserver.observe(target)

        return () => {
            intersectionObserver.disconnect()
        }
    }, [card?.id, cardIdentityElement])

    const toolbarLeft = (
        showStickyCardContext &&
        card &&
        (card.code || card.title) &&
        <div className='cardDialog__toolbar-card-context'>
            {card.code && <span className='card-code-text'>{card.code}</span>}
            {card.title && <span className='cardDialog__toolbar-card-title'>{card.title}</span>}
        </div>
    )

    return (
        <>
            <Dialog
                title={<div/>}
                className='cardDialog'
                onClose={handleClose}
                toolsMenu={!props.readonly && !card?.limited && menu}
                toolbar={toolbar}
                toolbarLeft={toolbarLeft}
                dialogRef={dialogRef}
            >
                {isTemplate &&
                    <div className='banner'>
                        <FormattedMessage
                            id='CardDialog.editing-template'
                            defaultMessage="You're editing a template."
                        />
                    </div>}

                {card &&
                    <CardDetail
                        board={board}
                        activeView={activeView}
                        views={views}
                        cards={cards}
                        card={card}
                        contents={contents}
                        comments={comments}
                        attachments={attachments}
                        readonly={props.readonly}
                        onClose={handleClose}
                        onDelete={deleteBlock}
                        addAttachment={addElement}
                        showCard={props.showCard}
                        cardIdentityRef={setCardIdentityElement}
                    />}

                {!card &&
                    <div className='banner error'>
                        <FormattedMessage
                            id='CardDialog.nocard'
                            defaultMessage="This card doesn't exist or is inaccessible."
                        />
                    </div>}
            </Dialog>

            {showConfirmationDialogBox && <ConfirmationDialogBox dialogBox={confirmDialogProps}/>}
        </>
    )
}

export default CardDialog
