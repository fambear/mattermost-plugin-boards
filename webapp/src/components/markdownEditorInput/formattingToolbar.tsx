// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {useIntl} from 'react-intl'

import IconButton from '../../widgets/buttons/iconButton'
import CompassIcon from '../../widgets/icons/compassIcon'
import StrikethroughIcon from '../../widgets/icons/strikethrough'
import QuoteIcon from '../../widgets/icons/quote'

import './formattingToolbar.scss'

type Props = {
    onFormat: (format: string) => void
    onAttach?: () => void
}

const FormattingToolbar = (props: Props): JSX.Element => {
    const {onFormat, onAttach} = props
    const intl = useIntl()

    const boldText = intl.formatMessage({id: 'FormattingToolbar.bold', defaultMessage: 'Bold'})
    const italicText = intl.formatMessage({id: 'FormattingToolbar.italic', defaultMessage: 'Italic'})
    const strikethroughText = intl.formatMessage({id: 'FormattingToolbar.strikethrough', defaultMessage: 'Strikethrough'})
    const codeText = intl.formatMessage({id: 'FormattingToolbar.code', defaultMessage: 'Code'})
    const linkText = intl.formatMessage({id: 'FormattingToolbar.link', defaultMessage: 'Link'})
    const bulletListText = intl.formatMessage({id: 'FormattingToolbar.bulletList', defaultMessage: 'Bullet list'})
    const numberListText = intl.formatMessage({id: 'FormattingToolbar.numberList', defaultMessage: 'Numbered list'})
    const quoteText = intl.formatMessage({id: 'FormattingToolbar.quote', defaultMessage: 'Quote'})

    const preventFocusLoss = (e: React.MouseEvent) => {
        e.preventDefault()
    }

    return (
        <div className='FormattingToolbar'>
            <IconButton
                onClick={() => onFormat('bold')}
                onMouseDown={preventFocusLoss}
                icon={<CompassIcon icon='format-bold'/>}
                title={boldText}
                size='small'
            />
            <IconButton
                onClick={() => onFormat('italic')}
                onMouseDown={preventFocusLoss}
                icon={<CompassIcon icon='format-italic'/>}
                title={italicText}
                size='small'
            />
            <IconButton
                onClick={() => onFormat('strikethrough')}
                onMouseDown={preventFocusLoss}
                icon={<StrikethroughIcon/>}
                title={strikethroughText}
                size='small'
            />
            <IconButton
                onClick={() => onFormat('code')}
                onMouseDown={preventFocusLoss}
                icon={<CompassIcon icon='code-tags'/>}
                title={codeText}
                size='small'
            />
            <div className='FormattingToolbar__separator'/>
            <IconButton
                onClick={() => onFormat('link')}
                onMouseDown={preventFocusLoss}
                icon={<CompassIcon icon='link-variant'/>}
                title={linkText}
                size='small'
            />
            <div className='FormattingToolbar__separator'/>
            <IconButton
                onClick={() => onFormat('bulletList')}
                onMouseDown={preventFocusLoss}
                icon={<CompassIcon icon='format-list-bulleted'/>}
                title={bulletListText}
                size='small'
            />
            <IconButton
                onClick={() => onFormat('numberList')}
                onMouseDown={preventFocusLoss}
                icon={<CompassIcon icon='format-list-numbered'/>}
                title={numberListText}
                size='small'
            />
            <IconButton
                onClick={() => onFormat('quote')}
                onMouseDown={preventFocusLoss}
                icon={<QuoteIcon/>}
                title={quoteText}
                size='small'
            />
            {onAttach && (
                <>
                    <div className='FormattingToolbar__separator'/>
                    <IconButton
                        onClick={onAttach}
                        onMouseDown={preventFocusLoss}
                        icon={<CompassIcon icon='paperclip'/>}
                        title={intl.formatMessage({id: 'FormattingToolbar.attach', defaultMessage: 'Attach file'})}
                        size='small'
                    />
                </>
            )}
        </div>
    )
}

export default FormattingToolbar

