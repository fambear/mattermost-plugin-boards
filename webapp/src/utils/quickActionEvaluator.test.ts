// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TestBlockFactory} from '../test/testBlockFactory'
import {Board, IPropertyTemplate} from '../blocks/board'

import {QuickActionCondition} from '../blocks/quickAction'

import {evaluateConditions} from './quickActionEvaluator'

describe('quickActionEvaluator', () => {
    let board: Board
    const currentUserId = 'user-id-1'

    beforeEach(() => {
        board = TestBlockFactory.createBoard()

        // Add property templates that tests will use
        const propertyTemplates: IPropertyTemplate[] = [
            {id: 'status-prop-id', name: 'Status', type: 'select', options: []},
            {id: 'priority-prop-id', name: 'Priority', type: 'select', options: []},
            {id: 'assignee-prop-id', name: 'Assignee', type: 'person', options: []},
            {id: 'checkbox-prop-id', name: 'Checkbox', type: 'checkbox', options: []},
            {id: 'count-prop-id', name: 'Count', type: 'number', options: []},
            {id: 'text-prop-id', name: 'Text', type: 'text', options: []},
            {id: 'tags-prop-id', name: 'Tags', type: 'multiSelect', options: []},
        ]

        board.cardProperties.push(...propertyTemplates)
    })

    describe('evaluateConditions', () => {
        test('should return true when there are no conditions', () => {
            const card = TestBlockFactory.createCard(board)
            const conditions: QuickActionCondition[] = []

            const result = evaluateConditions(conditions, card, board, currentUserId)
            expect(result).toBeTruthy()
        })

        test('should return true when all conditions are met', () => {
            const card = TestBlockFactory.createCard(board)
            card.fields.properties = {
                'status-prop-id': 'in-progress',
                'priority-prop-id': 'high',
            }

            const conditions: QuickActionCondition[] = [
                {propertyId: 'status-prop-id', operator: 'in', values: ['in-progress', 'done']},
                {propertyId: 'priority-prop-id', operator: 'in', values: ['high', 'critical']},
            ]

            const result = evaluateConditions(conditions, card, board, currentUserId)
            expect(result).toBeTruthy()
        })

        test('should return false when any condition is not met', () => {
            const card = TestBlockFactory.createCard(board)
            card.fields.properties = {
                'status-prop-id': 'waiting',
                'priority-prop-id': 'low',
            }

            const conditions: QuickActionCondition[] = [
                {propertyId: 'status-prop-id', operator: 'in', values: ['in-progress', 'done']},
                {propertyId: 'priority-prop-id', operator: 'in', values: ['high', 'critical']},
            ]

            const result = evaluateConditions(conditions, card, board, currentUserId)
            expect(result).toBeFalsy()
        })

        test('should return false when property does not exist on board', () => {
            const card = TestBlockFactory.createCard(board)
            card.fields.properties = {
                'status-prop-id': 'in-progress',
            }

            const conditions: QuickActionCondition[] = [
                {propertyId: 'non-existent-prop-id', operator: 'in', values: ['value']},
            ]

            const result = evaluateConditions(conditions, card, board, currentUserId)
            expect(result).toBeFalsy()
        })

        describe('in operator', () => {
            test('should match single value', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'status-prop-id': 'in-progress',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'in', values: ['in-progress']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should match one of multiple values', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'status-prop-id': 'done',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'in', values: ['in-progress', 'done', 'review']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match none of the values', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'status-prop-id': 'cancelled',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'in', values: ['in-progress', 'done', 'review']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })

        describe('not in operator', () => {
            test('should not match when value is in list', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'status-prop-id': 'in-progress',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'not in', values: ['in-progress', 'done']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should match when value is not in list', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'status-prop-id': 'waiting',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'not in', values: ['in-progress', 'done']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })
        })

        describe('empty operator', () => {
            test('should match undefined value', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {}

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'empty', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should match empty string', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'status-prop-id': '',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'empty', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match non-empty value', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'status-prop-id': 'in-progress',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'empty', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should match empty array', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'tags-prop-id': [],
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'tags-prop-id', operator: 'empty', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })
        })

        describe('not empty operator', () => {
            test('should not match undefined value', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {}

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'not empty', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should match non-empty value', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'status-prop-id': 'in-progress',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'status-prop-id', operator: 'not empty', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should match non-empty array', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'tags-prop-id': ['tag1', 'tag2'],
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'tags-prop-id', operator: 'not empty', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })
        })

        describe('> operator', () => {
            test('should match greater number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '10',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '>', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match lesser number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '3',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '>', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should not match equal number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '5',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '>', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should handle decimal numbers', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '5.5',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '>', values: ['5.1']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })
        })

        describe('< operator', () => {
            test('should match lesser number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '3',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '<', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match greater number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '10',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '<', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })

        describe('>= operator', () => {
            test('should match greater number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '10',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '>=', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should match equal number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '5',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '>=', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match lesser number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '3',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '>=', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })

        describe('<= operator', () => {
            test('should match lesser number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '3',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '<=', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should match equal number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '5',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '<=', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match greater number', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'count-prop-id': '10',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'count-prop-id', operator: '<=', values: ['5']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })

        describe('equal operator', () => {
            test('should match exact string (case insensitive)', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'text-prop-id': 'Hello World',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'text-prop-id', operator: 'equal', values: ['hello world']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match different string', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'text-prop-id': 'Hello World',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'text-prop-id', operator: 'equal', values: ['Goodbye']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })

        describe('contains operator', () => {
            test('should match substring (case insensitive)', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'text-prop-id': 'Hello World',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'text-prop-id', operator: 'contains', values: ['lo wo']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match non-existent substring', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'text-prop-id': 'Hello World',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'text-prop-id', operator: 'contains', values: ['xyz']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })

        describe('not contains operator', () => {
            test('should not match when substring exists', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'text-prop-id': 'Hello World',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'text-prop-id', operator: 'not contains', values: ['lo wo']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should match when substring does not exist', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'text-prop-id': 'Hello World',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'text-prop-id', operator: 'not contains', values: ['xyz']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })
        })

        describe('checked operator', () => {
            test('should match true checkbox', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'checkbox-prop-id': 'true',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'checkbox-prop-id', operator: 'checked', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match false checkbox', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'checkbox-prop-id': 'false',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'checkbox-prop-id', operator: 'checked', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should not match empty checkbox', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'checkbox-prop-id': '',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'checkbox-prop-id', operator: 'checked', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })

        describe('not checked operator', () => {
            test('should not match true checkbox', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'checkbox-prop-id': 'true',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'checkbox-prop-id', operator: 'not checked', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should match false checkbox', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'checkbox-prop-id': 'false',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'checkbox-prop-id', operator: 'not checked', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should match empty checkbox', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'checkbox-prop-id': '',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'checkbox-prop-id', operator: 'not checked', values: []},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })
        })

        describe('multiSelect property with in operator', () => {
            test('should match when one value is in array', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'tags-prop-id': ['tag1', 'tag2', 'tag3'],
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'tags-prop-id', operator: 'in', values: ['tag2']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should match when any value is in list', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'tags-prop-id': ['tag1', 'tag2'],
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'tags-prop-id', operator: 'in', values: ['tag3', 'tag2']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match when no value is in list', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'tags-prop-id': ['tag1', 'tag2'],
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'tags-prop-id', operator: 'in', values: ['tag3', 'tag4']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })

        describe('multiSelect property with not in operator', () => {
            test('should not match when value is in array', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'tags-prop-id': ['tag1', 'tag2', 'tag3'],
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'tags-prop-id', operator: 'not in', values: ['tag2']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })

            test('should match when no value is in array', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'tags-prop-id': ['tag1', 'tag2'],
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'tags-prop-id', operator: 'not in', values: ['tag3', 'tag4']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })
        })

        describe('{current_user} special value', () => {
            test('should resolve {current_user} in operator', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'assignee-prop-id': 'user-id-1',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'assignee-prop-id', operator: 'in', values: ['{current_user}']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeTruthy()
            })

            test('should not match when card value differs from {current_user}', () => {
                const card = TestBlockFactory.createCard(board)
                card.fields.properties = {
                    'assignee-prop-id': 'user-id-2',
                }

                const conditions: QuickActionCondition[] = [
                    {propertyId: 'assignee-prop-id', operator: 'in', values: ['{current_user}']},
                ]

                const result = evaluateConditions(conditions, card, board, currentUserId)
                expect(result).toBeFalsy()
            })
        })
    })
})
