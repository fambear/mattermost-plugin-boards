// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ContentBlock} from '../blocks/contentBlock'

export type ContentOrder = Array<string | Array<string | null | undefined> | null | undefined>

export interface ValidateContentOrderResult {
    isValid: boolean
    orphanedIds: string[]
    missingIds: string[]
    validOrder: ContentOrder
}

export function validateContentOrder(contentOrder: ContentOrder | undefined, contents: ContentBlock[]): ValidateContentOrderResult {
    const result: ValidateContentOrderResult = {
        isValid: true,
        orphanedIds: [],
        missingIds: [],
        validOrder: [],
    }

    if (!contentOrder || contentOrder.length === 0) {
        if (contents.length > 0) {
            result.isValid = false
            result.missingIds = contents.map((c) => c.id)
        }
        return result
    }

    const blockIDSet = new Set<string>()
    for (const block of contents) {
        blockIDSet.add(block.id)
    }

    const seenInOrder = new Set<string>()

    for (const item of contentOrder) {
        if (item === null || item === undefined) {
            continue
        }

        if (typeof item === 'string') {
            if (blockIDSet.has(item)) {
                result.validOrder.push(item)
                seenInOrder.add(item)
            } else {
                result.orphanedIds.push(item)
                result.isValid = false
            }
        } else if (Array.isArray(item)) {
            const validGroup: string[] = []
            for (const subItem of item) {
                if (subItem === null || subItem === undefined) {
                    continue
                }
                if (typeof subItem === 'string') {
                    if (blockIDSet.has(subItem)) {
                        validGroup.push(subItem)
                        seenInOrder.add(subItem)
                    } else {
                        result.orphanedIds.push(subItem)
                        result.isValid = false
                    }
                }
            }
            if (validGroup.length > 0) {
                result.validOrder.push(validGroup)
            }
        }
    }

    for (const block of contents) {
        if (!seenInOrder.has(block.id)) {
            result.missingIds.push(block.id)
            result.isValid = false
        }
    }

    return result
}

export function repairContentOrder(contentOrder: ContentOrder | undefined, contents: ContentBlock[]): ContentOrder {
    const validation = validateContentOrder(contentOrder, contents)

    if (validation.isValid) {
        // Ensure we never return undefined - always return a valid ContentOrder
        return contentOrder ?? []
    }

    const repairedOrder: ContentOrder = [...validation.validOrder]

    for (const missingId of validation.missingIds) {
        repairedOrder.push(missingId)
    }

    return repairedOrder.length > 0 ? repairedOrder : []
}
