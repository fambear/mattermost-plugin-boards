// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useCallback} from 'react'
import {useIntl, IntlShape} from 'react-intl'

import {Board, IPropertyTemplate} from '../../blocks/board'
import {QuickActionCondition, QuickActionConditionOperator} from '../../blocks/quickAction'
import Button from '../../widgets/buttons/button'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import propsRegistry from '../../properties'
import Editable from '../../widgets/editable'

import './quickActionConditionRow.scss'

type Props = {
    condition: QuickActionCondition
    board: Board
    isFirstRow: boolean
    onChange: (condition: QuickActionCondition) => void
    onRemove: () => void
}

const QuickActionConditionRow = (props: Props): JSX.Element => {
    const {condition, board} = props
    const intl = useIntl()

    const propertyTemplate = useMemo(() => {
        return board.cardProperties.find(p => p.id === condition.propertyId)
    }, [board.cardProperties, condition.propertyId])

    const propertyType = useMemo(() => {
        return propertyTemplate ? propsRegistry.get(propertyTemplate.type) : null
    }, [propertyTemplate])

    // Get available operators based on property type
    const availableOperators = useMemo(() => {
        if (!propertyTemplate) {
            return []
        }

        const operators: {value: QuickActionConditionOperator, label: string}[] = []

        // empty/not empty available for all types
        operators.push(
            {value: 'empty', label: intl.formatMessage({id: 'Filter.is-empty', defaultMessage: 'is empty'})},
            {value: 'not empty', label: intl.formatMessage({id: 'Filter.is-not-empty', defaultMessage: 'is not empty'})}
        )

        switch (propertyTemplate.type) {
        case 'select':
        case 'multiSelect':
            operators.push(
                {value: 'in', label: intl.formatMessage({id: 'Filter.includes', defaultMessage: 'includes'})},
                {value: 'not in', label: intl.formatMessage({id: 'Filter.not-includes', defaultMessage: "doesn't include"})}
            )
            break
        case 'person':
        case 'multiPerson':
        case 'createdBy':
        case 'updatedBy':
            operators.push(
                {value: 'in', label: intl.formatMessage({id: 'Filter.includes', defaultMessage: 'includes'})},
                {value: 'not in', label: intl.formatMessage({id: 'Filter.not-includes', defaultMessage: "doesn't include"})}
            )
            break
        case 'number':
            operators.push(
                {value: '>', label: '>'},
                {value: '<', label: '<'},
                {value: '>=', label: '>='},
                {value: '<=', label: '<='}
            )
            break
        case 'date':
        case 'createdTime':
        case 'updatedTime':
            operators.push(
                {value: '>', label: intl.formatMessage({id: 'Filter.isafter', defaultMessage: 'is after'})},
                {value: '<', label: intl.formatMessage({id: 'Filter.isbefore', defaultMessage: 'is before'})},
                {value: '>=', label: '>='},
                {value: '<=', label: '<='}
            )
            break
        case 'text':
        case 'url':
        case 'email':
        case 'phone':
            operators.push(
                {value: 'equal', label: intl.formatMessage({id: 'Filter.is', defaultMessage: 'is'})},
                {value: 'contains', label: intl.formatMessage({id: 'Filter.contains', defaultMessage: 'contains'})},
                {value: 'not contains', label: intl.formatMessage({id: 'Filter.not-contains', defaultMessage: "doesn't contain"})}
            )
            break
        case 'checkbox':
            operators.push(
                {value: 'checked', label: intl.formatMessage({id: 'QuickActionCondition.checked', defaultMessage: 'checked'})},
                {value: 'not checked', label: intl.formatMessage({id: 'QuickActionCondition.not-checked', defaultMessage: 'not checked'})}
            )
            break
        }

        return operators
    }, [propertyTemplate, intl])

    const handlePropertyChange = useCallback((propertyId: string) => {
        props.onChange({
            ...condition,
            propertyId,
            operator: 'in',
            values: [],
        })
    }, [condition, props])

    const handleOperatorChange = useCallback((operator: QuickActionConditionOperator) => {
        props.onChange({
            ...condition,
            operator,
            values: [],
        })
    }, [condition, props])

    const handleValuesChange = useCallback((values: string[]) => {
        props.onChange({
            ...condition,
            values,
        })
    }, [condition, props])

    // Determine if we should show value input
    const showValueInput = useMemo(() => {
        if (!propertyTemplate) {
            return false
        }
        // Don't show for empty/not empty
        if (condition.operator === 'empty' || condition.operator === 'not empty') {
            return false
        }
        // Don't show for checkbox operators
        if (condition.operator === 'checked' || condition.operator === 'not checked') {
            return false
        }
        return true
    }, [propertyTemplate, condition.operator])

    return (
        <div className='QuickActionConditionRow'>
            <Button
                onClick={props.onRemove}
                className='QuickActionConditionRow__remove-btn'
            >
                {'[-]'}
            </Button>

            <MenuWrapper>
                <Button className='QuickActionConditionRow__property-select'>
                    {propertyTemplate ? propertyTemplate.name : intl.formatMessage({
                        id: 'QuickActionConditionRow.select-property',
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

            {propertyTemplate && (
                <MenuWrapper>
                    <Button className='QuickActionConditionRow__operator-select'>
                        {OctoUtils.filterConditionDisplayString(condition.operator, intl, propertyType?.filterValueType || 'text')}
                    </Button>
                    <Menu>
                        {availableOperators.map((op) => (
                            <Menu.Text
                                key={op.value}
                                id={op.value}
                                name={op.label}
                                onClick={() => handleOperatorChange(op.value)}
                            />
                        ))}
                    </Menu>
                </MenuWrapper>
            )}

            {showValueInput && propertyTemplate && (
                <QuickActionConditionValueInput
                    propertyTemplate={propertyTemplate}
                    condition={condition}
                    onChange={handleValuesChange}
                />
            )}
        </div>
    )
}

// Component for handling value input based on property type
type ValueInputProps = {
    propertyTemplate: IPropertyTemplate
    condition: QuickActionCondition
    onChange: (values: string[]) => void
}

const QuickActionConditionValueInput = (props: ValueInputProps): JSX.Element | null => {
    const {propertyTemplate, condition} = props
    const intl = useIntl()
    const values = condition.values || []

    const handleChange = useCallback((newValue: string) => {
        props.onChange([newValue])
    }, [props])

    // For text-based types, show a text input
    if (['text', 'url', 'email', 'phone'].includes(propertyTemplate.type)) {
        return (
            <Editable
                value={values[0] || ''}
                placeholderText={intl.formatMessage({
                    id: 'QuickActionConditionRow.value-placeholder',
                    defaultMessage: 'Value',
                })}
                onChange={(v) => handleChange(v)}
                onSave={() => handleChange(values[0] || '')}
                saveOnEsc={true}
            />
        )
    }

    // For number types, show a text input (could add number validation)
    if (propertyTemplate.type === 'number') {
        return (
            <Editable
                value={values[0] || ''}
                placeholderText={intl.formatMessage({
                    id: 'QuickActionConditionRow.number-placeholder',
                    defaultMessage: 'Number',
                })}
                onChange={(v) => handleChange(v)}
                onSave={() => handleChange(values[0] || '')}
                saveOnEsc={true}
            />
        )
    }

    // For date types, show a text input that accepts timestamp or {now}
    if (['date', 'createdTime', 'updatedTime'].includes(propertyTemplate.type)) {
        return (
            <Editable
                value={values[0] || ''}
                placeholderText={'{now}'}
                onChange={(v) => handleChange(v)}
                onSave={() => handleChange(values[0] || '')}
                saveOnEsc={true}
            />
        )
    }

    // For select/multiSelect, show option picker
    if (['select', 'multiSelect'].includes(propertyTemplate.type)) {
        const displayValue = values.length > 0
            ? values.map((id) => {
                const option = propertyTemplate.options.find((o) => o.id === id)
                return option?.value || id
            }).join(', ')
            : intl.formatMessage({id: 'QuickActionConditionRow.select-value', defaultMessage: '(select)'})

        return (
            <MenuWrapper>
                <Button>{displayValue}</Button>
                <Menu>
                    {propertyTemplate.options.map((option) => (
                        <Menu.Switch
                            key={option.id}
                            id={option.id}
                            name={option.value}
                            isOn={values.includes(option.id)}
                            onClick={(optionId) => {
                                if (values.includes(optionId)) {
                                    props.onChange(values.filter((v) => v !== optionId))
                                } else {
                                    props.onChange([...values, optionId])
                                }
                            }}
                        />
                    ))}
                </Menu>
            </MenuWrapper>
        )
    }

    // For person types, show {current_user} hint
    if (['person', 'multiPerson', 'createdBy', 'updatedBy'].includes(propertyTemplate.type)) {
        return (
            <Editable
                value={values[0] || ''}
                placeholderText={'{current_user}'}
                onChange={(v) => handleChange(v)}
                onSave={() => handleChange(values[0] || '')}
                saveOnEsc={true}
            />
        )
    }

    return null
}

export default QuickActionConditionRow
