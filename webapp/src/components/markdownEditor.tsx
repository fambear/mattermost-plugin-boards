// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, Suspense} from 'react'

import {getChannelsNameMapInTeam} from 'mattermost-redux/selectors/entities/channels'

import {Provider} from 'react-redux'

import {Utils} from '../utils'
import {formatText, messageHtmlToComponent} from '../webapp_globals'
import {getCurrentTeam} from '../store/teams'
import {useAppSelector} from '../store/hooks'
import './markdownEditor.scss'

const MarkdownEditorInput = React.lazy(() => import('./markdownEditorInput/markdownEditorInput'))

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
    keepEditing?: boolean
}

const MarkdownEditor = (props: Props): JSX.Element => {
    const {placeholderText, onFocus, onEditorCancel, onBlur, onChange, text, id, saveOnEnter} = props
    const [isEditing, setIsEditing] = useState(Boolean(props.autofocus))

    const selectedTeam = useAppSelector(getCurrentTeam)
    const channelNamesMap = getChannelsNameMapInTeam((window as any).store.getState(), selectedTeam?.id || '')

    const displayText = text || placeholderText || ''

    // Use Mattermost's formatText for rich rendering (syntax highlighting, @mentions, etc.)
    // Fall back to marked if MM renderer is not available
    let previewContent: React.ReactNode
    if (formatText && messageHtmlToComponent) {
        previewContent = (
            <Provider store={(window as any).store}>
                {messageHtmlToComponent(formatText(displayText, {
                    atMentions: true,
                    team: selectedTeam,
                    channelNamesMap,
                }), {})}
            </Provider>
        )
    } else {
        const html: string = Utils.htmlFromMarkdown(displayText)
        previewContent = <span dangerouslySetInnerHTML={{__html: html}}/>
    }

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
        if (!props.keepEditing) {
            setIsEditing(false)
        }
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
            />
        </Suspense>
    )

    const element = (
        <div className={`MarkdownEditor octo-editor ${props.className || ''} ${isEditing ? 'active' : ''}`}>
            {isEditing ? editorElement : previewElement}
        </div>
    )

    return element
}

export {MarkdownEditor}
