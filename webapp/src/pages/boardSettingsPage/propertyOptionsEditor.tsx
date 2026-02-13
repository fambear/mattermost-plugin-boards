// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {IPropertyTemplate, IPropertyOption, WorkflowTag} from '../../blocks/board'
import Editable from '../../widgets/editable'
import IconButton from '../../widgets/buttons/iconButton'
import DeleteIcon from '../../widgets/icons/delete'
import UpIcon from '../../widgets/icons/sortUp'
import DownIcon from '../../widgets/icons/sortDown'
import Button from '../../widgets/buttons/button'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import {Utils, IDType} from '../../utils'

import './propertyOptionsEditor.scss'

type Props = {
    property: IPropertyTemplate
    isStatusProperty?: boolean
    onUpdate: (options: IPropertyOption[]) => void
    onPropertyUpdate: (updates: Partial<IPropertyTemplate>) => void
}

const PropertyOptionsEditor = (props: Props): JSX.Element => {
    const {property, isStatusProperty} = props
    const intl = useIntl()

    const handleAddOption = useCallback(() => {
        const newOption: IPropertyOption = {
            id: Utils.createGuid(IDType.BlockID),
            value: intl.formatMessage({id: 'PropertyOptionsEditor.new-option', defaultMessage: 'New option'}),
            color: 'propColorDefault',
            hideIfEmpty: false,
        }
        props.onUpdate([...property.options, newOption])
    }, [property.options, props, intl])

    const handleTagChange = useCallback((optionId: string, tag: WorkflowTag | '') => {
        const updatedOptions = property.options.map((opt) =>
            opt.id === optionId ? {...opt, tag: tag || undefined} : opt
        )
        props.onUpdate(updatedOptions)
    }, [property.options, props])

    const handleUpdateOption = useCallback((optionId: string, updates: Partial<IPropertyOption>) => {
        const updatedOptions = property.options.map((opt) =>
            opt.id === optionId ? {...opt, ...updates} : opt
        )
        props.onUpdate(updatedOptions)
    }, [property.options, props])

    const handleDeleteOption = useCallback((optionId: string) => {
        const updatedOptions = property.options.filter((opt) => opt.id !== optionId)
        props.onUpdate(updatedOptions)
    }, [property.options, props])

    const handleReorderOption = useCallback((optionId: string, newIndex: number) => {
        const currentIndex = property.options.findIndex((opt) => opt.id === optionId)
        if (currentIndex === -1 || currentIndex === newIndex) {
            return
        }

        const newOptions = [...property.options]
        const [movedOption] = newOptions.splice(currentIndex, 1)
        newOptions.splice(newIndex, 0, movedOption)

        props.onUpdate(newOptions)
    }, [property.options, props])

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

    const tagOptions: Array<{id: WorkflowTag | '', name: string}> = isStatusProperty ? [
        {id: '', name: intl.formatMessage({id: 'PropertyOptionsEditor.no-tag', defaultMessage: 'No tag'})},
        {id: 'Preparation', name: 'Preparation'},
        {id: 'Execution', name: 'Execution'},
        {id: 'Review', name: 'Review'},
        {id: 'Finished', name: 'Finished'},
        {id: 'Rejected', name: 'Rejected'},
    ] : []

    return (
        <div className='PropertyOptionsEditor'>
            <div className='PropertyOptionsEditor__header'>
                <FormattedMessage
                    id='PropertyOptionsEditor.title'
                    defaultMessage='Options'
                />
            </div>

            <div className='PropertyOptionsEditor__list'>
                {property.options.map((option, index) => (
                    <div
                        key={option.id}
                        className='PropertyOptionsEditor__option'
                    >
                        <div className='PropertyOptionsEditor__option-color'>
                            <MenuWrapper>
                                <button
                                    type='button'
                                    className={`PropertyOptionsEditor__color-button ${option.color}`}
                                >
                                    <span className={`PropertyOptionsEditor__color-swatch ${option.color}`}/>
                                    {option.color.replace('propColor', '')}
                                </button>
                                <Menu>
                                    {colorOptions.map((color) => (
                                        <Menu.Text
                                            key={color}
                                            id={color}
                                            name={color.replace('propColor', '')}
                                            icon={<span className={`PropertyOptionsEditor__color-swatch ${color}`}/>}
                                            onClick={() => handleUpdateOption(option.id, {color})}
                                        />
                                    ))}
                                </Menu>
                            </MenuWrapper>
                        </div>

                        <div className='PropertyOptionsEditor__option-value'>
                            <Editable
                                value={option.value}
                                placeholderText={intl.formatMessage({
                                    id: 'PropertyOptionsEditor.option-placeholder',
                                    defaultMessage: 'Option value',
                                })}
                                onChange={(newValue) => handleUpdateOption(option.id, {value: newValue})}
                                saveOnEsc={true}
                            />
                        </div>

                        {isStatusProperty && (
                            <div className='PropertyOptionsEditor__option-tag'>
                                <MenuWrapper>
                                    <button className='PropertyItem__dropdown'>
                                        {tagOptions.find((t) => t.id === (option.tag || ''))?.name || tagOptions[0].name}
                                    </button>
                                    <Menu>
                                        {tagOptions.map((tag) => (
                                            <Menu.Text
                                                key={tag.id}
                                                id={tag.id}
                                                name={tag.name}
                                                onClick={() => handleTagChange(option.id, tag.id)}
                                            />
                                        ))}
                                    </Menu>
                                </MenuWrapper>
                            </div>
                        )}

                        <div className='PropertyOptionsEditor__option-actions'>
                            {index > 0 && (
                                <IconButton
                                    icon={<UpIcon/>}
                                    onClick={() => handleReorderOption(option.id, index - 1)}
                                />
                            )}
                            {index < property.options.length - 1 && (
                                <IconButton
                                    icon={<DownIcon/>}
                                    onClick={() => handleReorderOption(option.id, index + 1)}
                                />
                            )}
                            <IconButton
                                icon={<DeleteIcon/>}
                                onClick={() => handleDeleteOption(option.id)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className='PropertyOptionsEditor__add'>
                <Button onClick={handleAddOption}>
                    <FormattedMessage
                        id='PropertyOptionsEditor.add-option'
                        defaultMessage='+ Add Option'
                    />
                </Button>
            </div>
        </div>
    )
}

export default PropertyOptionsEditor

