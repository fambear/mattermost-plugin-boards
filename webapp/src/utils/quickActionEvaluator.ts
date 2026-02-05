// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Card} from '../blocks/card'
import {Board, IPropertyTemplate} from '../blocks/board'
import {QuickActionCondition} from '../blocks/quickAction'

const SpecialValueCurrentUser = '{current_user}'
const SpecialValueNow = '{now}'

export function evaluateConditions(
    conditions: QuickActionCondition[],
    card: Card,
    board: Board,
    currentUserId: string
): boolean {
    // ALL conditions must be true (AND logic)
    return conditions.every((condition) => {
        const propertyTemplate = board.cardProperties.find(p => p.id === condition.propertyId)
        if (!propertyTemplate) {
            // If property doesn't exist, treat as non-matching
            return false
        }

        return evaluateCondition(condition, card, board, propertyTemplate, currentUserId)
    })
}

function evaluateCondition(
    condition: QuickActionCondition,
    card: Card,
    board: Board,
    propertyTemplate: IPropertyTemplate,
    currentUserId: string
): boolean {
    const cardValue = card.fields.properties[condition.propertyId]
    const resolvedValues = resolveSpecialValues(condition.values || [], currentUserId)

    switch (condition.operator) {
    case 'in':
        return isIn(cardValue, resolvedValues)
    case 'not in':
        return !isIn(cardValue, resolvedValues)
    case 'empty':
        return isEmpty(cardValue)
    case 'not empty':
        return !isEmpty(cardValue)
    case '>':
        return compareNumbers(cardValue, resolvedValues[0], '>')
    case '<':
        return compareNumbers(cardValue, resolvedValues[0], '<')
    case '>=':
        return compareNumbers(cardValue, resolvedValues[0], '>=')
    case '<=':
        return compareNumbers(cardValue, resolvedValues[0], '<=')
    case 'equal':
        return isEqual(cardValue, resolvedValues[0])
    case 'contains':
        return contains(cardValue, resolvedValues[0])
    case 'not contains':
        return !contains(cardValue, resolvedValues[0])
    case 'checked':
        return isChecked(cardValue)
    case 'not checked':
        return !isChecked(cardValue)
    default:
        return false
    }
}

function resolveSpecialValues(values: string[], currentUserId: string): string[] {
    return values.map(v => {
        if (v === SpecialValueCurrentUser) {
            return currentUserId
        }
        if (v === SpecialValueNow) {
            return String(Date.now())
        }
        return v
    })
}

function isIn(cardValue: string | string[] | undefined, values: string[]): boolean {
    if (!cardValue) {
        return values.length === 0
    }
    if (Array.isArray(cardValue)) {
        return values.some(v => cardValue.includes(v))
    }
    return values.includes(cardValue)
}

function isEmpty(cardValue: string | string[] | undefined): boolean {
    if (!cardValue) {
        return true
    }
    if (Array.isArray(cardValue)) {
        return cardValue.length === 0
    }
    return cardValue === '' || cardValue === 'null' || cardValue === 'undefined'
}

function compareNumbers(cardValue: string | string[] | undefined, compareValue: string | undefined, operator: '>' | '<' | '>=' | '<='): boolean {
    const cardNum = parseNumber(cardValue)
    const compareNum = parseNumber(compareValue)

    if (isNaN(cardNum) || isNaN(compareNum)) {
        return false
    }

    switch (operator) {
    case '>':
        return cardNum > compareNum
    case '<':
        return cardNum < compareNum
    case '>=':
        return cardNum >= compareNum
    case '<=':
        return cardNum <= compareNum
    }
}

function parseNumber(value: string | string[] | undefined): number {
    if (!value) {
        return NaN
    }
    if (Array.isArray(value)) {
        return NaN
    }
    const num = parseFloat(value)
    return isNaN(num) ? NaN : num
}

function isEqual(cardValue: string | string[] | undefined, compareValue: string | undefined): boolean {
    if (!compareValue) {
        return !cardValue
    }
    if (Array.isArray(cardValue)) {
        return false
    }
    return String(cardValue).toLowerCase() === compareValue.toLowerCase()
}

function contains(cardValue: string | string[] | undefined, searchValue: string | undefined): boolean {
    if (!searchValue) {
        return true
    }
    if (!cardValue) {
        return false
    }
    if (Array.isArray(cardValue)) {
        return false
    }
    return String(cardValue).toLowerCase().includes(searchValue.toLowerCase())
}

function isChecked(cardValue: string | string[] | undefined): boolean {
    return cardValue === 'true'
}
