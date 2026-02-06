// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import 'isomorphic-fetch'
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import {mocked} from 'jest-mock'

import {TestBlockFactory} from '../../test/testBlockFactory'
import {mockDOM, wrapIntl} from '../../testUtils'

import octoClient from '../../octoClient'
import {QuickAction} from '../../blocks/quickAction'

import QuickActionButton from './quickActionButton'

global.fetch = jest.fn()
jest.mock('../../octoClient')

const mockedOctoClient = mocked(octoClient, true)

beforeAll(() => {
    mockDOM()
})

beforeEach(() => {
    jest.clearAllMocks()
})

describe('components/cardDetail/QuickActionButton', () => {
    const board = TestBlockFactory.createBoard()
    const card = TestBlockFactory.createCard(board)

    const baseAction = {
        id: 'action-id-1',
        name: 'Start Work',
        style: {color: 'propColorRed'},
        confirmRequired: false,
        confirmText: '',
        conditions: [],
        actions: [
            {
                type: 'setProperty',
                propertyId: 'status-prop-id',
                value: 'in-progress',
            },
        ],
    }

    test('should render the button with action name', () => {
        const {container} = render(wrapIntl(
            <QuickActionButton
                action={baseAction}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton')
        expect(button).toBeInTheDocument()
        expect(button).toHaveTextContent('Start Work')
    })

    test('should apply the color class from style', () => {
        const {container} = render(wrapIntl(
            <QuickActionButton
                action={baseAction}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton.propColorRed')
        expect(button).toBeInTheDocument()
    })

    test('should use default color if not specified', () => {
        const actionWithoutColor = {
            ...baseAction,
            style: {} as {color: string},
        }

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={actionWithoutColor}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton')
        expect(button?.classList.contains('propColorDefault')).toBe(true)
    })

    test('should call executeQuickAction when clicked without confirmation', async () => {
        mockedOctoClient.executeQuickAction.mockResolvedValueOnce(undefined)

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={baseAction}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton') as HTMLButtonElement
        expect(button).not.toBeDisabled()

        await act(async () => {
            await userEvent.click(button)
        })

        expect(mockedOctoClient.executeQuickAction).toHaveBeenCalledWith(
            board.id,
            card.id,
            baseAction.id,
        )
    })

    test('should disable button while executing', async () => {
        let resolveExecution: () => void
        const executionPromise = new Promise<void>((resolve) => {
            resolveExecution = resolve
        })

        mockedOctoClient.executeQuickAction.mockReturnValueOnce(executionPromise)

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={baseAction}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton') as HTMLButtonElement

        await act(async () => {
            await userEvent.click(button)
        })

        expect(button).toBeDisabled()

        await act(async () => {
            resolveExecution!()
        })

        await waitFor(() => {
            expect(button).not.toBeDisabled()
        })
    })

    test('should show confirmation dialog when confirmRequired is true', async () => {
        const actionWithConfirmation: QuickAction = {
            ...baseAction,
            confirmRequired: true,
            confirmText: 'Are you sure you want to start work?',
        }

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={actionWithConfirmation}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton') as HTMLButtonElement

        await act(async () => {
            await userEvent.click(button)
        })

        // Check that confirmation dialog is shown
        const dialogText = screen.queryByText('Are you sure you want to start work?')
        expect(dialogText).toBeInTheDocument()

        // Check that the dialog has the action name in the heading
        const dialogTitle = screen.queryByRole('heading', {name: 'Start Work'})
        expect(dialogTitle).toBeInTheDocument()
    })

    test('should execute action after confirmation is confirmed', async () => {
        const actionWithConfirmation: QuickAction = {
            ...baseAction,
            confirmRequired: true,
            confirmText: 'Are you sure?',
        }

        mockedOctoClient.executeQuickAction.mockResolvedValueOnce(undefined)

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={actionWithConfirmation}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton') as HTMLButtonElement

        // Click to show confirmation
        await act(async () => {
            await userEvent.click(button)
        })

        // Click confirm button
        const confirmButton = screen.queryByText('OK')
        expect(confirmButton).toBeInTheDocument()

        await act(async () => {
            await userEvent.click(confirmButton!)
        })

        expect(mockedOctoClient.executeQuickAction).toHaveBeenCalledWith(
            board.id,
            card.id,
            actionWithConfirmation.id,
        )
    })

    test('should not execute action when confirmation is cancelled', async () => {
        const actionWithConfirmation: QuickAction = {
            ...baseAction,
            confirmRequired: true,
            confirmText: 'Are you sure?',
        }

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={actionWithConfirmation}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton') as HTMLButtonElement

        // Click to show confirmation
        await act(async () => {
            await userEvent.click(button)
        })

        // Click cancel button (close)
        const cancelButton = screen.queryByText('Cancel')
        expect(cancelButton).toBeInTheDocument()

        await act(async () => {
            await userEvent.click(cancelButton!)
        })

        expect(mockedOctoClient.executeQuickAction).not.toHaveBeenCalled()
    })

    test('should handle execution error gracefully', async () => {
        mockedOctoClient.executeQuickAction.mockRejectedValueOnce(new Error('Execution failed'))

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={baseAction}
                board={board}
                card={card}
            />,
        ))

        const button = container.querySelector('.QuickActionButton') as HTMLButtonElement

        await act(async () => {
            await userEvent.click(button)
        })

        await waitFor(() => {
            expect(button).not.toBeDisabled()
        })

        expect(mockedOctoClient.executeQuickAction).toHaveBeenCalled()

        consoleErrorSpy.mockRestore()
    })

    test('should match snapshot', () => {
        const {container} = render(wrapIntl(
            <QuickActionButton
                action={baseAction}
                board={board}
                card={card}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with confirmation', () => {
        const actionWithConfirmation: QuickAction = {
            ...baseAction,
            confirmRequired: true,
            confirmText: 'Are you sure?',
        }

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={actionWithConfirmation}
                board={board}
                card={card}
            />,
        ))

        expect(container).toMatchSnapshot()
    })

    test('should match snapshot with different color', () => {
        const actionWithBlueColor: QuickAction = {
            ...baseAction,
            style: {color: 'propColorBlue'},
        }

        const {container} = render(wrapIntl(
            <QuickActionButton
                action={actionWithBlueColor}
                board={board}
                card={card}
            />,
        ))

        expect(container).toMatchSnapshot()
    })
})
