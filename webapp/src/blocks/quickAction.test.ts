// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createQuickAction, QuickAction} from './quickAction'

describe('quickAction block', () => {
    describe('createQuickAction', () => {
        test('should create a quick action with default values', () => {
            const action = createQuickAction()

            expect(action.id).toBe('')
            expect(action.name).toBe('')
            expect(action.style).toEqual({color: 'propColorDefault'})
            expect(action.confirmRequired).toBe(false)
            expect(action.confirmText).toBe('')
            expect(action.conditions).toEqual([])
            expect(action.actions).toEqual([])
        })

        test('should create a quick action with provided values', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Test Action',
                style: {color: '#0066cc'},
                confirmRequired: true,
                confirmText: 'Are you sure?',
                conditions: [
                    {
                        propertyId: 'status-prop-id',
                        operator: 'in',
                        values: ['done'],
                    },
                ],
                actions: [
                    {
                        type: 'setProperty',
                        propertyId: 'status-prop-id',
                        value: 'in-progress',
                    },
                ],
            }

            const action = createQuickAction(partialAction)

            expect(action.id).toBe('test-id')
            expect(action.name).toBe('Test Action')
            expect(action.style).toEqual({color: '#0066cc'})
            expect(action.confirmRequired).toBe(true)
            expect(action.confirmText).toBe('Are you sure?')
            expect(action.conditions).toHaveLength(1)
            expect(action.conditions[0]).toEqual({
                propertyId: 'status-prop-id',
                operator: 'in',
                values: ['done'],
            })
            expect(action.actions).toHaveLength(1)
            expect(action.actions[0]).toEqual({
                type: 'setProperty',
                propertyId: 'status-prop-id',
                value: 'in-progress',
            })
        })

        test('should merge partial values with defaults', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Test Action',
            }

            const action = createQuickAction(partialAction)

            expect(action.id).toBe('test-id')
            expect(action.name).toBe('Test Action')
            expect(action.style).toEqual({color: 'propColorDefault'})
            expect(action.confirmRequired).toBe(false)
            expect(action.confirmText).toBe('')
            expect(action.conditions).toEqual([])
            expect(action.actions).toEqual([])
        })

        test('should handle confirmRequired being explicitly set to false', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Test Action',
                confirmRequired: false,
            }

            const action = createQuickAction(partialAction)

            expect(action.confirmRequired).toBe(false)
        })

        test('should handle confirmRequired being explicitly set to true', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Test Action',
                confirmRequired: true,
                confirmText: 'Confirm?',
            }

            const action = createQuickAction(partialAction)

            expect(action.confirmRequired).toBe(true)
            expect(action.confirmText).toBe('Confirm?')
        })

        test('should create quick action with multiple conditions', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Test Action',
                conditions: [
                    {
                        propertyId: 'status-prop-id',
                        operator: 'in',
                        values: ['waiting', 'todo'],
                    },
                    {
                        propertyId: 'priority-prop-id',
                        operator: 'in',
                        values: ['high', 'critical'],
                    },
                ],
            }

            const action = createQuickAction(partialAction)

            expect(action.conditions).toHaveLength(2)
            expect(action.conditions[0].propertyId).toBe('status-prop-id')
            expect(action.conditions[1].propertyId).toBe('priority-prop-id')
        })

        test('should create quick action with multiple actions', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Test Action',
                actions: [
                    {
                        type: 'setProperty',
                        propertyId: 'status-prop-id',
                        value: 'in-progress',
                    },
                    {
                        type: 'addComment',
                        text: 'Work started',
                    },
                ],
            }

            const action = createQuickAction(partialAction)

            expect(action.actions).toHaveLength(2)
            expect(action.actions[0].type).toBe('setProperty')
            expect(action.actions[1].type).toBe('addComment')
        })

        test('should create quick action with all supported operators', () => {
            const operators = [
                'in',
                'not in',
                'empty',
                'not empty',
                '>',
                '<',
                '>=',
                '<=',
                'equal',
                'contains',
                'not contains',
                'checked',
                'not checked',
            ] as const

            operators.forEach((op) => {
                const partialAction: Partial<QuickAction> = {
                    id: `test-${op}`,
                    name: `Test ${op}`,
                    conditions: [
                        {
                            propertyId: 'prop-id',
                            operator: op,
                            values: op === 'empty' || op === 'not empty' || op === 'checked' || op === 'not checked' ? [] : ['value'],
                        },
                    ],
                }

                const action = createQuickAction(partialAction)

                expect(action.conditions[0].operator).toBe(op)
            })
        })

        test('should create quick action with all supported action types', () => {
            const actionTypes = ['setProperty', 'clearProperty', 'addComment'] as const

            actionTypes.forEach((actionType) => {
                const partialAction: Partial<QuickAction> = {
                    id: `test-${actionType}`,
                    name: `Test ${actionType}`,
                    actions: [
                        {
                            type: actionType,
                            propertyId: actionType === 'addComment' ? undefined : 'prop-id',
                            value: actionType === 'setProperty' ? 'value' : undefined,
                            text: actionType === 'addComment' ? 'comment text' : undefined,
                        },
                    ],
                }

                const action = createQuickAction(partialAction)

                expect(action.actions[0].type).toBe(actionType)
            })
        })

        test('should create quick action with {current_user} special value', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Assign to Current User',
                actions: [
                    {
                        type: 'setProperty',
                        propertyId: 'assignee-prop-id',
                        value: '{current_user}',
                    },
                ],
            }

            const action = createQuickAction(partialAction)

            expect(action.actions[0].value).toBe('{current_user}')
        })

        test('should create quick action with {now} special value', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Set to Now',
                actions: [
                    {
                        type: 'setProperty',
                        propertyId: 'date-prop-id',
                        value: '{now}',
                    },
                ],
            }

            const action = createQuickAction(partialAction)

            expect(action.actions[0].value).toBe('{now}')
        })

        test('should handle empty conditions array', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Test Action',
                conditions: [],
            }

            const action = createQuickAction(partialAction)

            expect(action.conditions).toEqual([])
        })

        test('should handle empty actions array', () => {
            const partialAction: Partial<QuickAction> = {
                id: 'test-id',
                name: 'Test Action',
                actions: [],
            }

            const action = createQuickAction(partialAction)

            expect(action.actions).toEqual([])
        })
    })
})
