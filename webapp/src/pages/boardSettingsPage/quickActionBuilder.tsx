// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react'
import {FormattedMessage} from 'react-intl'

import {Board} from '../../blocks/board'
import {QuickActionAction} from '../../blocks/quickAction'
import Button from '../../widgets/buttons/button'

import QuickActionRow from './quickActionRow'

import './quickActionBuilder.scss'

type Props = {
    board: Board
    actions: QuickActionAction[]
    onChange: (actions: QuickActionAction[]) => void
}

const QuickActionBuilder = (props: Props): JSX.Element => {
    const {board, actions} = props

    const handleAdd = useCallback(() => {
        const newAction: QuickActionAction = {
            type: 'setProperty',
            propertyId: '',
            value: '',
        }
        props.onChange([...actions, newAction])
    }, [actions, props])

    const handleUpdate = useCallback((index: number, updatedAction: QuickActionAction) => {
        const newActions = [...actions]
        newActions[index] = updatedAction
        props.onChange(newActions)
    }, [actions, props])

    const handleRemove = useCallback((index: number) => {
        if (actions.length <= 1) {
            return // Don't allow removing the last action
        }
        const newActions = actions.filter((_, i) => i !== index)
        props.onChange(newActions)
    }, [actions, props])

    if (actions.length === 0) {
        return (
            <div className='QuickActionBuilder'>
                <p className='QuickActionBuilder__empty'>
                    <FormattedMessage
                        id='QuickActionBuilder.empty'
                        defaultMessage='Add at least one action.'
                    />
                </p>
                <Button onClick={handleAdd}>
                    <FormattedMessage
                        id='QuickActionBuilder.add-action'
                        defaultMessage='+ Add Action'
                    />
                </Button>
            </div>
        )
    }

    return (
        <div className='QuickActionBuilder'>
            {actions.map((action, index) => (
                <QuickActionRow
                    key={index}
                    action={action}
                    board={board}
                    onChange={(updated) => handleUpdate(index, updated)}
                    onRemove={() => handleRemove(index)}
                    showRemove={actions.length > 1}
                />
            ))}
            <Button onClick={handleAdd}>
                <FormattedMessage
                    id='QuickActionBuilder.add-action'
                    defaultMessage='+ Add Action'
                />
            </Button>
        </div>
    )
}

export default QuickActionBuilder
