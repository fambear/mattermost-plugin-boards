// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useCallback, useRef} from 'react'
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
    const [imgRendered, setImgRendered] = useState(false)
    const [loadError, setLoadError] = useState<string|null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const intl = useIntl()

    // Image metadata from block fields (instant, no API call needed)
    const blockWidth = props.block.fields.width
    const blockHeight = props.block.fields.height
    const blockMiniPreview = props.block.fields.miniPreview

    const {block} = props

    const handleRetry = useCallback(() => {
        setLoadError(null)
        setImgRendered(false)
        setImageDataUrl(null)
        setRetryCount(prev => prev + 1)
    }, [])

    useEffect(() => {
        let cancelled = false

        setLoadError(null)

        const loadImage = async () => {
            try {
                const fileURL = await octoClient.getFileAsDataUrl(block.boardId, props.block.fields.fileId)
                if (cancelled) {
                    return
                }
                if (!fileURL.url || fileURL.url.length === 0) {
                    setLoadError(intl.formatMessage({
                        id: 'ImageElement.load-failed',
                        defaultMessage: 'Unable to load image',
                    }))
                    return
                }
                setImageDataUrl(fileURL.url)

                const fullFileInfo = await octoClient.getFileInfo(block.boardId, props.block.fields.fileId)
                if (cancelled) {
                    return
                }
                setFileInfo(fullFileInfo)
            } catch (error) {
                if (cancelled) {
                    return
                }
                Utils.logError(`Failed to load image: ${error}`)
                setLoadError(intl.formatMessage({
                    id: 'ImageElement.load-failed',
                    defaultMessage: 'Unable to load image',
                }))
            }
        }
        loadImage()

        return () => {
            cancelled = true
        }
    }, [block.boardId, props.block.fields.fileId, retryCount, intl])

    const backfillInFlight = useRef(false)

    const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget
        setImageDimensions({
            width: img.naturalWidth,
            height: img.naturalHeight,
        })
        setImgRendered(true)

        // Backfill: if block has no stored dimensions, fetch metadata from server
        // and patch the block so future renders get instant placeholders.
        if (!blockWidth && !blockHeight && !backfillInFlight.current && block.fields.fileId) {
            backfillInFlight.current = true
            octoClient.getFileImageMetadata(block.boardId, block.fields.fileId).then((meta) => {
                if (meta.width && meta.height) {
                    const updatedFields: Record<string, unknown> = {
                        width: meta.width,
                        height: meta.height,
                    }
                    if (meta.miniPreview) {
                        updatedFields.miniPreview = meta.miniPreview
                    }
                    octoClient.patchBlock(block.boardId, block.id, {updatedFields})
                }
            }).catch(() => {
                // Backfill is best-effort; ignore errors
            })
        }
    }, [block.boardId, block.id, block.fields.fileId, blockWidth, blockHeight])

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

    // Calculate dimensions for placeholder
    const miniPreviewSrc = blockMiniPreview ? `data:image/jpeg;base64,${blockMiniPreview}` : undefined

    // Use height as the anchor — width will follow from aspect-ratio
    const resolvedHeight = blockHeight || (imageDimensions?.height ?? 0)
    const resolvedWidth = blockWidth || (imageDimensions?.width ?? 0)
    // Match the same constraints as .focalboard-body .octo-block img (max-width/max-height: 500px)
    const MAX_DISPLAY = 500
    const displayWidth = resolvedWidth > 0 ? Math.min(resolvedWidth, MAX_DISPLAY) : 0
    const displayHeight = resolvedHeight > 0 ? Math.min(resolvedHeight, MAX_DISPLAY) : 0

    // Scale proportionally if either dimension was clamped
    let finalWidth = displayWidth
    let finalHeight = displayHeight
    if (resolvedWidth > 0 && resolvedHeight > 0) {
        const scaleW = MAX_DISPLAY / resolvedWidth
        const scaleH = MAX_DISPLAY / resolvedHeight
        const scale = Math.min(scaleW, scaleH, 1) // don't upscale
        finalWidth = Math.round(resolvedWidth * scale)
        finalHeight = Math.round(resolvedHeight * scale)
    }

    const placeholderStyle: React.CSSProperties | undefined = (finalWidth > 0 && finalHeight > 0)
        ? {width: `${finalWidth}px`, height: `${finalHeight}px`, maxWidth: '100%'}
        : undefined

    if (loadError) {
        return (
            <MediaLoader
                isLoading={false}
                error={loadError}
                onRetry={handleRetry}
                className='ImageElement__loader'
            >
                <div/>
            </MediaLoader>
        )
    }

    // Single DOM tree for both loading and loaded states to prevent layout shift.
    // The container always has explicit width; the placeholder sits behind/over the
    // image and fades away once the image fires onLoad.
    const imageLoaded = imgRendered

    return (
        <div className='ImageElement__container'>
            {/* Placeholder: sized by height + aspect-ratio, visible while loading */}
            {!imageLoaded && placeholderStyle && (
                <div
                    className='ImageElement__placeholder'
                    style={placeholderStyle}
                >
                    {miniPreviewSrc && (
                        <img
                            className='ImageElement__mini-preview'
                            src={miniPreviewSrc}
                            alt=''
                        />
                    )}
                    <div className='ImageElement__placeholder-spinner'>
                        <div className='MediaLoader__spinner'/>
                    </div>
                </div>
            )}
            {!imageLoaded && !placeholderStyle && (
                <div className='MediaLoader__loading'>
                    <div className='MediaLoader__spinner'/>
                </div>
            )}

            {/* Image: rendered as soon as we have a URL (hidden until loaded) */}
            {imageDataUrl && (
                <div className='ImageElement__wrapper' style={!imageLoaded ? {position: 'absolute', opacity: 0, pointerEvents: 'none'} : undefined}>
                    <img
                        className='ImageElement'
                        src={imageDataUrl}
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
            )}
            {imageLoaded && (imageDimensions || (fileInfo && fileInfo.size)) && (
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
            {showViewer && (
                <RootPortal>
                    <ImageViewer
                        imageUrl={imageDataUrl || ''}
                        onClose={handleCloseViewer}
                    />
                </RootPortal>
            )}
        </div>
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
                    const uploadResult = await octoClient.uploadFile(boardId, file)

                    if (uploadResult) {
                        const block = createImageBlock()
                        block.fields.fileId = uploadResult.fileId || ''
                        block.fields.width = uploadResult.width
                        block.fields.height = uploadResult.height
                        block.fields.miniPreview = uploadResult.miniPreview
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
