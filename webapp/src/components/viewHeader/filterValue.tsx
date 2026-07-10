// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react'

import {useIntl} from 'react-intl'

import {PropertyType} from '../../properties/types'
import {IPropertyTemplate} from '../../blocks/board'
import {FilterClause} from '../../blocks/filterClause'
import {createFilterGroup} from '../../blocks/filterGroup'
import {BoardView} from '../../blocks/boardView'
import {CardFilter} from '../../cardFilter'
import mutator from '../../mutator'
import {Utils} from '../../utils'
import Button from '../../widgets/buttons/button'
import Menu from '../../widgets/menu'
import Editable from '../../widgets/editable'
import MenuWrapper from '../../widgets/menuWrapper'

import DateFilter from './dateFilter'

import './filterValue.scss'
import MultiPersonFilterValue from './multipersonFilterValue'

type Props = {
    view: BoardView
    filter: FilterClause
    template?: IPropertyTemplate
    propertyType: PropertyType
}

const filterValue = (props: Props): JSX.Element|null => {
    const {filter, template, view, propertyType} = props
    const [value, setValue] = useState(filter.values.length > 0 ? filter.values[0] : '')
    const intl = useIntl()

    if (propertyType.filterValueType === 'none') {
        return null
    }

    if (propertyType.filterValueType === 'boolean') {
        return null
    }

    if ((propertyType.filterValueType === 'options' || propertyType.filterValueType === 'person') && filter.condition !== 'includes' && filter.condition !== 'notIncludes') {
        return null
    }

    if (propertyType.filterValueType === 'text') {
        return (
            <Editable
                onChange={setValue}
                value={value}
                placeholderText={intl.formatMessage({id: 'FilterByText.placeholder', defaultMessage: 'filter text'})}
                onSave={() => {
                    const filterIndex = view.fields.filter.filters.indexOf(filter)
                    Utils.assert(filterIndex >= 0, "Can't find filter")

                    const filterGroup = createFilterGroup(view.fields.filter)
                    const newFilter = filterGroup.filters[filterIndex] as FilterClause
                    Utils.assert(newFilter, `No filter at index ${filterIndex}`)

                    // Drop a blank value for the substring conditions, so the clause reads as
                    // inactive instead of looking configured. Keep it for the equality ones: with
                    // no isEmpty in the text condition menu, a blank `is`/`includes` is the only
                    // way to select cards whose text is empty, and `notIncludes` selects the rest.
                    // `includes` matters because addFilterClicked defaults to it and FilterEntry
                    // renders it as `is`, so the user cannot tell which one they are editing.
                    const dropBlank = !value && CardFilter.isBlankValueMeaningless(newFilter.condition)
                    newFilter.values = dropBlank ? [] : [value]
                    mutator.changeViewFilter(view.boardId, view.id, view.fields.filter, filterGroup)
                }}
            />
        )
    }

    if (propertyType.filterValueType === 'person') {
        return (
            <MultiPersonFilterValue
                view={view}
                filter={filter}
            />
        )
    }
    if (propertyType.filterValueType === 'date') {
        if (filter.condition === 'isSet' || filter.condition === 'isNotSet') {
            return null
        }

        return (
            <DateFilter
                view={view}
                filter={filter}
            />
        )
    }

    let displayValue: string
    if (filter.values.length > 0) {
        displayValue = filter.values.map((id) => {
            const option = template?.options.find((o) => o.id === id)
            return option?.value || '(Unknown)'
        }).join(', ')
    } else {
        displayValue = intl.formatMessage({id: 'FilterValue.empty', defaultMessage: '(empty)'})
    }

    return (
        <MenuWrapper className='filterValue'>
            <Button>{displayValue}</Button>

            <Menu>
                {template?.options.map((o) => (
                    <Menu.Switch
                        key={o.id}
                        id={o.id}
                        name={o.value}
                        isOn={filter.values.includes(o.id)}
                        suppressItemClicked={true}
                        onClick={(optionId) => {
                            const filterIndex = view.fields.filter.filters.indexOf(filter)
                            Utils.assert(filterIndex >= 0, "Can't find filter")

                            const filterGroup = createFilterGroup(view.fields.filter)
                            const newFilter = filterGroup.filters[filterIndex] as FilterClause
                            Utils.assert(newFilter, `No filter at index ${filterIndex}`)
                            if (filter.values.includes(o.id)) {
                                newFilter.values = newFilter.values.filter((id) => id !== optionId)
                                mutator.changeViewFilter(view.boardId, view.id, view.fields.filter, filterGroup)
                            } else {
                                newFilter.values.push(optionId)
                                mutator.changeViewFilter(view.boardId, view.id, view.fields.filter, filterGroup)
                            }
                        }}
                    />
                ))}
            </Menu>
        </MenuWrapper>
    )
}

export default filterValue
