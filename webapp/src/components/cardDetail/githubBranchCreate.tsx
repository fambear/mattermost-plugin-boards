// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Card} from '../../blocks/card'
import type {GitHubBranchField} from '../../blocks/card'
import {GitHubRepository, GitHubConnectedResponse, GitHubBranch, GitHubBranchInfo} from '../../github'
import octoClient from '../../octoClient'
import {sendFlashMessage} from '../flashMessages'
import IconButton from '../../widgets/buttons/iconButton'
import CompassIcon from '../../widgets/icons/compassIcon'
import CloseIcon from '../../widgets/icons/close'
import Button from '../../widgets/buttons/button'
import {UserSettings} from '../../userSettings'

import './githubBranchCreate.scss'

type Props = {
    card: Card
    readonly: boolean
    onBranchCreated?: (branch: GitHubBranch | null) => void
}

// Helper: resolve all branches from card fields (supports both legacy single + new multi)
function getCardBranches(card: Card): GitHubBranchField[] {
    const branches: GitHubBranchField[] = []
    if (card.fields.githubBranches && card.fields.githubBranches.length > 0) {
        return [...card.fields.githubBranches]
    }
    // Legacy: single branch
    if (card.fields.githubBranch) {
        branches.push(card.fields.githubBranch)
    }
    return branches
}

// Searchable dropdown component
type SearchableSelectProps = {
    items: {value: string; label: string}[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    loading?: boolean
    loadingText?: string
    id?: string
}

const SearchableSelect = (props: SearchableSelectProps): JSX.Element => {
    const {items, value, onChange, placeholder, loading, loadingText, id} = props
    const [search, setSearch] = useState('')
    const [open, setOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const selectedLabel = items.find((i) => i.value === value)?.label || value

    const filtered = useMemo(() => {
        if (!search) {
            return items
        }
        const q = search.toLowerCase()
        return items.filter((i) => i.label.toLowerCase().includes(q))
    }, [items, search])

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false)
                setSearch('')
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    if (loading) {
        return (
            <div className='SearchableSelect SearchableSelect--loading'>
                {loadingText || 'Loading...'}
            </div>
        )
    }

    return (
        <div
            className='SearchableSelect'
            ref={wrapperRef}
            id={id}
        >
            {!open ? (
                <button
                    type='button'
                    className='SearchableSelect__trigger'
                    onClick={() => setOpen(true)}
                >
                    <span className='SearchableSelect__value'>{selectedLabel || placeholder}</span>
                    <CompassIcon icon='chevron-down'/>
                </button>
            ) : (
                <>
                    <input
                        type='text'
                        className='SearchableSelect__input'
                        placeholder={placeholder || 'Search...'}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                setOpen(false)
                                setSearch('')
                            }
                        }}
                        autoFocus={true}
                    />
                    <div className='SearchableSelect__dropdown'>
                        {filtered.length === 0 ? (
                            <div className='SearchableSelect__empty'>No matches</div>
                        ) : (
                            filtered.map((item) => (
                                <button
                                    key={item.value}
                                    type='button'
                                    className={`SearchableSelect__item ${item.value === value ? 'SearchableSelect__item--selected' : ''}`}
                                    onClick={() => {
                                        onChange(item.value)
                                        setOpen(false)
                                        setSearch('')
                                    }}
                                >
                                    {item.label}
                                </button>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

const GitHubBranchCreate = (props: Props): JSX.Element | null => {
    const {card, readonly, onBranchCreated} = props
    const intl = useIntl()

    const [connectionStatus, setConnectionStatus] = useState<GitHubConnectedResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [repositories, setRepositories] = useState<GitHubRepository[]>([])
    const [loadingRepos, setLoadingRepos] = useState(false)
    const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null)
    const [branchName, setBranchName] = useState('')
    const [creating, setCreating] = useState(false)
    const [connectedBranches, setConnectedBranches] = useState<GitHubBranchField[]>([])
    const [branches, setBranches] = useState<GitHubBranchInfo[]>([])
    const [loadingBranches, setLoadingBranches] = useState(false)
    const [baseBranch, setBaseBranch] = useState<string>('')
    const [showBaseBranchPicker, setShowBaseBranchPicker] = useState(false)
    const [branchSearch, setBranchSearch] = useState('')
    const [showBranchPicker, setShowBranchPicker] = useState(false)
    const [chooseExistingMode, setChooseExistingMode] = useState(false)

    // Generate default branch name from card code
    const getDefaultBranchName = useCallback(() => {
        if (card.code) {
            let slug = card.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .substring(0, 40)
            if (!slug) {
                slug = 'task'
            }
            return `${card.code.toLowerCase()}/${slug}`
        }
        return ''
    }, [card.code, card.title])

    // Check GitHub connection status
    useEffect(() => {
        loadConnectionStatus()
    }, [])

    // Load branches from card fields on mount/card change
    useEffect(() => {
        const saved = getCardBranches(card)
        setConnectedBranches(saved)
        if (saved.length > 0) {
            const first = saved[0]
            const branch: GitHubBranch = {
                ref: first.ref,
                url: first.url,
                object: {sha: '', type: 'commit'},
            }
            onBranchCreated?.(branch)
        }
    }, [card.id, card.fields.githubBranch, card.fields.githubBranches, onBranchCreated])

    // Reset state when card changes
    useEffect(() => {
        setShowForm(false)
        setSelectedRepo(null)
        setBranchName('')
        setBranchSearch('')
    }, [card.id])

    const filteredBranches = useMemo(() => {
        if (!branchSearch) {
            return branches
        }
        const q = branchSearch.toLowerCase()
        return branches.filter((b) => b.name.toLowerCase().includes(q))
    }, [branches, branchSearch])

    const loadConnectionStatus = async () => {
        try {
            setLoading(true)
            const status = await octoClient.getGitHubConnected()
            setConnectionStatus(status || null)
        } catch (error) {
            console.error('Failed to check GitHub connection:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadRepositories = async () => {
        try {
            setLoadingRepos(true)
            const repos = await octoClient.getGitHubRepositories()
            setRepositories(repos)
            if (repos.length > 0 && !selectedRepo) {
                const lastRepoFullName = UserSettings.lastGitHubRepo
                const lastRepo = lastRepoFullName ? repos.find((r) => r.full_name === lastRepoFullName) : null
                setSelectedRepo(lastRepo || repos[0])
            }
        } catch (error) {
            console.error('Failed to load repositories:', error)
            sendFlashMessage({
                content: intl.formatMessage({
                    id: 'GitHubBranchCreate.repoError',
                    defaultMessage: 'Failed to load GitHub repositories',
                }),
                severity: 'low',
            })
        } finally {
            setLoadingRepos(false)
        }
    }

    const loadBranches = async (repo: GitHubRepository) => {
        try {
            setLoadingBranches(true)
            const branchList = await octoClient.getGitHubBranches(repo.owner, repo.name)
            setBranches(branchList)
            setBaseBranch(repo.default_branch || '')
        } catch (error) {
            console.error('Failed to load branches:', error)
            sendFlashMessage({
                content: intl.formatMessage({
                    id: 'GitHubBranchCreate.branchesError',
                    defaultMessage: 'Failed to load branches',
                }),
                severity: 'low',
            })
        } finally {
            setLoadingBranches(false)
        }
    }

    useEffect(() => {
        if (selectedRepo) {
            loadBranches(selectedRepo)
        }
    }, [selectedRepo])

    const handleOpenForm = () => {
        setShowForm(true)
        setBranchName(getDefaultBranchName())
        setBranchSearch('')
        loadRepositories()
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setBranchName('')
        setSelectedRepo(null)
        setBranches([])
        setBaseBranch('')
        setShowBaseBranchPicker(false)
        setShowBranchPicker(false)
        setChooseExistingMode(false)
        setBranchSearch('')
    }

    const isExistingBranch = useCallback(
        (name: string): GitHubBranchInfo | undefined => {
            return branches.find((b) => b.name === name.trim())
        },
        [branches],
    )

    // Save branches to card (always writes both githubBranch + githubBranches for compat)
    const saveBranchesToCard = async (newBranches: GitHubBranchField[]) => {
        const blockPatch: {updatedFields: Record<string, unknown>} = {
            updatedFields: {
                githubBranches: newBranches,
                githubBranch: newBranches.length > 0 ? newBranches[0] : null,
            },
        }
        await octoClient.patchBlock(card.boardId, card.id, blockPatch)
    }

    const connectExistingBranch = async (existingBranch: GitHubBranchInfo) => {
        if (!selectedRepo) {
            return
        }

        try {
            setCreating(true)

            const newRef = `refs/heads/${existingBranch.name}`

            // Prevent duplicate: same repo + same branch
            if (connectedBranches.some((b) => b.repo === selectedRepo.full_name && b.ref === newRef)) {
                sendFlashMessage({
                    content: intl.formatMessage({
                        id: 'GitHubBranchCreate.duplicateBranch',
                        defaultMessage: 'This branch is already connected to the card',
                    }),
                    severity: 'low',
                })
                setCreating(false)
                return
            }

            const newEntry: GitHubBranchField = {
                ref: newRef,
                url: `https://api.github.com/repos/${selectedRepo.owner}/${selectedRepo.name}/git/refs/heads/${existingBranch.name}`,
                repo: selectedRepo.full_name,
                connectedAt: new Date().toISOString(),
            }

            const updated = [...connectedBranches, newEntry]

            try {
                await saveBranchesToCard(updated)
            } catch (saveError) {
                console.error('Failed to save branch to card:', saveError)
                sendFlashMessage({
                    content: intl.formatMessage({
                        id: 'GitHubBranchCreate.connectSaveError',
                        defaultMessage: 'Failed to connect branch to card. Try refreshing.',
                    }),
                    severity: 'low',
                })
                return
            }

            setConnectedBranches(updated)
            if (updated.length === 1) {
                onBranchCreated?.({
                    ref: newEntry.ref,
                    url: newEntry.url,
                    object: {sha: existingBranch.sha, type: 'commit'},
                })
            }
            setShowForm(false)
            setChooseExistingMode(false)

            sendFlashMessage({
                content: intl.formatMessage({
                    id: 'GitHubBranchCreate.connectSuccess',
                    defaultMessage: 'Branch "{branchName}" connected successfully',
                }, {branchName: existingBranch.name}),
                severity: 'high',
            })
        } catch (error) {
            console.error('Failed to connect branch:', error)
            sendFlashMessage({
                content: intl.formatMessage({
                    id: 'GitHubBranchCreate.connectError',
                    defaultMessage: 'Failed to connect branch',
                }),
                severity: 'low',
            })
        } finally {
            setCreating(false)
        }
    }

    const handleCreateOrConnectBranch = async () => {
        if (!selectedRepo || !branchName.trim()) {
            return
        }

        if (chooseExistingMode) {
            const existing = isExistingBranch(branchName)
            if (existing) {
                await connectExistingBranch(existing)
                return
            }
        }

        try {
            setCreating(true)
            const branch = await octoClient.createGitHubBranch({
                owner: selectedRepo.owner,
                repo: selectedRepo.name,
                branch_name: branchName.trim(),
                base_branch: baseBranch || undefined,
            })

            if (branch) {
                const newEntry: GitHubBranchField = {
                    ref: branch.ref,
                    url: branch.url,
                    repo: selectedRepo.full_name,
                    connectedAt: new Date().toISOString(),
                }

                const updated = [...connectedBranches, newEntry]

                try {
                    await saveBranchesToCard(updated)
                } catch (saveError) {
                    console.error('Failed to save branch to card:', saveError)
                    sendFlashMessage({
                        content: intl.formatMessage({
                            id: 'GitHubBranchCreate.saveError',
                            defaultMessage: 'Branch created on GitHub but failed to save to card. Try refreshing.',
                        }),
                        severity: 'low',
                    })
                }

                setConnectedBranches(updated)
                if (updated.length === 1) {
                    onBranchCreated?.(branch)
                }
                setShowForm(false)
                setChooseExistingMode(false)

                sendFlashMessage({
                    content: intl.formatMessage({
                        id: 'GitHubBranchCreate.success',
                        defaultMessage: 'Branch "{branchName}" created successfully',
                    }, {branchName: branchName.trim()}),
                    severity: 'high',
                })
            } else {
                sendFlashMessage({
                    content: intl.formatMessage({
                        id: 'GitHubBranchCreate.error',
                        defaultMessage: 'Failed to create branch',
                    }),
                    severity: 'low',
                })
            }
        } catch (error) {
            console.error('Failed to create branch:', error)
            sendFlashMessage({
                content: intl.formatMessage({
                    id: 'GitHubBranchCreate.error',
                    defaultMessage: 'Failed to create branch',
                }),
                severity: 'low',
            })
        } finally {
            setCreating(false)
        }
    }

    const handleRemoveBranch = async (index: number) => {
        const updated = connectedBranches.filter((_, i) => i !== index)
        try {
            await saveBranchesToCard(updated)
            setConnectedBranches(updated)
            if (updated.length === 0) {
                onBranchCreated?.(null)
            }
        } catch (error) {
            console.error('Failed to remove branch:', error)
            sendFlashMessage({
                content: intl.formatMessage({
                    id: 'GitHubBranchCreate.removeError',
                    defaultMessage: 'Failed to remove branch',
                }),
                severity: 'low',
            })
        }
    }

    // Don't show anything while loading
    if (loading) {
        return null
    }

    // Show connect prompt if not connected to GitHub
    if (!connectionStatus?.connected) {
        return (
            <div className='GitHubBranchCreate'>
                <div className='GitHubBranchCreate__header'>
                    <div className='GitHubBranchCreate__title'>
                        <CompassIcon icon='github-circle'/>
                        <FormattedMessage
                            id='GitHubBranchCreate.title'
                            defaultMessage='GitHub Branch'
                        />
                    </div>
                </div>
                <div className='GitHubBranchCreate__connect-prompt'>
                    <FormattedMessage
                        id='GitHubBranchCreate.connectPrompt'
                        defaultMessage='Run /github connect private in Mattermost to create branches'
                    />
                </div>
            </div>
        )
    }

    const hasBranches = connectedBranches.length > 0

    return (
        <div className='GitHubBranchCreate'>
            <div className='GitHubBranchCreate__header'>
                <div className='GitHubBranchCreate__title'>
                    <CompassIcon icon='github-circle'/>
                    <FormattedMessage
                        id='GitHubBranchCreate.title'
                        defaultMessage='GitHub Branch'
                    />
                </div>
                {/* [+] button to add more branches */}
                {hasBranches && !readonly && !showForm && (
                    <IconButton
                        className='GitHubBranchCreate__add-button'
                        onClick={handleOpenForm}
                        icon={<CompassIcon icon='plus'/>}
                        title={intl.formatMessage({
                            id: 'GitHubBranchCreate.addAnother',
                            defaultMessage: 'Add another branch',
                        })}
                        size='small'
                    />
                )}
            </div>

            {/* Connected Branches Display */}
            {hasBranches && (
                <div className='GitHubBranchCreate__branches-list'>
                    {connectedBranches.map((b, index) => {
                        const branchDisplayName = b.ref.replace('refs/heads/', '')
                        // Build GitHub URL from repo + branch name (avoids URL-encoded chars from API URL)
                        const githubUrl = `https://github.com/${b.repo}/tree/${branchDisplayName}`
                        return (
                            <div
                                key={`${index}-${b.repo}-${b.ref}`}
                                className='GitHubBranchCreate__branch'
                            >
                                <div className='GitHubBranchCreate__branch-header'>
                                    <CompassIcon icon='source-branch'/>
                                    <span className='GitHubBranchCreate__branch-name'>
                                        {branchDisplayName}
                                    </span>
                                    {!readonly && (
                                        <IconButton
                                            className='GitHubBranchCreate__branch-remove'
                                            onClick={() => handleRemoveBranch(index)}
                                            icon={<CloseIcon/>}
                                            title={intl.formatMessage({
                                                id: 'GitHubBranchCreate.removeBranch',
                                                defaultMessage: 'Remove branch',
                                            })}
                                            size='small'
                                        />
                                    )}
                                </div>
                                <div className='GitHubBranchCreate__branch-meta'>
                                    <span className='GitHubBranchCreate__branch-repo'>{b.repo}</span>
                                    <a
                                        href={githubUrl}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='GitHubBranchCreate__branch-link'
                                    >
                                        <FormattedMessage
                                            id='GitHubBranchCreate.viewOnGitHub'
                                            defaultMessage='View on GitHub'
                                        />
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create/Connect Branch Form */}
            {showForm && (
                <div className='GitHubBranchCreate__form'>
                    <div className='GitHubBranchCreate__form-header'>
                        <FormattedMessage
                            id={hasBranches ? 'GitHubBranchCreate.addBranchTitle' : 'GitHubBranchCreate.formTitle'}
                            defaultMessage={hasBranches ? 'Add Branch' : 'Create GitHub Branch'}
                        />
                        <IconButton
                            className='GitHubBranchCreate__form-close'
                            onClick={handleCloseForm}
                            icon={<CloseIcon/>}
                            title={intl.formatMessage({
                                id: 'GitHubBranchCreate.closeForm',
                                defaultMessage: 'Close',
                            })}
                            size='small'
                        />
                    </div>

                    {loadingRepos ? (
                        <div className='GitHubBranchCreate__form-loading'>
                            <FormattedMessage
                                id='GitHubBranchCreate.loadingRepos'
                                defaultMessage='Loading repositories...'
                            />
                        </div>
                    ) : (
                        <>
                            <div className='GitHubBranchCreate__form-field'>
                                <label>
                                    <FormattedMessage
                                        id='GitHubBranchCreate.repository'
                                        defaultMessage='Repository'
                                    />
                                </label>
                                <SearchableSelect
                                    id='repo-select'
                                    items={repositories.map((r) => ({value: r.full_name, label: r.full_name}))}
                                    value={selectedRepo?.full_name || ''}
                                    placeholder={intl.formatMessage({
                                        id: 'GitHubBranchCreate.searchRepos',
                                        defaultMessage: 'Search repositories...',
                                    })}
                                    onChange={(val) => {
                                        const repo = repositories.find((r) => r.full_name === val)
                                        setSelectedRepo(repo || null)
                                        if (repo) {
                                            UserSettings.lastGitHubRepo = repo.full_name
                                        }
                                    }}
                                />
                            </div>

                            <div className='GitHubBranchCreate__form-field'>
                                <div className='GitHubBranchCreate__form-field-header'>
                                    <label htmlFor='branch-name'>
                                        <FormattedMessage
                                            id='GitHubBranchCreate.branchName'
                                            defaultMessage='Branch Name'
                                        />
                                    </label>
                                    {selectedRepo && !loadingBranches && branches.length > 0 && (
                                        <button
                                            type='button'
                                            className='GitHubBranchCreate__choose-existing-link'
                                            onClick={() => {
                                                const newState = !showBranchPicker
                                                setShowBranchPicker(newState)
                                                setBranchSearch('')
                                                if (!newState) {
                                                    setChooseExistingMode(false)
                                                }
                                            }}
                                        >
                                            <FormattedMessage
                                                id={showBranchPicker ? 'GitHubBranchCreate.newBranch' : 'GitHubBranchCreate.chooseExisting'}
                                                defaultMessage={showBranchPicker ? 'new branch' : 'choose existing'}
                                            />
                                        </button>
                                    )}
                                </div>
                                <input
                                    id='branch-name'
                                    type='text'
                                    className='GitHubBranchCreate__form-input'
                                    placeholder={intl.formatMessage({
                                        id: 'GitHubBranchCreate.branchPlaceholder',
                                        defaultMessage: 'e.g., feature/my-branch',
                                    })}
                                    value={branchName}
                                    onChange={(e) => {
                                        setBranchName(e.target.value)
                                        if (chooseExistingMode) {
                                            const exists = branches.some((b) => b.name === e.target.value.trim())
                                            setChooseExistingMode(exists)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !creating) {
                                            handleCreateOrConnectBranch()
                                        } else if (e.key === 'Escape') {
                                            handleCloseForm()
                                        }
                                    }}
                                    autoFocus={true}
                                />
                                {showBranchPicker && selectedRepo && branches.length > 0 && (
                                    <div className='GitHubBranchCreate__branch-picker'>
                                        <div className='GitHubBranchCreate__branch-picker-search'>
                                            <input
                                                type='text'
                                                placeholder={intl.formatMessage({
                                                    id: 'GitHubBranchCreate.searchBranches',
                                                    defaultMessage: 'Search branches...',
                                                })}
                                                value={branchSearch}
                                                onChange={(e) => setBranchSearch(e.target.value)}
                                                className='GitHubBranchCreate__branch-picker-input'
                                                autoFocus={true}
                                            />
                                        </div>
                                        <div className='GitHubBranchCreate__branch-list'>
                                            {filteredBranches.length === 0 ? (
                                                <div className='GitHubBranchCreate__branch-empty'>
                                                    <FormattedMessage
                                                        id='GitHubBranchCreate.noBranchesFound'
                                                        defaultMessage='No branches match'
                                                    />
                                                </div>
                                            ) : (
                                                filteredBranches.map((branch) => (
                                                    <button
                                                        key={branch.name}
                                                        type='button'
                                                        className='GitHubBranchCreate__branch-item'
                                                        onClick={() => {
                                                            setBranchName(branch.name)
                                                            setShowBranchPicker(false)
                                                            setChooseExistingMode(true)
                                                            setBranchSearch('')
                                                        }}
                                                    >
                                                        {branch.name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                                {selectedRepo && !showBaseBranchPicker && !chooseExistingMode && (
                                    <div className='GitHubBranchCreate__form-hint'>
                                        <FormattedMessage
                                            id='GitHubBranchCreate.baseBranchLabel'
                                            defaultMessage='Base: '
                                        />
                                        <button
                                            type='button'
                                            className='GitHubBranchCreate__base-branch-link'
                                            onClick={() => setShowBaseBranchPicker(true)}
                                        >
                                            {baseBranch || selectedRepo.default_branch}
                                        </button>
                                    </div>
                                )}
                                {showBaseBranchPicker && selectedRepo && branches.length > 0 && (
                                    <div className='GitHubBranchCreate__form-hint'>
                                        <label htmlFor='base-branch-select'>
                                            <FormattedMessage
                                                id='GitHubBranchCreate.baseBranchSelect'
                                                defaultMessage='BASE BRANCH'
                                            />
                                        </label>
                                        <SearchableSelect
                                            id='base-branch-select'
                                            items={branches.map((b) => ({value: b.name, label: b.name}))}
                                            value={baseBranch || selectedRepo.default_branch}
                                            placeholder={intl.formatMessage({
                                                id: 'GitHubBranchCreate.searchBaseBranch',
                                                defaultMessage: 'Search base branch...',
                                            })}
                                            onChange={(val) => {
                                                setBaseBranch(val)
                                                setShowBaseBranchPicker(false)
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className='GitHubBranchCreate__form-actions'>
                                <Button
                                    onClick={handleCloseForm}
                                    emphasis='tertiary'
                                >
                                    <FormattedMessage
                                        id='GitHubBranchCreate.cancel'
                                        defaultMessage='Cancel'
                                    />
                                </Button>
                                <Button
                                    onClick={handleCreateOrConnectBranch}
                                    filled={true}
                                    disabled={!selectedRepo || !branchName.trim() || creating}
                                >
                                    {creating ? (
                                        chooseExistingMode && isExistingBranch(branchName) ? (
                                            <FormattedMessage
                                                id='GitHubBranchCreate.connecting'
                                                defaultMessage='Connecting...'
                                            />
                                        ) : (
                                            <FormattedMessage
                                                id='GitHubBranchCreate.creating'
                                                defaultMessage='Creating...'
                                            />
                                        )
                                    ) : (
                                        chooseExistingMode && isExistingBranch(branchName) ? (
                                            <FormattedMessage
                                                id='GitHubBranchCreate.connect'
                                                defaultMessage='Connect Branch'
                                            />
                                        ) : (
                                            <FormattedMessage
                                                id='GitHubBranchCreate.create'
                                                defaultMessage='Create Branch'
                                            />
                                        )
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Initial "Create branch" button when no branches yet */}
            {!hasBranches && !readonly && !showForm && (
                <div className='GitHubBranchCreate__create'>
                    <button
                        type='button'
                        className='GitHubBranchCreate__create-button'
                        onClick={handleOpenForm}
                    >
                        <CompassIcon icon='plus'/>
                        <FormattedMessage
                            id='GitHubBranchCreate.createButton'
                            defaultMessage='Create branch for this card'
                        />
                    </button>
                </div>
            )}

            {!hasBranches && readonly && (
                <div className='GitHubBranchCreate__empty'>
                    <FormattedMessage
                        id='GitHubBranchCreate.noBranch'
                        defaultMessage='No branch created'
                    />
                </div>
            )}
        </div>
    )
}

export default GitHubBranchCreate
