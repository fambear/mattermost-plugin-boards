// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, Suspense, useMemo, useCallback} from 'react'
import {Provider} from 'react-redux'

import {Utils} from '../utils'
import {formatText, messageHtmlToComponent} from '../webapp_globals'
import './markdownEditor.scss'

const MarkdownEditorInput = React.lazy(() => import('./markdownEditorInput/markdownEditorInput'))
const FormattingToolbar = React.lazy(() => import('./markdownEditorInput/formattingToolbar'))

type Props = {
    id?: string
    text?: string
    placeholderText?: string
    className?: string
    readonly?: boolean

    onChange?: (text: string) => void
    onFocus?: () => void
    onBlur?: (text: string) => void
    onKeyDown?: (e: React.KeyboardEvent) => void
    onEditorCancel?: () => void
    autofocus?: boolean
    saveOnEnter?: boolean
    showToolbar?: boolean
    onFilePaste?: (files: FileList) => void
    onAttach?: () => void
}

const MarkdownEditor = (props: Props): JSX.Element => {
    const {placeholderText, onFocus, onEditorCancel, onBlur, onChange, text, id, saveOnEnter} = props
    const [isEditing, setIsEditing] = useState(Boolean(props.autofocus))

    const displayText = text || placeholderText || ''

    // Use Mattermost's formatText for rich rendering (syntax highlighting, @mentions, etc.)
    // Fall back to marked if MM renderer is not available.
    // Only use MM renderer when there's actual text content (not for empty placeholders).
    const previewContent = useMemo(() => {
        if (text && formatText && messageHtmlToComponent) {
            try {
                const mmStore = (window as any).store
                const formattedHtml = formatText(displayText, {atMentions: false, team: null, channelNamesMap: {}})
                const rendered = messageHtmlToComponent(formattedHtml, {fetchMissingUsers: false})
                if (mmStore) {
                    return <Provider store={mmStore}>{rendered}</Provider>
                }
                return rendered
            } catch {
                // Fall through to marked renderer
            }
        }
        const html: string = Utils.htmlFromMarkdown(displayText)
        return <span dangerouslySetInnerHTML={{__html: html}}/>
    }, [text, displayText])

    const previewElement = (
        <div
            data-testid='preview-element'
            className={text ? 'octo-editor-preview' : 'octo-editor-preview octo-placeholder'}
            onClick={(e) => {
                const LINK_TAG_NAME = 'a'
                const element = e.target as Element
                if (element.tagName.toLowerCase() === LINK_TAG_NAME) {
                    e.stopPropagation()
                    return
                }

                if (!props.readonly && !isEditing) {
                    setIsEditing(true)
                }
            }}
        >
            {previewContent}
        </div>
    )

    const editorOnBlur = (newText: string) => {
        setIsEditing(false)
        onBlur && onBlur(newText)
    }

    const editorElement = (
        <Suspense fallback={<></>}>
            <MarkdownEditorInput
                id={id}
                onChange={onChange}
                onFocus={onFocus}
                onEditorCancel={onEditorCancel}
                onBlur={editorOnBlur}
                initialText={text}
                isEditing={isEditing}
                saveOnEnter={saveOnEnter}
                showToolbar={props.showToolbar}
                onFilePaste={props.onFilePaste}
                onAttach={props.onAttach}
            />
        </Suspense>
    )

    const switchToEditing = useCallback(() => {
        if (!props.readonly) {
            setIsEditing(true)
        }
    }, [props.readonly])

    const element = (
        <div className={`MarkdownEditor octo-editor ${props.className || ''} ${isEditing ? 'active' : ''}`}>
            {isEditing ? editorElement : previewElement}
            {props.showToolbar && !isEditing && (
                <Suspense fallback={<></>}>
                    <FormattingToolbar
                        onFormat={switchToEditing}
                        onAttach={props.onAttach || switchToEditing}
                    />
                </Suspense>
            )}
        </div>
    )

    return element
}

export {MarkdownEditor}
