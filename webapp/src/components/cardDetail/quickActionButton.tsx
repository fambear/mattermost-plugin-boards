// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback} from 'react'
import {FormattedMessage} from 'react-intl'

import {Card} from '../../blocks/card'
import {Board} from '../../blocks/board'
import {QuickAction} from '../../blocks/quickAction'
import octoClient from '../../octoClient'
import {Utils} from '../../utils'
import {ConfirmationDialogBox, ConfirmationDialogBoxProps} from '../confirmationDialogBox'

import './quickActionButton.scss'

type Props = {
    action: QuickAction
    board: Board
    card: Card
}

const QuickActionButton = (props: Props): JSX.Element => {
    const {action, board, card} = props
    const [showConfirm, setShowConfirm] = useState(false)
    const [executing, setExecuting] = useState(false)

    const handleClick = useCallback(() => {
        if (action.confirmRequired) {
            setShowConfirm(true)
        } else {
            executeAction()
        }
    }, [action])

    const executeAction = useCallback(async () => {
        setExecuting(true)
        try {
            await octoClient.executeQuickAction(board.id, card.id, action.id)
            setShowConfirm(false)
        } catch (error) {
            Utils.logError(`Failed to execute quick action: ${error}`)
        } finally {
            setExecuting(false)
        }
    }, [board.id, card.id, action.id])

    const colorClass = action.style.color || 'propColorDefault'

    return (
        <>
            <button
                className={`QuickActionButton ${colorClass}`}
                onClick={handleClick}
                disabled={executing}
            >
                {action.name}
            </button>
            {showConfirm && (
                <ConfirmationDialogBox
                    dialogBox={{
                        heading: action.name,
                        subText: action.confirmText,
                        confirmButtonText: 'OK',
                        onConfirm: executeAction,
                        onClose: () => setShowConfirm(false),
                    }}
                />
            )}
        </>
    )
}

export default QuickActionButton
