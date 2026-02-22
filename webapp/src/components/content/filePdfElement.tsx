// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState, useCallback, useRef} from 'react'
import {IntlShape, useIntl} from 'react-intl'

import {ContentBlock} from '../../blocks/contentBlock'
import {FilePdfBlock, createFilePdfBlock} from '../../blocks/filePdfBlock'
import octoClient from '../../octoClient'
import {Utils} from '../../utils'
import CompassIcon from '../../widgets/icons/compassIcon'
import {sendFlashMessage} from '../../components/flashMessages'

import {contentRegistry} from './contentRegistry'
import MediaLoader from './mediaLoader/mediaLoader'

import './filePdfElement.scss'

type Props = {
    block: ContentBlock
}

const FilePdfElement = (props: Props): JSX.Element|null => {
    const [pdfDataUrl, setPdfDataUrl] = useState<string|null>(null)
    const [thumbnailUrl, setThumbnailUrl] = useState<string|null>(null)
    const [pageCount, setPageCount] = useState<number>(0)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string|null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const intl = useIntl()

    const {block} = props
    const pdfBlock = block as FilePdfBlock
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const handleRetry = useCallback(() => {
        setLoadError(null)
        setIsLoading(true)
        setPdfDataUrl(null)
        setThumbnailUrl(null)
        setRetryCount(prev => prev + 1)
    }, [])

    useEffect(() => {
        let cancelled = false

        const loadPdf = async () => {
            setIsLoading(true)
            setLoadError(null)

            try {
                const fileURL = await octoClient.getFileAsDataUrl(block.boardId, pdfBlock.fields.fileId)
                if (cancelled) {
                    return
                }
                if (!fileURL.url || fileURL.url.length === 0) {
                    setLoadError(intl.formatMessage({
                        id: 'FilePdfElement.load-failed',
                        defaultMessage: 'Unable to load PDF',
                    }))
                    setIsLoading(false)
                    return
                }
                setPdfDataUrl(fileURL.url)

                // Use page count from block fields if available, otherwise extract it
                if (pdfBlock.fields.pageCount) {
                    setPageCount(pdfBlock.fields.pageCount)
                }

                setIsLoading(false)
            } catch (error) {
                if (cancelled) {
                    return
                }
                Utils.logError(`Failed to load PDF: ${error}`)
                setLoadError(intl.formatMessage({
                    id: 'FilePdfElement.load-failed',
                    defaultMessage: 'Unable to load PDF',
                }))
                setIsLoading(false)
            }
        }
        loadPdf()

        return () => {
            cancelled = true
        }
    }, [block.boardId, pdfBlock.fields.fileId, pdfBlock.fields.pageCount, retryCount, intl])

    // Render PDF thumbnail using pdf.js
    useEffect(() => {
        if (!pdfDataUrl) {
            return
        }

        const renderThumbnail = async () => {
            try {
                const pdfjsLib = await import('pdfjs-dist')
                pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

                const pdf = await pdfjsLib.getDocument(pdfDataUrl).promise

                // Update page count if not already set
                if (!pdfBlock.fields.pageCount) {
                    setPageCount(pdf.numPages)
                }

                const page = await pdf.getPage(1)
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

                await page.render({
                    canvasContext: context,
                    viewport,
                }).promise

                setThumbnailUrl(canvas.toDataURL('image/png'))
            } catch (error) {
                Utils.logError(`Failed to render PDF thumbnail: ${error}`)
            }
        }
        renderThumbnail()
    }, [pdfDataUrl, pdfBlock.fields.pageCount])

    const handleDownload = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        if (!pdfDataUrl) {
            return
        }

        const link = document.createElement('a')
        link.href = pdfDataUrl
        link.download = pdfBlock.fields.fileName || 'document.pdf'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }, [pdfDataUrl, pdfBlock.fields.fileName])

    const fileName = pdfBlock.fields.fileName || 'document.pdf'
    const fileSize = pdfBlock.fields.fileSize ? Utils.humanFileSize(pdfBlock.fields.fileSize) : ''

    return (
        <MediaLoader
            isLoading={isLoading}
            error={loadError}
            onRetry={handleRetry}
            className='FilePdfElement__loader'
        >
            <div className='FilePdfElement__container'>
                <div className='FilePdfElement__content'>
                    <div className='FilePdfElement__thumbnail'>
                        {thumbnailUrl ? (
                            <img
                                src={thumbnailUrl}
                                alt={fileName}
                                className='FilePdfElement__thumbnail-image'
                            />
                        ) : (
                            <div className='FilePdfElement__thumbnail-placeholder'>
                                <CompassIcon
                                    icon='file-pdf-outline-large'
                                    className='FilePdfElement__placeholder-icon'
                                />
                            </div>
                        )}
                        <canvas
                            ref={canvasRef}
                            style={{display: 'none'}}
                        />
                    </div>
                    <div className='FilePdfElement__info'>
                        <span className='FilePdfElement__filename'>{fileName}</span>
                        <span className='FilePdfElement__metadata'>
                            {fileSize}
                            {pageCount > 0 && ` · ${intl.formatMessage({id: 'FilePdfElement.pages', defaultMessage: '{count} pages'}, {count: pageCount})}`}
                        </span>
                        <button
                            className='FilePdfElement__download'
                            onClick={handleDownload}
                            type='button'
                        >
                            <CompassIcon icon='download-outline'/>
                            {intl.formatMessage({id: 'FilePdfElement.download', defaultMessage: 'Download'})}
                        </button>
                    </div>
                </div>
            </div>
        </MediaLoader>
    )
}

contentRegistry.registerContentType({
    type: 'file-pdf',
    getDisplayText: (intl: IntlShape) => intl.formatMessage({id: 'ContentBlock.file-pdf', defaultMessage: 'PDF file'}),
    getIcon: () => <CompassIcon icon='file-pdf-outline-large'/>,
    createBlock: async (boardId: string, intl: IntlShape) => {
        return new Promise<FilePdfBlock>(
            (resolve) => {
                Utils.selectLocalFile(async (file) => {
                    const fileId = await octoClient.uploadFile(boardId, file)

                    if (fileId) {
                        const block = createFilePdfBlock()
                        block.fields.fileId = fileId || ''
                        block.fields.fileName = file.name
                        block.fields.fileSize = file.size
                        block.fields.mimeType = file.type || 'application/pdf'
                        resolve(block)
                    } else {
                        sendFlashMessage({content: intl.formatMessage({id: 'createFilePdfBlock.failed', defaultMessage: 'Unable to upload the file. File size limit reached.'}), severity: 'normal'})
                        resolve(createFilePdfBlock())
                    }
                },
                '.pdf')
            },
        )
    },
    createComponent: (block) => <FilePdfElement block={block}/>,
})

export default React.memo(FilePdfElement)
