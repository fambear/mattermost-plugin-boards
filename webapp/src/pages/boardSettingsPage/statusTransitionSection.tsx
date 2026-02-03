// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect, useCallback, useRef} from 'react'
import {FormattedMessage} from 'react-intl'

import {Board, IPropertyOption} from '../../blocks/board'
import octoClient from '../../octoClient'
import {Utils} from '../../utils'

import './statusTransitionSection.scss'

type Props = {
    board: Board
}

type TransitionMatrix = {
    [fromStatusId: string]: {
        [toStatusId: string]: boolean
    }
}

type StatusTransitionRule = {
    id: string
    boardId: string
    fromStatus: string
    toStatus: string
    allowed: boolean
    createAt: number
    updateAt: number
}

const StatusTransitionSection = (props: Props): JSX.Element => {
    const {board} = props

    const [statuses, setStatuses] = useState<IPropertyOption[]>([])
    const [transitionMatrix, setTransitionMatrix] = useState<TransitionMatrix>({})
    const [loading, setLoading] = useState(true)
    const [rulesLoadError, setRulesLoadError] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const matrixRef = useRef<TransitionMatrix>({})
    const mountedRef = useRef(true)
    const requestIdRef = useRef(0)

    // Keep matrixRef in sync with state
    useEffect(() => {
        matrixRef.current = transitionMatrix
    }, [transitionMatrix])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current)
            }
        }
    }, [])

    // Reload when board ID or card properties change
    useEffect(() => {
        loadStatusTransitionRules()
    }, [board.id, board.cardProperties])

    const loadStatusTransitionRules = useCallback(async () => {
        const thisRequestId = ++requestIdRef.current

        try {
            setLoading(true)
            setRulesLoadError(false)
            setSaveError('')

            const statusProperty = board.cardProperties.find(
                prop => prop.type === 'select' && prop.name.toLowerCase() === 'status'
            )
            const statusOptions = statusProperty?.options || []

            if (!mountedRef.current || thisRequestId !== requestIdRef.current) {
                return
            }

            setStatuses(statusOptions)

            if (statusOptions.length > 0) {
                const matrix = initializeTransitionMatrix(statusOptions)

                try {
                    const rules = await octoClient.getStatusTransitionRules(board.id)

                    // Guard against stale responses after board switch or unmount
                    if (!mountedRef.current || thisRequestId !== requestIdRef.current) {
                        return
                    }

                    rules.forEach(rule => {
                        if (matrix[rule.fromStatus] && matrix[rule.fromStatus][rule.toStatus] !== undefined) {
                            matrix[rule.fromStatus][rule.toStatus] = rule.allowed
                        }
                    })
                } catch (err) {
                    Utils.logError('Failed to load status transition rules for board ' + board.id + ': ' + err)
                    if (mountedRef.current && thisRequestId === requestIdRef.current) {
                        setRulesLoadError(true)
                    }
                }

                if (mountedRef.current && thisRequestId === requestIdRef.current) {
                    setTransitionMatrix(matrix)
                }
            }
        } catch (err) {
            Utils.logError('Failed to load status transition rules: ' + err)
            if (mountedRef.current && thisRequestId === requestIdRef.current) {
                setRulesLoadError(true)
            }
        } finally {
            if (mountedRef.current && thisRequestId === requestIdRef.current) {
                setLoading(false)
            }
        }
    }, [board.id, board.cardProperties])

    const initializeTransitionMatrix = useCallback((statusOptions: IPropertyOption[]): TransitionMatrix => {
        const matrix: TransitionMatrix = {}
        statusOptions.forEach(fromStatus => {
            matrix[fromStatus.id] = {}
            statusOptions.forEach(toStatus => {
                matrix[fromStatus.id][toStatus.id] = true
            })
        })
        return matrix
    }, [])

    const doSave = useCallback(async () => {
        const currentMatrix = matrixRef.current
        try {
            setSaving(true)
            setSaveError('')

            const rules: StatusTransitionRule[] = []
            Object.keys(currentMatrix).forEach(fromStatusId => {
                Object.keys(currentMatrix[fromStatusId]).forEach(toStatusId => {
                    rules.push({
                        id: '',
                        boardId: board.id,
                        fromStatus: fromStatusId,
                        toStatus: toStatusId,
                        allowed: currentMatrix[fromStatusId][toStatusId],
                        createAt: 0,
                        updateAt: 0
                    })
                })
            })

            const response = await octoClient.saveStatusTransitionRules(board.id, rules)
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error')
                throw new Error(response.status + ': ' + errorText)
            }
        } catch (err) {
            if (mountedRef.current) {
                setSaveError('Failed to save status transition rules: ' + err)
            }
            Utils.logError('Failed to save status transition rules: ' + err)
        } finally {
            if (mountedRef.current) {
                setSaving(false)
            }
        }
    }, [board.id])

    const handleMatrixChange = useCallback((fromStatusId: string, toStatusId: string, allowed: boolean) => {
        setTransitionMatrix(prev => ({
            ...prev,
            [fromStatusId]: {
                ...prev[fromStatusId],
                [toStatusId]: allowed
            }
        }))

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current)
        }

        saveTimerRef.current = setTimeout(() => {
            doSave()
        }, 500)
    }, [doSave])

    if (loading) {
        return (
            <div className='StatusTransitionSection'>
                <p className='StatusTransitionSection__help-text'>
                    <FormattedMessage
                        id='BoardSettings.status-transition-loading'
                        defaultMessage='Loading status transition rules...'
                    />
                </p>
            </div>
        )
    }

    if (statuses.length === 0) {
        return (
            <div className='StatusTransitionSection'>
                <p className='StatusTransitionSection__help-text StatusTransitionSection__help-text--muted'>
                    <FormattedMessage
                        id='BoardSettings.status-transition-no-status'
                        defaultMessage='This board has no Status property or no status options defined.'
                    />
                </p>
            </div>
        )
    }

    return (
        <div className='StatusTransitionSection'>
            <p className='StatusTransitionSection__help-text'>
                <FormattedMessage
                    id='BoardSettings.status-transition-help'
                    defaultMessage='Configure which status transitions are allowed for cards on this board. Uncheck a box to prevent transitioning from the row status to the column status.'
                />
            </p>

            {rulesLoadError && (
                <div className='StatusTransitionSection__warning'>
                    <FormattedMessage
                        id='BoardSettings.status-transition-load-error'
                        defaultMessage='⚠️ Failed to load existing rules. Editing is disabled to prevent accidental overwrites. Please refresh the page to try again.'
                    />
                </div>
            )}

            {saveError && (
                <div className='StatusTransitionSection__error'>
                    {saveError}
                </div>
            )}

            <div className='StatusTransitionSection__matrix-wrapper'>
                <table className='StatusTransitionSection__matrix'>
                    <thead>
                        <tr>
                            <th className='StatusTransitionSection__corner'>
                                <FormattedMessage
                                    id='BoardSettings.status-transition-corner'
                                    defaultMessage='From ↓ \ To →'
                                />
                            </th>
                            {statuses.map(toStatus => (
                                <th key={toStatus.id} className='StatusTransitionSection__header-cell'>
                                    <div className={'StatusTransitionSection__status-badge propColor' + toStatus.color}>
                                        {toStatus.value}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {statuses.map(fromStatus => (
                            <tr key={fromStatus.id}>
                                <td className='StatusTransitionSection__row-header'>
                                    <div className={'StatusTransitionSection__status-badge propColor' + fromStatus.color}>
                                        {fromStatus.value}
                                    </div>
                                </td>
                                {statuses.map(toStatus => (
                                    <td key={toStatus.id} className='StatusTransitionSection__cell'>
                                        <input
                                            type='checkbox'
                                            checked={transitionMatrix[fromStatus.id]?.[toStatus.id] ?? true}
                                            onChange={(e) => handleMatrixChange(
                                                fromStatus.id,
                                                toStatus.id,
                                                e.target.checked
                                            )}
                                            disabled={rulesLoadError}
                                            aria-label={'Allow transition from ' + fromStatus.value + ' to ' + toStatus.value}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {saving && (
                <div className='StatusTransitionSection__saving-indicator'>
                    <FormattedMessage
                        id='BoardSettings.status-transition-saving'
                        defaultMessage='Saving...'
                    />
                </div>
            )}
        </div>
    )
}

export default React.memo(StatusTransitionSection)
