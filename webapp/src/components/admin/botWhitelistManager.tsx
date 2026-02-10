// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect, useMemo} from 'react'
import Select, {MultiValue, components, OptionProps, MultiValueGenericProps} from 'react-select'

import octoClient from '../../octoClient'
import {IUser} from '../../user'

import './botWhitelistManager.scss'

type Props = {
    id: string
    label: string
    helpText?: string
    value: string[]
    disabled: boolean
    config: any
    license: any
    setByEnv: boolean
    onChange: (id: string, value: string[]) => void
    setSaveNeeded: () => void
    registerSaveAction: (action: () => Promise<void>) => void
    unRegisterSaveAction: (action: () => Promise<void>) => void
}

interface BotOption {
    value: string
    label: string
    user: IUser
}

// Get avatar URL for a user
const getAvatarUrl = (userId: string): string => {
    // Use Mattermost API to get user avatar
    const siteUrl = (window as any).mm_config?.SiteURL || window.location.origin
    return `${siteUrl}/api/v4/users/${userId}/image?_=0`
}

// Custom option component with avatar
const BotOption = (props: OptionProps<BotOption, true>) => {
    const {data} = props
    return (
        <components.Option {...props}>
            <div className='BotWhitelistManager__option'>
                <img
                    src={getAvatarUrl(data.user.id)}
                    alt={data.label}
                    className='BotWhitelistManager__avatar'
                    onError={(e) => {
                        // Fallback to default bot icon on error
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1a1 1 0 110 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 110-2h1v-1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>'
                    }}
                />
                <span className='BotWhitelistManager__option-name'>@{data.label}</span>
            </div>
        </components.Option>
    )
}

// Custom multi-value label with avatar
const BotMultiValueLabel = (props: MultiValueGenericProps<BotOption, true>) => {
    const {data} = props
    return (
        <components.MultiValueLabel {...props}>
            <div className='BotWhitelistManager__selected-bot'>
                <img
                    src={getAvatarUrl(data.user.id)}
                    alt={data.label}
                    className='BotWhitelistManager__avatar BotWhitelistManager__avatar--small'
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23666"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1a1 1 0 110 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 110-2h1v-1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>'
                    }}
                />
                <span>@{data.label}</span>
            </div>
        </components.MultiValueLabel>
    )
}

const BotWhitelistManager = (props: Props) => {
    const [bots, setBots] = useState<IUser[]>([])
    const [selectedBotIDs, setSelectedBotIDs] = useState<string[]>(props.value || [])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        loadBots()
    }, [])

    useEffect(() => {
        setSelectedBotIDs(props.value || [])
    }, [props.value])

    const loadBots = async () => {
        try {
            setLoading(true)
            setError('')
            
            const allUsers = await octoClient.getTeamUsers(false)
            
            if (allUsers.length === 0) {
                setError('Could not load users. This may happen if accessed outside of a team context.')
                setBots([])
                return
            }
            
            const botUsers = allUsers.filter((user: IUser) => user.is_bot)
            setBots(botUsers)
        } catch (err) {
            setError('Failed to load bots. Please try again.')
            console.error('Error loading bots:', err)
        } finally {
            setLoading(false)
        }
    }

    // Convert bots to react-select options
    const botOptions: BotOption[] = useMemo(() => {
        return bots.map(bot => ({
            value: bot.id,
            label: bot.username,
            user: bot,
        }))
    }, [bots])

    // Get currently selected options
    const selectedOptions: BotOption[] = useMemo(() => {
        return botOptions.filter(opt => selectedBotIDs.includes(opt.value))
    }, [botOptions, selectedBotIDs])

    const handleChange = (newValue: MultiValue<BotOption>) => {
        const newSelectedIDs = newValue.map(opt => opt.value)
        setSelectedBotIDs(newSelectedIDs)
        props.onChange(props.id, newSelectedIDs)
        props.setSaveNeeded()
    }

    const handleSelectAll = () => {
        const allBotIDs = bots.map(bot => bot.id)
        setSelectedBotIDs(allBotIDs)
        props.onChange(props.id, allBotIDs)
        props.setSaveNeeded()
    }

    const handleClearAll = () => {
        setSelectedBotIDs([])
        props.onChange(props.id, [])
        props.setSaveNeeded()
    }

    // Custom styles for react-select
    const customStyles = {
        control: (base: any) => ({
            ...base,
            minHeight: '38px',
            borderColor: 'rgba(var(--center-channel-color-rgb), 0.16)',
            '&:hover': {
                borderColor: 'rgba(var(--center-channel-color-rgb), 0.32)',
            },
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isFocused ? 'rgba(var(--button-bg-rgb), 0.08)' : 'transparent',
            color: 'var(--center-channel-color)',
            '&:active': {
                backgroundColor: 'rgba(var(--button-bg-rgb), 0.16)',
            },
        }),
        multiValue: (base: any) => ({
            ...base,
            backgroundColor: 'rgba(var(--button-bg-rgb), 0.08)',
            borderRadius: '12px',
        }),
        multiValueLabel: (base: any) => ({
            ...base,
            color: 'var(--center-channel-color)',
            padding: '2px 4px 2px 8px',
        }),
        multiValueRemove: (base: any) => ({
            ...base,
            color: 'rgba(var(--center-channel-color-rgb), 0.56)',
            '&:hover': {
                backgroundColor: 'rgba(var(--error-text-color-rgb), 0.16)',
                color: 'var(--error-text)',
            },
            borderRadius: '0 12px 12px 0',
        }),
        menu: (base: any) => ({
            ...base,
            zIndex: 100,
        }),
        placeholder: (base: any) => ({
            ...base,
            color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        }),
    }

    return (
        <div className='BotWhitelistManager'>
            <div className='BotWhitelistManager__header'>
                <label className='BotWhitelistManager__label'>{props.label}</label>
                {props.helpText && <p className='BotWhitelistManager__help-text'>{props.helpText}</p>}
            </div>

            {error && (
                <div className='BotWhitelistManager__error'>
                    {error}
                </div>
            )}

            {loading ? (
                <div className='BotWhitelistManager__loading'>Loading bots...</div>
            ) : (
                <div className='BotWhitelistManager__content'>
                    <Select<BotOption, true>
                        isMulti
                        options={botOptions}
                        value={selectedOptions}
                        onChange={handleChange}
                        isDisabled={props.disabled}
                        placeholder='Search and select bots...'
                        noOptionsMessage={() => 'No bots found'}
                        components={{
                            Option: BotOption,
                            MultiValueLabel: BotMultiValueLabel,
                        }}
                        styles={customStyles}
                        classNamePrefix='BotSelect'
                        isClearable={false}
                        closeMenuOnSelect={false}
                        hideSelectedOptions={false}
                    />
                    
                    <div className='BotWhitelistManager__actions'>
                        <button
                            type='button'
                            onClick={handleSelectAll}
                            disabled={props.disabled || bots.length === 0}
                            className='BotWhitelistManager__button BotWhitelistManager__button--secondary'
                        >
                            Select All
                        </button>
                        <button
                            type='button'
                            onClick={handleClearAll}
                            disabled={props.disabled || selectedBotIDs.length === 0}
                            className='BotWhitelistManager__button BotWhitelistManager__button--secondary'
                        >
                            Clear All
                        </button>
                        <span className='BotWhitelistManager__count'>
                            {selectedBotIDs.length} of {bots.length} selected
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default BotWhitelistManager
