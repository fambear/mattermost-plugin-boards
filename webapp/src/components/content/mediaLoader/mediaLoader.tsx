// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {useIntl} from 'react-intl'

import CompassIcon from '../../../widgets/icons/compassIcon'

import './mediaLoader.scss'

type Props = {
    isLoading: boolean
    error?: string | null
    onRetry?: () => void
    children: React.ReactNode
    className?: string
}

const MediaLoader = (props: Props): JSX.Element => {
    const intl = useIntl()
    const {isLoading, error, onRetry, children, className} = props

    return (
        <div className={`MediaLoader${className ? ` ${className}` : ''}`}>
            {isLoading && (
                <div className='MediaLoader__loading'>
                    <div className='MediaLoader__spinner'/>
                    <span className='MediaLoader__loading-text'>
                        {intl.formatMessage({
                            id: 'MediaLoader.loading',
                            defaultMessage: 'Loading...',
                        })}
                    </span>
                </div>
            )}
            {error && !isLoading && (
                <div className='MediaLoader__error'>
                    <CompassIcon
                        icon='alert-outline'
                        className='MediaLoader__error-icon'
                    />
                    <span className='MediaLoader__error-text'>{error}</span>
                    {onRetry && (
                        <button
                            className='MediaLoader__retry-button'
                            onClick={onRetry}
                            type='button'
                        >
                            <CompassIcon icon='refresh'/>
                            {intl.formatMessage({
                                id: 'MediaLoader.retry',
                                defaultMessage: 'Retry',
                            })}
                        </button>
                    )}
                </div>
            )}
            {!isLoading && !error && children}
        </div>
    )
}

export default MediaLoader
