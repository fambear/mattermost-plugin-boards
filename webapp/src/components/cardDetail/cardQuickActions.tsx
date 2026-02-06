// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {FormattedMessage} from 'react-intl'

import {Card} from '../../blocks/card'
import {Board} from '../../blocks/board'
import {QuickAction} from '../../blocks/quickAction'
import {useAppSelector} from '../../store/hooks'
import {getMe} from '../../store/users'
import {evaluateConditions} from '../../utils/quickActionEvaluator'

import QuickActionButton from './quickActionButton'

import './cardQuickActions.scss'

type Props = {
    board: Board
    card: Card
    readonly: boolean
}

const CardQuickActions = (props: Props): JSX.Element | null => {
    const {board, card, readonly} = props
    const me = useAppSelector(getMe)

    if (readonly || !me) {
        return null
    }

    const quickActions = ((board.properties?.quickActions) as QuickAction[] | undefined) || []
    const currentUserId = me.id

    // Filter actions whose conditions match current card state
    const visibleActions = quickActions.filter((action) =>
        evaluateConditions(action.conditions, card, board, currentUserId)
    )

    if (visibleActions.length === 0) {
        return null
    }

    return (
        <div className='CardQuickActions'>
            <div className='CardQuickActions__title'>
                <FormattedMessage
                    id='CardQuickActions.title'
                    defaultMessage='Quick Actions'
                />
            </div>
            <div className='CardQuickActions__buttons'>
                {visibleActions.map((action) => (
                    <QuickActionButton
                        key={action.id}
                        action={action}
                        board={board}
                        card={card}
                    />
                ))}
            </div>
        </div>
    )
}

export default CardQuickActions
