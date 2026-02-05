// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type QuickActionConditionOperator =
    | 'in' | 'not in'                              // select, multiSelect, person, createdBy
    | 'empty' | 'not empty'                        // ALL types
    | '>' | '<' | '>=' | '<='                      // number, date, createdTime, updatedTime
    | 'equal' | 'contains' | 'not contains'        // text, url, email, phone
    | 'checked' | 'not checked'                    // checkbox

export type QuickActionActionType =
    | 'setProperty'
    | 'clearProperty'
    | 'addComment'

export interface QuickActionCondition {
    propertyId: string
    operator: QuickActionConditionOperator
    values?: string[]  // Values for operators that need them; empty for empty/notEmpty/checked/notChecked
}

export interface QuickActionAction {
    type: QuickActionActionType
    propertyId?: string  // Required for setProperty/clearProperty
    value?: string       // Required for setProperty (can be '{now}', '{current_user}', or actual value)
    text?: string        // Required for addComment
}

export interface QuickAction {
    id: string
    name: string
    style: { color: string }  // Using same color system as property options
    confirmRequired: boolean
    confirmText: string
    conditions: QuickActionCondition[]
    actions: QuickActionAction[]
}

export function createQuickAction(o?: Partial<QuickAction>): QuickAction {
    return {
        id: o?.id || '',
        name: o?.name || '',
        style: o?.style || { color: 'propColorDefault' },
        confirmRequired: o?.confirmRequired ?? false,
        confirmText: o?.confirmText || '',
        conditions: o?.conditions || [],
        actions: o?.actions || [],
    }
}
