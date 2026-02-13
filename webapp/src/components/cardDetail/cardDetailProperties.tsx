// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react'
import {FormattedMessage} from 'react-intl'

import {Board, IPropertyTemplate} from '../../blocks/board'
import {Card} from '../../blocks/card'
import PropertyValueElement from '../propertyValueElement'
import {Permission} from '../../constants'
import {useHasCurrentBoardPermissions} from '../../hooks/permissions'

import {GITHUB_PRS_PROPERTY_ID} from './githubPRStatus'

type Props = {
    board: Board
    card: Card
    readonly: boolean
}

const CardDetailProperties = (props: Props) => {
    const {board, card} = props
    const [showHiddenProperties, setShowHiddenProperties] = useState(false)
    const canEditBoardCards = useHasCurrentBoardPermissions([Permission.ManageBoardCards])

    // Helper function to check if a property value is empty
    const isPropertyEmpty = (propertyTemplate: IPropertyTemplate): boolean => {
        const value = card.fields.properties[propertyTemplate.id]
        if (value === undefined || value === null || value === '') {
            return true
        }
        if (Array.isArray(value) && value.length === 0) {
            return true
        }
        return false
    }

    // Separate properties into visible and hidden based on hideIfEmpty setting
    // Issue 6: hideIfEmpty now applies to entire property, not individual options
    // Issue 9: Exclude GitHub PRs property — it's force-hidden and rendered separately by GitHubPRStatus
    const visibleProperties: IPropertyTemplate[] = []
    const hiddenProperties: IPropertyTemplate[] = []

    board.cardProperties.forEach((propertyTemplate: IPropertyTemplate) => {
        // Skip GitHub PRs property — it's rendered by GitHubPRStatus component, not as a regular property
        if (propertyTemplate.id === GITHUB_PRS_PROPERTY_ID) {
            return
        }

        const isEmpty = isPropertyEmpty(propertyTemplate)
        const shouldHide = isEmpty && propertyTemplate.hideIfEmpty

        if (shouldHide) {
            hiddenProperties.push(propertyTemplate)
        } else {
            visibleProperties.push(propertyTemplate)
        }
    })

    const renderPropertyRow = (propertyTemplate: IPropertyTemplate) => (
        <div
            key={propertyTemplate.id + '-' + propertyTemplate.type}
            className='octo-propertyrow'
        >
            <div className='octo-propertyname'>{propertyTemplate.name}</div>
            <PropertyValueElement
                readOnly={props.readonly || !canEditBoardCards}
                card={card}
                board={board}
                propertyTemplate={propertyTemplate}
                showEmptyPlaceholder={true}
            />
        </div>
    )

    return (
        <div className='octo-propertylist CardDetailProperties'>
            {visibleProperties.map(renderPropertyRow)}

            {hiddenProperties.length > 0 && (
                <>
                    <div
                        className='CardDetailProperties__display-more'
                        onClick={() => setShowHiddenProperties(!showHiddenProperties)}
                    >
                        <FormattedMessage
                            id='CardDetail.display-more'
                            defaultMessage='-- Display More --'
                        />
                    </div>
                    {showHiddenProperties && hiddenProperties.map(renderPropertyRow)}
                </>
            )}
        </div>
    )
}

export default React.memo(CardDetailProperties)
