// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Board} from '../../blocks/board'
import {QuickAction} from '../../blocks/quickAction'
import Editable from '../../widgets/editable'
import IconButton from '../../widgets/buttons/iconButton'
import DeleteIcon from '../../widgets/icons/delete'
import ExpandIcon from '../../widgets/icons/chevronDown'
import CollapseIcon from '../../widgets/icons/chevronRight'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'

import QuickActionConditionBuilder from './quickActionConditionBuilder'
import QuickActionBuilder from './quickActionBuilder'

import './quickActionEditor.scss'

type Props = {
    action: QuickAction
    board: Board
    isExpanded: boolean
    onToggleExpand: () => void
    onUpdate: (action: QuickAction) => void
    onDelete: () => void
}

const colorOptions = [
    'propColorDefault',
    'propColorGray',
    'propColorBrown',
    'propColorOrange',
    'propColorYellow',
    'propColorGreen',
    'propColorBlue',
    'propColorPurple',
    'propColorPink',
    'propColorRed',
]

const QuickActionEditor = (props: Props): JSX.Element => {
    const {action, board, isExpanded} = props
    const intl = useIntl()
    const [name, setName] = useState(action.name)
    const [confirmText, setConfirmText] = useState(action.confirmText)

    const handleNameSave = useCallback(() => {
        if (name !== action.name) {
            props.onUpdate({...action, name})
        }
    }, [name, action, props])

    const handleColorChange = useCallback((color: string) => {
        props.onUpdate({...action, style: { color }})
    }, [action, props])

    const handleConfirmRequiredChange = useCallback((confirmRequired: boolean) => {
        props.onUpdate({...action, confirmRequired})
    }, [action, props])

    const handleConfirmTextSave = useCallback(() => {
        if (confirmText !== action.confirmText) {
            props.onUpdate({...action, confirmText})
        }
    }, [confirmText, action, props])

    const handleConditionsChange = useCallback((conditions: QuickAction['conditions']) => {
        props.onUpdate({...action, conditions})
    }, [action, props])

    const handleActionsChange = useCallback((actions: QuickAction['actions']) => {
        props.onUpdate({...action, actions})
    }, [action, props])

    const colorName = action.style.color.replace('propColor', '')

    return (
        <div className='QuickActionEditor'>
            <div className='QuickActionEditor__header' onClick={props.onToggleExpand}>
                <IconButton
                    icon={isExpanded ? <ExpandIcon/> : <CollapseIcon/>}
                    onClick={(e) => {
                        e.stopPropagation()
                        props.onToggleExpand()
                    }}
                />
                <span className={`QuickActionEditor__name-badge ${action.style.color}`}>
                    {action.name}
                </span>
                <div className='QuickActionEditor__actions'>
                    <IconButton
                        icon={<DeleteIcon/>}
                        onClick={(e) => {
                            e.stopPropagation()
                            props.onDelete()
                        }}
                    />
                </div>
            </div>

            {isExpanded && (
                <div className='QuickActionEditor__content'>
                    <div className='QuickActionEditor__field'>
                        <label className='QuickActionEditor__label'>
                            <FormattedMessage
                                id='QuickActionEditor.name'
                                defaultMessage='Name'
                            />
                        </label>
                        <Editable
                            value={name}
                            placeholderText={intl.formatMessage({
                                id: 'QuickActionEditor.name-placeholder',
                                defaultMessage: 'Button label',
                            })}
                            onChange={setName}
                            onSave={handleNameSave}
                            saveOnEsc={true}
                        />
                    </div>

                    <div className='QuickActionEditor__field'>
                        <label className='QuickActionEditor__label'>
                            <FormattedMessage
                                id='QuickActionEditor.color'
                                defaultMessage='Color'
                            />
                        </label>
                        <MenuWrapper>
                            <button className={`QuickActionEditor__color-button ${action.style.color}`}>
                                <span className={`QuickActionEditor__color-swatch ${action.style.color}`}/>
                                {colorName}
                            </button>
                            <Menu>
                                {colorOptions.map((color) => (
                                    <Menu.Text
                                        key={color}
                                        id={color}
                                        name={color.replace('propColor', '')}
                                        icon={<span className={`QuickActionEditor__color-swatch ${color}`}/>}
                                        onClick={() => handleColorChange(color)}
                                    />
                                ))}
                            </Menu>
                        </MenuWrapper>
                    </div>

                    <div className='QuickActionEditor__field'>
                        <label className='QuickActionEditor__checkbox-label'>
                            <input
                                type='checkbox'
                                checked={action.confirmRequired}
                                onChange={(e) => handleConfirmRequiredChange(e.target.checked)}
                            />
                            <FormattedMessage
                                id='QuickActionEditor.confirm-required'
                                defaultMessage='Require confirmation'
                            />
                        </label>
                    </div>

                    {action.confirmRequired && (
                        <div className='QuickActionEditor__field'>
                            <label className='QuickActionEditor__label'>
                                <FormattedMessage
                                    id='QuickActionEditor.confirm-text'
                                    defaultMessage='Confirmation text'
                                />
                            </label>
                            <Editable
                                value={confirmText}
                                placeholderText={intl.formatMessage({
                                    id: 'QuickActionEditor.confirm-text-placeholder',
                                    defaultMessage: 'Message shown when user clicks the button',
                                })}
                                onChange={setConfirmText}
                                onSave={handleConfirmTextSave}
                                saveOnEsc={true}
                            />
                        </div>
                    )}

                    <div className='QuickActionEditor__section'>
                        <h4 className='QuickActionEditor__section-title'>
                            <FormattedMessage
                                id='QuickActionEditor.conditions'
                                defaultMessage='Conditions (ALL must match)'
                            />
                        </h4>
                        <QuickActionConditionBuilder
                            board={board}
                            conditions={action.conditions}
                            onChange={handleConditionsChange}
                        />
                    </div>

                    <div className='QuickActionEditor__section'>
                        <h4 className='QuickActionEditor__section-title'>
                            <FormattedMessage
                                id='QuickActionEditor.actions'
                                defaultMessage='Actions'
                            />
                        </h4>
                        <QuickActionBuilder
                            board={board}
                            actions={action.actions}
                            onChange={handleActionsChange}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default QuickActionEditor
