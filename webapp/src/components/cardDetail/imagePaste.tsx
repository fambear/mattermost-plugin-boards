// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import {useEffect, useCallback} from 'react'
import {useIntl} from 'react-intl'

import {createImageBlock} from '../../blocks/imageBlock'
import {createTextBlock} from '../../blocks/textBlock'
import {createVideoBlock} from '../../blocks/videoBlock'
import {createFilePdfBlock} from '../../blocks/filePdfBlock'
import {createFileGenericBlock} from '../../blocks/fileGenericBlock'
import {sendFlashMessage} from '../flashMessages'
import {Block} from '../../blocks/block'
import octoClient from '../../octoClient'
import mutator from '../../mutator'
import Files from '../../file'

// File type categories
const IMAGE_TYPES = Files.IMAGE_TYPES || []
const VIDEO_TYPES = Files.VIDEO_TYPES || []
const PDF_TYPES = Files.PDF_TYPES || []

// Get file extension from filename
const getFileExtension = (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || ''
}

// Determine if file is an image
const isImageFile = (file: File): boolean => {
    if (file.type.indexOf('image/') === 0) {
        return true
    }
    const ext = getFileExtension(file.name)
    return IMAGE_TYPES.includes(ext)
}

// Determine if file is a video
const isVideoFile = (file: File): boolean => {
    if (file.type.indexOf('video/') === 0) {
        return true
    }
    const ext = getFileExtension(file.name)
    return VIDEO_TYPES.includes(ext)
}

// Determine if file is a PDF
const isPdfFile = (file: File): boolean => {
    if (file.type === 'application/pdf') {
        return true
    }
    const ext = getFileExtension(file.name)
    return PDF_TYPES.includes(ext)
}

type EditingContext = {
    blockId: string | null
    blockIndex: number
}

type ImagePasteOptions = {
    getEditingContext?: () => EditingContext
    onImageInserted?: (newTextBlockId: string) => void
}

export default function useImagePaste(
    boardId: string,
    cardId: string,
    contentOrder: Array<string | string[]>,
    options?: ImagePasteOptions
): void {
    const intl = useIntl()
    const uploadItems = useCallback(async (items: FileList) => {
        type UploadInfo = {
            file: File
            fileId: string | undefined
            type: 'image' | 'video' | 'pdf' | 'generic'
        }

        if (!items.length) {
            return
        }

        const uploads: Array<Promise<UploadInfo>> = []

        for (const item of items) {
            const file = item
            let fileType: 'image' | 'video' | 'pdf' | 'generic' = 'generic'

            if (isImageFile(file)) {
                fileType = 'image'
            } else if (isVideoFile(file)) {
                fileType = 'video'
            } else if (isPdfFile(file)) {
                fileType = 'pdf'
            }

            uploads.push(
                octoClient.uploadFile(boardId, file).then((fileId) => ({
                    file,
                    fileId,
                    type: fileType,
                }))
            )
        }

        const uploaded = await Promise.all(uploads)
        const blocksToInsert: Block[] = []
        let someFilesNotUploaded = false

        const editingContext = options?.getEditingContext?.() || {blockId: null, blockIndex: -1}
        const insertIndex = editingContext.blockIndex >= 0 ? editingContext.blockIndex + 1 : contentOrder.length

        for (const uploadInfo of uploaded) {
            if (!uploadInfo.fileId) {
                someFilesNotUploaded = true
                continue
            }

            const {file, fileId, type} = uploadInfo

            if (type === 'image') {
                const imageBlock = createImageBlock()
                imageBlock.parentId = cardId
                imageBlock.boardId = boardId
                imageBlock.fields.fileId = fileId || ''
                blocksToInsert.push(imageBlock)
            } else if (type === 'video') {
                const videoBlock = createVideoBlock()
                videoBlock.parentId = cardId
                videoBlock.boardId = boardId
                videoBlock.fields.fileId = fileId || ''
                videoBlock.fields.filename = file.name
                videoBlock.fields.sourceType = 'file'
                blocksToInsert.push(videoBlock)
            } else if (type === 'pdf') {
                const pdfBlock = createFilePdfBlock()
                pdfBlock.parentId = cardId
                pdfBlock.boardId = boardId
                pdfBlock.fields.fileId = fileId || ''
                pdfBlock.fields.fileName = file.name
                pdfBlock.fields.fileSize = file.size
                pdfBlock.fields.mimeType = file.type || 'application/pdf'
                blocksToInsert.push(pdfBlock)
            } else {
                const genericBlock = createFileGenericBlock()
                genericBlock.parentId = cardId
                genericBlock.boardId = boardId
                genericBlock.fields.fileId = fileId || ''
                genericBlock.fields.fileName = file.name
                genericBlock.fields.fileSize = file.size
                genericBlock.fields.mimeType = file.type || ''
                blocksToInsert.push(genericBlock)
            }

            // Add a text block after each content block for easy continuation
            const textBlock = createTextBlock()
            textBlock.parentId = cardId
            textBlock.boardId = boardId
            blocksToInsert.push(textBlock)
        }

        if (someFilesNotUploaded) {
            sendFlashMessage({content: intl.formatMessage({id: 'imagePaste.upload-failed', defaultMessage: 'Some files not uploaded. File size limit reached'}), severity: 'normal'})
        }

        if (blocksToInsert.length === 0) {
            return
        }

        const afterRedo = async (newBlocks: Block[]) => {
            const newContentOrder = JSON.parse(JSON.stringify(contentOrder))
            newContentOrder.splice(insertIndex, 0, ...newBlocks.map((b: Block) => b.id))
            await octoClient.patchBlock(boardId, cardId, {updatedFields: {contentOrder: newContentOrder}})

            const lastTextBlock = newBlocks[newBlocks.length - 1]
            if (lastTextBlock && options?.onImageInserted) {
                options.onImageInserted(lastTextBlock.id)
            }
        }

        const beforeUndo = async () => {
            const newContentOrder = JSON.parse(JSON.stringify(contentOrder))
            await octoClient.patchBlock(boardId, cardId, {updatedFields: {contentOrder: newContentOrder}})
        }

        await mutator.insertBlocks(boardId, blocksToInsert, 'pasted content', afterRedo, beforeUndo)
    }, [cardId, contentOrder, boardId, options, intl])

    const onDrop = useCallback((event: DragEvent): void => {
        // Don't handle drop if ImageViewer is open (prevents duplicate blocks when dragging zoomed image)
        if (document.querySelector('.ImageViewer')) {
            return
        }
        if (event.dataTransfer) {
            const items = event.dataTransfer.files
            uploadItems(items)
        }
    }, [uploadItems])

    const onPaste = useCallback((event: ClipboardEvent): void => {
        // Don't handle paste if ImageViewer is open
        if (document.querySelector('.ImageViewer')) {
            return
        }
        if (event.clipboardData) {
            const items = event.clipboardData.files
            uploadItems(items)
        }
    }, [uploadItems])

    useEffect(() => {
        document.addEventListener('paste', onPaste)
        document.addEventListener('drop', onDrop)
        return () => {
            document.removeEventListener('paste', onPaste)
            document.removeEventListener('drop', onDrop)
        }
    }, [uploadItems, onPaste, onDrop])
}
