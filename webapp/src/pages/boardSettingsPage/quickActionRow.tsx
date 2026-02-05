// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react'
import {useIntl} from 'react-intl'

import {Board, IPropertyTemplate} from '../../blocks/board'
import {QuickActionAction, QuickActionActionType} from '../../blocks/quickAction'
import Button from '../../widgets/buttons/button'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import Editable from '../../widgets/editable'

import './quickActionRow.scss'

type Props = {
    action: QuickActionAction
    board: Board
    onChange: (action: QuickActionAction) => void
    onRemove: () => void
    showRemove: boolean
}

const QuickActionRow = (props: Props): JSX.Element => {
    const {action, board, showRemove} = props
    const intl = useIntl()

    const actionTypes: {value: QuickActionActionType, label: string}[] = [
        {value: 'setProperty', label: intl.formatMessage({id: 'QuickActionRow.set-property', defaultMessage: 'Set property'})},
        {value: 'clearProperty', label: intl.formatMessage({id: 'QuickActionRow.clear-property', defaultMessage: 'Clear property'})},
        {value: 'addComment', label: intl.formatMessage({id: 'QuickActionRow.add-comment', defaultMessage: 'Add comment'})},
    ]

    const handleTypeChange = useCallback((type: QuickActionActionType) => {
        const newAction: QuickActionAction = { type }
        if (type === 'setProperty') {
            newAction.propertyId = ''
            newAction.value = ''
        } else if (type === 'clearProperty') {
            newAction.propertyId = ''
        } else if (type === 'addComment') {
            newAction.text = ''
        }
        props.onChange(newAction)
    }, [props])

    const handlePropertyChange = useCallback((propertyId: string) => {
        props.onChange({
            ...action,
            propertyId,
            value: '',
        })
    }, [action, props])

    const handleValueChange = useCallback((value: string) => {
        props.onChange({
            ...action,
            value,
        })
    }, [action, props])

    const handleTextChange = useCallback((text: string) => {
        props.onChange({
            ...action,
            text,
        })
    }, [action, props])

    const selectedProperty = useMemo(() => {
        return board.cardProperties.find(p => p.id === action.propertyId)
    }, [board.cardProperties, action.propertyId])

    const needsProperty = action.type === 'setProperty' || action.type === 'clearProperty'
    const needsValue = action.type === 'setProperty'
    const needsText = action.type === 'addComment'

    return (
        <div className='QuickActionRow'>
            {showRemove && (
                <Button
                    onClick={props.onRemove}
                    className='QuickActionRow__remove-btn'
                >
                    {'[-]'}
                </Button>
            )}

            <MenuWrapper>
                <Button className='QuickActionRow__type-select'>
                    {actionTypes.find((t) => t.value === action.type)?.label || action.type}
                </Button>
                <Menu>
                    {actionTypes.map((type) => (
                        <Menu.Text
                            key={type.value}
                            id={type.value}
                            name={type.label}
                            onClick={() => handleTypeChange(type.value)}
                        />
                    ))}
                </Menu>
            </MenuWrapper>

            {needsProperty && (
                <MenuWrapper>
                    <Button className='QuickActionRow__property-select'>
                        {selectedProperty ? selectedProperty.name : intl.formatMessage({
                            id: 'QuickActionRow.select-property',
                            defaultMessage: 'Select property',
                        })}
                    </Button>
                    <Menu>
                        {board.cardProperties.map((prop) => (
                            <Menu.Text
                                key={prop.id}
                                id={prop.id}
                                name={prop.name}
                                onClick={handlePropertyChange}
                            />
                        ))}
                    </Menu>
                </MenuWrapper>
            )}

            {needsValue && selectedProperty && (
                <QuickActionValueInput
                    propertyTemplate={selectedProperty}
                    value={action.value || ''}
                    onChange={handleValueChange}
                />
            )}

            {needsText && (
                <Editable
                    value={action.text || ''}
                    placeholderText={intl.formatMessage({
                        id: 'QuickActionRow.comment-placeholder',
                        defaultMessage: 'Comment text',
                    })}
                    onChange={handleTextChange}
                    onSave={() => handleTextChange(action.text || '')}
                    saveOnEsc={true}
                />
            )}
        </div>
    )
}

// Component for handling value input based on property type (for setProperty action)
type ValueInputProps = {
    propertyTemplate: IPropertyTemplate
    value: string
    onChange: (value: string) => void
}

const QuickActionValueInput = (props: ValueInputProps): JSX.Element | null => {
    const {propertyTemplate, value} = props
    const intl = useIntl()

    const handleChange = (newValue: string) => {
        props.onChange(newValue)
    }

    // For text-based types, number, checkbox
    if (['text', 'url', 'email', 'phone', 'number'].includes(propertyTemplate.type) || propertyTemplate.type === 'checkbox') {
        return (
            <Editable
                value={value}
                placeholderText={intl.formatMessage({
                    id: 'QuickActionRow.value-placeholder',
                    defaultMessage: 'Value',
                })}
                onChange={handleChange}
                onSave={() => handleChange(value)}
                saveOnEsc={true}
            />
        )
    }

    // For date types, show placeholder {now}
    if (['date', 'createdTime', 'updatedTime'].includes(propertyTemplate.type)) {
        return (
            <Editable
                value={value}
                placeholderText={'{now}'}
                onChange={handleChange}
                onSave={() => handleChange(value)}
                saveOnEsc={true}
            />
        )
    }

    // For select, show option picker
    if (propertyTemplate.type === 'select') {
        const selectedOption = propertyTemplate.options.find((o) => o.id === value)
        return (
            <MenuWrapper>
                <Button>{selectedOption ? selectedOption.value : intl.formatMessage({
                    id: 'QuickActionRow.select-value',
                    defaultMessage: '(select value)',
                })}</Button>
                <Menu>
                    {propertyTemplate.options.map((option) => (
                        <Menu.Text
                            key={option.id}
                            id={option.id}
                            name={option.value}
                            onClick={() => handleChange(option.id)}
                        />
                    ))}
                </Menu>
            </MenuWrapper>
        )
    }

    // For person types, show placeholder {current_user}
    if (['person', 'multiPerson', 'createdBy', 'updatedBy'].includes(propertyTemplate.type)) {
        return (
            <Editable
                value={value}
                placeholderText={'{current_user}'}
                onChange={handleChange}
                onSave={() => handleChange(value)}
                saveOnEsc={true}
            />
        )
    }

    return null
}

export default QuickActionRow
