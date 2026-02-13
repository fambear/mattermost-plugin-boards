// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useCallback} from 'react'
import {IntlShape, useIntl} from 'react-intl'

import {ContentBlock} from '../../blocks/contentBlock'
import {ImageBlock, createImageBlock} from '../../blocks/imageBlock'
import octoClient from '../../octoClient'
import {Utils} from '../../utils'
import ImageIcon from '../../widgets/icons/image'
import {sendFlashMessage} from '../../components/flashMessages'
import CompassIcon from '../../widgets/icons/compassIcon'

import {FileInfo} from '../../blocks/block'
import ImageViewer from '../imageViewer/imageViewer'
import RootPortal from '../rootPortal'

import {contentRegistry} from './contentRegistry'
import ArchivedFile from './archivedFile/archivedFile'
import MediaLoader from './mediaLoader'

import './imageElement.scss'

type Props = {
    block: ContentBlock
}

type ImageDimensions = {
    width: number
    height: number
}

const ImageElement = (props: Props): JSX.Element|null => {
    const [imageDataUrl, setImageDataUrl] = useState<string|null>(null)
    const [fileInfo, setFileInfo] = useState<FileInfo>({})
    const [imageDimensions, setImageDimensions] = useState<ImageDimensions|null>(null)
    const [showViewer, setShowViewer] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string|null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const intl = useIntl()

    const {block} = props

    const handleRetry = useCallback(() => {
        setLoadError(null)
        setIsLoading(true)
        setImageDataUrl(null)
        setRetryCount(prev => prev + 1)
    }, [])

    useEffect(() => {
        setIsLoading(true)
        setLoadError(null)

        const loadImage = async () => {
            try {
                const fileURL = await octoClient.getFileAsDataUrl(block.boardId, props.block.fields.fileId)
                if (!fileURL.url || fileURL.url.length === 0) {
                    setLoadError(intl.formatMessage({
                        id: 'ImageElement.load-failed',
                        defaultMessage: 'Unable to load image',
                    }))
                    setIsLoading(false)
                    return
                }
                setImageDataUrl(fileURL.url)

                const fullFileInfo = await octoClient.getFileInfo(block.boardId, props.block.fields.fileId)
                setFileInfo(fullFileInfo)
                setIsLoading(false)
            } catch (error) {
                Utils.logError(`Failed to load image: ${error}`)
                setLoadError(intl.formatMessage({
                    id: 'ImageElement.load-failed',
                    defaultMessage: 'Unable to load image',
                }))
                setIsLoading(false)
            }
        }
        loadImage()
    }, [block.boardId, props.block.fields.fileId, retryCount, intl])

    const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget
        setImageDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
        })
    }, [])

    const handleImageClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        setShowViewer(true)
    }, [])

    const handleImageKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setShowViewer(true)
        }
    }, [])

    const handleCloseViewer = useCallback(() => {
        setShowViewer(false)
    }, [])

    if (fileInfo && fileInfo.archived) {
        return (
            <ArchivedFile fileInfo={fileInfo}/>
        )
    }

    return (
        <MediaLoader
            isLoading={isLoading}
            error={loadError}
            onRetry={handleRetry}
            className='ImageElement__loader'
        >
            <div className='ImageElement__container'>
                <div className='ImageElement__wrapper'>
                    <img
                        className='ImageElement'
                        src={imageDataUrl || ''}
                        alt=''
                        aria-label={block.title || intl.formatMessage({id: 'ImageElement.view-fullscreen', defaultMessage: 'View image in full screen'})}
                        onLoad={handleImageLoad}
                    />
                    <div
                        className='ImageElement__overlay'
                        onClick={handleImageClick}
                        onKeyDown={handleImageKeyDown}
                        tabIndex={0}
                        role='button'
                        aria-label={intl.formatMessage({id: 'ImageElement.view-fullscreen', defaultMessage: 'View image in full screen'})}
                    >
                        <div className='ImageElement__magnify-icon'>
                            <CompassIcon
                                icon='magnify'
                                className='MagnifyIcon'
                            />
                        </div>
                    </div>
                </div>
                {(imageDimensions || (fileInfo && fileInfo.size) || imageDataUrl) && (
                    <div className='ImageElement__metadata'>
                        {imageDimensions && (
                            <span className='ImageElement__dimensions'>
                                {imageDimensions.width}×{imageDimensions.height}
                            </span>
                        )}
                        {fileInfo && fileInfo.size && (
                            <span className='ImageElement__size'>
                                {Utils.humanFileSize(fileInfo.size)}
                            </span>
                        )}
                        {imageDataUrl && (
                            <a
                                href={imageDataUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='ImageElement__download'
                                onClick={(e) => e.stopPropagation()}
                            >
                                {intl.formatMessage({id: 'ImageElement.download', defaultMessage: 'Download'})}
                            </a>
                        )}
                    </div>
                )}
            </div>
            {showViewer && (
                <RootPortal>
                    <ImageViewer
                        imageUrl={imageDataUrl || ''}
                        onClose={handleCloseViewer}
                    />
                </RootPortal>
            )}
        </MediaLoader>
    )
}

contentRegistry.registerContentType({
    type: 'image',
    getDisplayText: (intl: IntlShape) => intl.formatMessage({id: 'ContentBlock.image', defaultMessage: 'image'}),
    getIcon: () => <ImageIcon/>,
    createBlock: async (boardId: string, intl: IntlShape) => {
        return new Promise<ImageBlock>(
            (resolve) => {
                Utils.selectLocalFile(async (file) => {
                    const fileId = await octoClient.uploadFile(boardId, file)

                    if (fileId) {
                        const block = createImageBlock()
                        block.fields.fileId = fileId || ''
                        resolve(block)
                    } else {
                        sendFlashMessage({content: intl.formatMessage({id: 'createImageBlock.failed', defaultMessage: 'Unable to upload the file. File size limit reached.'}), severity: 'normal'})
                    }
                },
                '.jpg,.jpeg,.png,.gif')
            },
        )

        // return new ImageBlock()
    },
    createComponent: (block) => <ImageElement block={block}/>,
})

export default React.memo(ImageElement)
