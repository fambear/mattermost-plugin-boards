// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect, useMemo, useRef} from 'react'
import Select, {MultiValue, components, OptionProps, MultiValueGenericProps} from 'react-select'

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
    isUnknown?: boolean  // For bots that exist in saved config but not in current team
}

// Properly URL-encoded fallback SVG for bot avatar
const FALLBACK_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#666">' +
    '<path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1a1 1 0 110 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 110-2h1v-1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>' +
    '</svg>'
)

// Get avatar URL for a user
const getAvatarUrl = (userId: string): string => {
    const siteUrl = (window as any).mm_config?.SiteURL || window.location.origin
    return `${siteUrl}/api/v4/users/${userId}/image?_=0`
}

// Avatar component with safe error handling (prevents infinite loop)
const BotAvatar: React.FC<{userId: string; alt: string; small?: boolean}> = ({userId, alt, small}) => {
    const [useFallback, setUseFallback] = useState(false)
    const errorHandled = useRef(false)

    const handleError = () => {
        if (!errorHandled.current) {
            errorHandled.current = true
            setUseFallback(true)
        }
    }

    return (
        <img
            src={useFallback ? FALLBACK_AVATAR : getAvatarUrl(userId)}
            alt={alt}
            className={`BotWhitelistManager__avatar${small ? ' BotWhitelistManager__avatar--small' : ''}`}
            onError={handleError}
        />
    )
}

// Custom option component with avatar
const BotOption = (props: OptionProps<BotOption, true>) => {
    const {data} = props
    return (
        <components.Option {...props}>
            <div className={`BotWhitelistManager__option${data.isUnknown ? ' BotWhitelistManager__option--unknown' : ''}`}>
                <BotAvatar userId={data.user.id} alt={data.label} />
                <span className='BotWhitelistManager__option-name'>
                    @{data.label}
                    {data.isUnknown && <span className='BotWhitelistManager__unknown-badge'>(unavailable)</span>}
                </span>
            </div>
        </components.Option>
    )
}

// Custom multi-value label with avatar
const BotMultiValueLabel = (props: MultiValueGenericProps<BotOption, true>) => {
    const {data} = props
    return (
        <components.MultiValueLabel {...props}>
            <div className={`BotWhitelistManager__selected-bot${data.isUnknown ? ' BotWhitelistManager__selected-bot--unknown' : ''}`}>
                <BotAvatar userId={data.user.id} alt={data.label} small />
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
    
    // Track IDs that were in saved config but not found in current bot list
    const [unknownBotIDs, setUnknownBotIDs] = useState<string[]>([])

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
            
            // Use Mattermost API directly to get ALL bots in the system
            // (Boards API only returns users who have interacted with Boards)
            const siteUrl = (window as any).mm_config?.SiteURL || window.location.origin
            const response = await fetch(`${siteUrl}/api/v4/users?per_page=200`, {
                credentials: 'include',
            })
            
            if (!response.ok) {
                setError('Could not load users. Please check your permissions.')
                setBots([])
                return
            }
            
            const allUsers = await response.json()
            
            if (!Array.isArray(allUsers) || allUsers.length === 0) {
                setError('Could not load users.')
                setBots([])
                return
            }
            
            // Filter to only bots and map to IUser format
            const botUsers: IUser[] = allUsers
                .filter((user: any) => user.is_bot === true)
                .map((user: any) => ({
                    id: user.id,
                    username: user.username,
                    is_bot: true,
                } as IUser))
            
            setBots(botUsers)
            
            // Identify any saved bot IDs that are not in the current bot list
            const currentBotIDs = new Set(botUsers.map((b: IUser) => b.id))
            const savedIDs = props.value || []
            const unknown = savedIDs.filter(id => !currentBotIDs.has(id))
            setUnknownBotIDs(unknown)
        } catch (err) {
            setError('Failed to load bots. Please try again.')
            console.error('Error loading bots:', err)
        } finally {
            setLoading(false)
        }
    }

    // Convert bots to react-select options, including unknown bots
    const botOptions: BotOption[] = useMemo(() => {
        const knownOptions = bots.map(bot => ({
            value: bot.id,
            label: bot.username,
            user: bot,
            isUnknown: false,
        }))
        
        // Add placeholder options for unknown bot IDs (preserved from saved config)
        const unknownOptions = unknownBotIDs.map(id => ({
            value: id,
            label: id.substring(0, 8) + '...',  // Show truncated ID as label
            user: {id, username: id.substring(0, 8) + '...', is_bot: true} as IUser,
            isUnknown: true,
        }))
        
        return [...knownOptions, ...unknownOptions]
    }, [bots, unknownBotIDs])

    // Get currently selected options
    const selectedOptions: BotOption[] = useMemo(() => {
        return botOptions.filter(opt => selectedBotIDs.includes(opt.value))
    }, [botOptions, selectedBotIDs])

    const handleChange = (newValue: MultiValue<BotOption>) => {
        const selectedFromDropdown = newValue.map(opt => opt.value)
        
        // Preserve unknown IDs that are still selected (not explicitly removed)
        // This prevents silent data loss for bots that exist in config but not in current context
        const preservedUnknownIDs = unknownBotIDs.filter(id => 
            selectedBotIDs.includes(id) && !newValue.some(opt => opt.value === id && !opt.isUnknown)
        )
        
        // If user explicitly removed an unknown bot, don't preserve it
        const explicitlyRemovedUnknown = unknownBotIDs.filter(id => 
            selectedBotIDs.includes(id) && !selectedFromDropdown.includes(id)
        )
        
        const finalUnknownIDs = preservedUnknownIDs.filter(id => !explicitlyRemovedUnknown.includes(id))
        
        // Combine: selected known bots + remaining unknown bots (unless explicitly removed)
        const knownSelectedIDs = selectedFromDropdown.filter(id => !unknownBotIDs.includes(id))
        const newSelectedIDs = [...knownSelectedIDs, ...finalUnknownIDs.filter(id => selectedFromDropdown.includes(id))]
        
        setSelectedBotIDs(newSelectedIDs)
        props.onChange(props.id, newSelectedIDs)
        props.setSaveNeeded()
    }

    const handleSelectAll = () => {
        // Select all known bots + preserve selected unknown bots
        const allKnownBotIDs = bots.map(bot => bot.id)
        const selectedUnknownIDs = unknownBotIDs.filter(id => selectedBotIDs.includes(id))
        const allBotIDs = [...allKnownBotIDs, ...selectedUnknownIDs]
        
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
                    
                    {unknownBotIDs.length > 0 && selectedBotIDs.some(id => unknownBotIDs.includes(id)) && (
                        <div className='BotWhitelistManager__warning'>
                            ⚠️ Some selected bots are not available in the current context. They will be preserved until explicitly removed.
                        </div>
                    )}
                    
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
