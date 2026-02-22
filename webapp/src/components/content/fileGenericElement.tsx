// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback} from 'react'
import {IntlShape, useIntl} from 'react-intl'

import {ContentBlock} from '../../blocks/contentBlock'
import {FileGenericBlock, createFileGenericBlock} from '../../blocks/fileGenericBlock'
import octoClient from '../../octoClient'
import {Utils} from '../../utils'
import CompassIcon from '../../widgets/icons/compassIcon'
import {sendFlashMessage} from '../../components/flashMessages'
import FileIcons from '../../fileIcons'
import Files from '../../file'

import {contentRegistry} from './contentRegistry'
import MediaLoader from './mediaLoader/mediaLoader'

import './fileGenericElement.scss'

type Props = {
    block: ContentBlock
}

// Get icon for file based on extension
const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    for (const [category, extensions] of Object.entries(Files)) {
        if (extensions.includes(ext)) {
            return FileIcons[category] || 'file-outline'
        }
    }

    return 'file-outline'
}

const FileGenericElement = (props: Props): JSX.Element|null => {
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string|null>(null)
    const intl = useIntl()

    const {block} = props
    const fileBlock = block as FileGenericBlock

    const handleDownload = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        if (!fileBlock.fields.fileId) {
            return
        }

        // Use direct API URL instead of blob: URL to avoid Electron "Non http(s) protocol" dialog
        const fileUrl = octoClient.getFileUrl(block.boardId, fileBlock.fields.fileId)
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = fileBlock.fields.fileName || 'file'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [block.boardId, fileBlock.fields.fileId, fileBlock.fields.fileName])

    const handleRetry = useCallback(() => {
        setLoadError(null)
    }, [])

    const fileName = fileBlock.fields.fileName || 'file'
    const fileSize = fileBlock.fields.fileSize ? Utils.humanFileSize(fileBlock.fields.fileSize) : ''
    const icon = getFileIcon(fileName)

    return (
        <MediaLoader
            isLoading={isLoading}
            error={loadError}
            onRetry={handleRetry}
            className='FileGenericElement__loader'
        >
            <div
                className='FileGenericElement__container'
                onClick={handleDownload}
                role='button'
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleDownload(e as unknown as React.MouseEvent)
                    }
                }}
            >
                <div className='FileGenericElement__icon'>
                    <CompassIcon
                        icon={icon}
                        className='FileGenericElement__icon-image'
                    />
                </div>
                <div className='FileGenericElement__info'>
                    <span className='FileGenericElement__filename'>{fileName}</span>
                    <span className='FileGenericElement__metadata'>
                        {fileSize}
                        {fileSize && ' · '}
                        {intl.formatMessage({id: 'FileGenericElement.download', defaultMessage: 'Click to download'})}
                    </span>
                </div>
            </div>
        </MediaLoader>
    )
}

contentRegistry.registerContentType({
    type: 'file-generic',
    getDisplayText: (intl: IntlShape) => intl.formatMessage({id: 'ContentBlock.file-generic', defaultMessage: 'File attachment'}),
    getIcon: () => <CompassIcon icon='file-outline'/>,
    createBlock: async (boardId: string, intl: IntlShape) => {
        return new Promise<FileGenericBlock>(
            (resolve, reject) => {
                Utils.selectLocalFile(async (file) => {
                    const fileId = await octoClient.uploadFile(boardId, file)

                    if (fileId) {
                        const block = createFileGenericBlock()
                        block.fields.fileId = fileId || ''
                        block.fields.fileName = file.name
                        block.fields.fileSize = file.size
                        block.fields.mimeType = file.type || ''
                        resolve(block)
                    } else {
                        sendFlashMessage({content: intl.formatMessage({id: 'createFileGenericBlock.failed', defaultMessage: 'Unable to upload the file. File size limit reached.'}), severity: 'normal'})
                        reject(new Error('Upload failed'))
                    }
                },
                '*')
            },
        )
    },
    createComponent: (block) => <FileGenericElement block={block}/>,
})

export default React.memo(FileGenericElement)
