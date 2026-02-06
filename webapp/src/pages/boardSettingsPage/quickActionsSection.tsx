// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Board} from '../../blocks/board'
import {QuickAction, createQuickAction} from '../../blocks/quickAction'
import Button from '../../widgets/buttons/button'
import {Utils, IDType} from '../../utils'

import QuickActionEditor from './quickActionEditor'

import './quickActionsSection.scss'

type Props = {
    board: Board
    onBoardChange: (board: Board) => Promise<void> | void
}

const QuickActionsSection = (props: Props): JSX.Element => {
    const {board} = props
    const intl = useIntl()
    const [expandedActionId, setExpandedActionId] = useState<string | null>(null)

    const quickActions = ((board.properties?.quickActions) as QuickAction[] | undefined) || []

    const handleAdd = useCallback(() => {
        const newAction: QuickAction = {
            ...createQuickAction(),
            id: Utils.createGuid(IDType.BlockID),
            name: intl.formatMessage({id: 'QuickActions.new-action', defaultMessage: 'New Action'}),
            style: { color: 'propColorDefault' },
            confirmRequired: false,
            confirmText: '',
            conditions: [],
            actions: [],
        }

        const updatedBoard = {
            ...board,
            properties: {
                ...board.properties,
                quickActions: [...quickActions, newAction],
            },
        }
        props.onBoardChange(updatedBoard)
        setExpandedActionId(newAction.id)
    }, [board, props, intl, quickActions])

    const handleUpdate = useCallback((updatedAction: QuickAction) => {
        const updatedBoard = {
            ...board,
            properties: {
                ...board.properties,
                quickActions: quickActions.map((action) =>
                    action.id === updatedAction.id ? updatedAction : action
                ),
            },
        }
        props.onBoardChange(updatedBoard)
    }, [board, props, quickActions])

    const handleDelete = useCallback((actionId: string) => {
        const updatedBoard = {
            ...board,
            properties: {
                ...board.properties,
                quickActions: quickActions.filter((action) => action.id !== actionId),
            },
        }
        props.onBoardChange(updatedBoard)
        if (expandedActionId === actionId) {
            setExpandedActionId(null)
        }
    }, [board, props, quickActions, expandedActionId])

    return (
        <div className='QuickActionsSection'>
            <div className='QuickActionsSection__list'>
                {quickActions.map((action) => (
                    <QuickActionEditor
                        key={action.id}
                        action={action}
                        board={board}
                        isExpanded={expandedActionId === action.id}
                        onToggleExpand={() => setExpandedActionId(
                            expandedActionId === action.id ? null : action.id
                        )}
                        onUpdate={handleUpdate}
                        onDelete={() => handleDelete(action.id)}
                    />
                ))}
            </div>

            <div className='QuickActionsSection__add'>
                <Button onClick={handleAdd}>
                    <FormattedMessage
                        id='QuickActions.add-action'
                        defaultMessage='+ Add Quick Action'
                    />
                </Button>
            </div>
        </div>
    )
}

export default QuickActionsSection
