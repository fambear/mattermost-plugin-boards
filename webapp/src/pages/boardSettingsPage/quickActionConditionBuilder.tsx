// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Board} from '../../blocks/board'
import {QuickActionCondition} from '../../blocks/quickAction'
import Button from '../../widgets/buttons/button'

import QuickActionConditionRow from './quickActionConditionRow'

import './quickActionConditionBuilder.scss'

type Props = {
    board: Board
    conditions: QuickActionCondition[]
    onChange: (conditions: QuickActionCondition[]) => void
}

const QuickActionConditionBuilder = (props: Props): JSX.Element => {
    const {board, conditions} = props
    const intl = useIntl()

    const handleAdd = useCallback(() => {
        const newCondition: QuickActionCondition = {
            propertyId: '',
            operator: 'in',
            values: [],
        }
        props.onChange([...conditions, newCondition])
    }, [conditions, props])

    const handleUpdate = useCallback((index: number, updatedCondition: QuickActionCondition) => {
        const newConditions = [...conditions]
        newConditions[index] = updatedCondition
        props.onChange(newConditions)
    }, [conditions, props])

    const handleRemove = useCallback((index: number) => {
        const newConditions = conditions.filter((_, i) => i !== index)
        props.onChange(newConditions)
    }, [conditions, props])

    if (conditions.length === 0) {
        return (
            <div className='QuickActionConditionBuilder'>
                <p className='QuickActionConditionBuilder__empty'>
                    <FormattedMessage
                        id='QuickActionConditionBuilder.empty'
                        defaultMessage='No conditions. This action will always be visible.'
                    />
                </p>
                <Button onClick={handleAdd}>
                    <FormattedMessage
                        id='QuickActionConditionBuilder.add-condition'
                        defaultMessage='+ Add Condition'
                    />
                </Button>
            </div>
        )
    }

    return (
        <div className='QuickActionConditionBuilder'>
            {conditions.map((condition, index) => (
                <QuickActionConditionRow
                    key={index}
                    condition={condition}
                    board={board}
                    isFirstRow={index === 0}
                    onChange={(updated) => handleUpdate(index, updated)}
                    onRemove={() => handleRemove(index)}
                />
            ))}
            <Button onClick={handleAdd}>
                <FormattedMessage
                    id='QuickActionConditionBuilder.add-condition'
                    defaultMessage='+ Add Condition'
                />
            </Button>
        </div>
    )
}

export default QuickActionConditionBuilder
