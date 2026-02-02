// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TestBlockFactory} from '../test/testBlockFactory'
import {createTextBlock} from '../blocks/textBlock'

import {validateContentOrder, repairContentOrder} from './blockOrderUtils'

describe('blockOrderUtils', () => {
    describe('validateContentOrder', () => {
        const board = TestBlockFactory.createBoard()
        const card = TestBlockFactory.createCard(board)

        it('should return valid result for correct order with all blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, block2.id, block3.id]

            const result = validateContentOrder(contentOrder, [block1, block2, block3])

            expect(result.isValid).toBe(true)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual(contentOrder)
        })

        it('should detect orphaned IDs in contentOrder', () => {
            const block1 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, 'ghost-id', block3.id]

            const result = validateContentOrder(contentOrder, [block1, block3])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual(['ghost-id'])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([block1.id, block3.id])
        })

        it('should detect missing blocks not in contentOrder', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, block3.id]

            const result = validateContentOrder(contentOrder, [block1, block2, block3])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([block2.id])
            expect(result.validOrder).toEqual([block1.id, block3.id])
        })

        it('should detect both orphaned and missing blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block4 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, 'ghost-id', block2.id]

            const result = validateContentOrder(contentOrder, [block1, block2, block4])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual(['ghost-id'])
            expect(result.missingIds).toEqual([block4.id])
            expect(result.validOrder).toEqual([block1.id, block2.id])
        })

        it('should handle grouped blocks with partial orphaned', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block4 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, [block2.id, 'ghost-id', block4.id]]

            const result = validateContentOrder(contentOrder, [block1, block2, block4])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual(['ghost-id'])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([block1.id, [block2.id, block4.id]])
        })

        it('should handle grouped blocks with all orphaned', () => {
            const block1 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, ['ghost-1', 'ghost-2']]

            const result = validateContentOrder(contentOrder, [block1])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual(['ghost-1', 'ghost-2'])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([block1.id])
        })

        it('should skip null values in contentOrder', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, null, block2.id]

            const result = validateContentOrder(contentOrder, [block1, block2])

            expect(result.isValid).toBe(true)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([block1.id, block2.id])
        })

        it('should skip undefined values in contentOrder', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, undefined, block2.id]

            const result = validateContentOrder(contentOrder, [block1, block2])

            expect(result.isValid).toBe(true)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([block1.id, block2.id])
        })

        it('should skip null values in grouped blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)

            const contentOrder = [[block1.id, null, block2.id, null, block3.id]]

            const result = validateContentOrder(contentOrder, [block1, block2, block3])

            expect(result.isValid).toBe(true)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([[block1.id, block2.id, block3.id]])
        })

        it('should handle empty contentOrder with existing blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder: string[] = []

            const result = validateContentOrder(contentOrder, [block1, block2])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([block1.id, block2.id])
            expect(result.validOrder).toEqual([])
        })

        it('should handle undefined contentOrder with existing blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder = undefined

            const result = validateContentOrder(contentOrder, [block1, block2])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([block1.id, block2.id])
            expect(result.validOrder).toEqual([])
        })

        it('should handle empty blocks with non-empty contentOrder', () => {
            const contentOrder = ['block1', 'block2']

            const result = validateContentOrder(contentOrder, [])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual(['block1', 'block2'])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([])
        })

        it('should handle both empty contentOrder and empty blocks', () => {
            const contentOrder: string[] = []

            const result = validateContentOrder(contentOrder, [])

            expect(result.isValid).toBe(true)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([])
        })

        it('should handle undefined contentOrder with empty blocks', () => {
            const contentOrder = undefined

            const result = validateContentOrder(contentOrder, [])

            expect(result.isValid).toBe(true)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([])
        })

        it('should handle multiple groups and mixed content', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)
            const block4 = TestBlockFactory.createText(card)

            const contentOrder = [
                block1.id,
                [block2.id, 'ghost-1'],
                block3.id,
                ['ghost-2', block4.id],
            ]

            const result = validateContentOrder(contentOrder, [block1, block2, block3, block4])

            expect(result.isValid).toBe(false)
            expect(result.orphanedIds).toEqual(['ghost-1', 'ghost-2'])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([
                block1.id,
                [block2.id],
                block3.id,
                [block4.id],
            ])
        })

        it('should handle duplicate IDs in contentOrder', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, block2.id, block1.id]

            const result = validateContentOrder(contentOrder, [block1, block2])

            expect(result.isValid).toBe(true)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual([block1.id, block2.id, block1.id])
        })

        it('should handle large number of blocks efficiently', () => {
            const blocks: typeof createTextBlock.prototype[] = []
            const contentOrder: string[] = []

            for (let i = 0; i < 100; i++) {
                const block = TestBlockFactory.createText(card)
                blocks.push(block)
                contentOrder.push(block.id)
            }

            const result = validateContentOrder(contentOrder, blocks)

            expect(result.isValid).toBe(true)
            expect(result.orphanedIds).toEqual([])
            expect(result.missingIds).toEqual([])
            expect(result.validOrder).toEqual(contentOrder)
        })
    })

    describe('repairContentOrder', () => {
        const board = TestBlockFactory.createBoard()
        const card = TestBlockFactory.createCard(board)

        it('should return unchanged order when valid', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, block2.id, block3.id]

            const result = repairContentOrder(contentOrder, [block1, block2, block3])

            expect(result).toEqual(contentOrder)
        })

        it('should remove orphaned IDs', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, 'ghost-id', block2.id]

            const result = repairContentOrder(contentOrder, [block1, block2])

            expect(result).toEqual([block1.id, block2.id])
        })

        it('should append missing blocks at the end', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id]

            const result = repairContentOrder(contentOrder, [block1, block2, block3])

            expect(result).toEqual([block1.id, block2.id, block3.id])
        })

        it('should handle both orphaned and missing blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, 'ghost-id', block2.id]

            const result = repairContentOrder(contentOrder, [block1, block2, block3])

            expect(result).toEqual([block1.id, block2.id, block3.id])
        })

        it('should handle grouped blocks with missing blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)
            const block4 = TestBlockFactory.createText(card)

            const contentOrder = [
                block1.id,
                [block2.id, 'ghost-id', block3.id],
            ]

            const result = repairContentOrder(contentOrder, [block1, block2, block3, block4])

            expect(result).toEqual([
                block1.id,
                [block2.id, block3.id],
                block4.id,
            ])
        })

        it('should handle grouped blocks with orphaned items', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder = [
                block1.id,
                [block2.id, 'ghost-1', 'ghost-2'],
            ]

            const result = repairContentOrder(contentOrder, [block1, block2])

            expect(result).toEqual([
                block1.id,
                [block2.id],
            ])
        })

        it('should handle empty contentOrder with existing blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder: string[] = []

            const result = repairContentOrder(contentOrder, [block1, block2])

            expect(result).toEqual([block1.id, block2.id])
        })

        it('should handle undefined contentOrder with existing blocks', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder = undefined

            const result = repairContentOrder(contentOrder, [block1, block2])

            expect(result).toEqual([block1.id, block2.id])
        })

        it('should handle empty blocks array', () => {
            const contentOrder = ['ghost-1', 'ghost-2']

            const result = repairContentOrder(contentOrder, [])

            expect(result).toEqual([])
        })

        it('should handle both empty contentOrder and empty blocks', () => {
            const contentOrder: string[] = []

            const result = repairContentOrder(contentOrder, [])

            expect(result).toEqual([])
        })

        it('should preserve group structure when valid', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)

            const contentOrder = [
                block1.id,
                [block2.id, block3.id],
            ]

            const result = repairContentOrder(contentOrder, [block1, block2, block3])

            expect(result).toEqual([
                block1.id,
                [block2.id, block3.id],
            ])
        })

        it('should handle complex scenario with multiple issues', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)
            const block4 = TestBlockFactory.createText(card)
            const block5 = TestBlockFactory.createText(card)

            const contentOrder = [
                block1.id,
                'ghost-1',
                [block2.id, 'ghost-2', block3.id],
                'ghost-3',
            ]

            const result = repairContentOrder(contentOrder, [block1, block2, block3, block4, block5])

            expect(result).toEqual([
                block1.id,
                [block2.id, block3.id],
                block4.id,
                block5.id,
            ])
        })

        it('should handle null values in contentOrder', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder = [block1.id, null, block2.id]

            const result = repairContentOrder(contentOrder, [block1, block2])

            // repairContentOrder preserves the order as-is when valid, including nulls
            // This is because null values are filtered during validation
            expect(result).toEqual([block1.id, null, block2.id])
        })

        it('should handle mixed groups and single items', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)
            const block3 = TestBlockFactory.createText(card)
            const block4 = TestBlockFactory.createText(card)

            const contentOrder = [
                block1.id,
                [block2.id, block3.id],
                block4.id,
            ]

            const result = repairContentOrder(contentOrder, [block1, block2, block3, block4])

            expect(result).toEqual([
                block1.id,
                [block2.id, block3.id],
                block4.id,
            ])
        })

        it('should handle scenario where all blocks are missing from contentOrder', () => {
            const block1 = TestBlockFactory.createText(card)
            const block2 = TestBlockFactory.createText(card)

            const contentOrder: string[] = []

            const result = repairContentOrder(contentOrder, [block1, block2])

            expect(result).toEqual([block1.id, block2.id])
        })

        it('should maintain order of valid blocks', () => {
            const blocks: typeof createTextBlock.prototype[] = []
            const contentOrder: string[] = []

            for (let i = 0; i < 5; i++) {
                const block = TestBlockFactory.createText(card)
                blocks.push(block)
                contentOrder.push(block.id)
            }

            // Remove one from contentOrder
            const modifiedContentOrder = contentOrder.filter((id) => id !== blocks[2].id)

            const result = repairContentOrder(modifiedContentOrder, blocks)

            expect(result).toEqual([
                blocks[0].id,
                blocks[1].id,
                blocks[3].id,
                blocks[4].id,
                blocks[2].id, // Should be appended at the end
            ])
        })
    })
})
