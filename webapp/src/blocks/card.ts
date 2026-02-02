// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import {Block, createBlock} from './block'

type GitHubBranchField = {
    ref: string       // e.g. 'refs/heads/fb-123/my-feature'
    url: string       // GitHub API URL
    repo: string      // e.g. 'owner/repo-name'
    connectedAt?: string // ISO timestamp
    createdAt?: string   // ISO timestamp (legacy)
}

type CardFields = {
    icon?: string
    isTemplate?: boolean
    properties: Record<string, string | string[]>
    contentOrder: Array<string | string[]>
    githubBranch?: GitHubBranchField
    githubBranches?: GitHubBranchField[]
}

type Card = Block & {
    fields: CardFields
}

function createCard(block?: Block): Card {
    const contentOrder: Array<string|string[]> = []
    const contentIds = block?.fields?.contentOrder?.filter((id: any) => id !== null)

    if (contentIds?.length > 0) {
        for (const contentId of contentIds) {
            if (typeof contentId === 'string') {
                contentOrder.push(contentId)
            } else {
                contentOrder.push(contentId.slice())
            }
        }
    }
    return {
        ...createBlock(block),
        type: 'card',
        fields: {
            icon: block?.fields.icon || '',
            properties: {...(block?.fields.properties || {})},
            contentOrder,
            isTemplate: block?.fields.isTemplate || false,
            githubBranch: block?.fields.githubBranch || undefined,
            githubBranches: block?.fields.githubBranches || undefined,
        },
    }
}

export type {GitHubBranchField}
export {Card, createCard}
