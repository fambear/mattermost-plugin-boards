// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useCallback, useMemo} from 'react'
import {useIntl} from 'react-intl'
import {DateUtils} from 'react-day-picker'
import DayPicker from 'react-day-picker/DayPicker'
import MomentLocaleUtils from 'react-day-picker/moment'
import moment from 'moment'

import Button from '../../widgets/buttons/button'
import Modal from '../../components/modal'
import ModalWrapper from '../../components/modalWrapper'
import {Utils} from '../../utils'

import 'react-day-picker/lib/style.css'
import './quickActionDatePicker.scss'

type Props = {
    value: string  // timestamp, '{now}', or empty
    onChange: (value: string) => void
    includeTime?: boolean
}

const loadedLocales: Record<string, moment.Locale> = {}

const QuickActionDatePicker = (props: Props): JSX.Element => {
    const {value, onChange, includeTime = true} = props
    const intl = useIntl()
    const [showDialog, setShowDialog] = useState(false)

    // Parse value
    const isNowVariable = value === '{now}'
    const timestamp = !isNowVariable && value ? parseInt(value, 10) : undefined
    const dateValue = timestamp ? new Date(timestamp) : undefined

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(dateValue)
    const [hours, setHours] = useState<string>(dateValue ? dateValue.getHours().toString().padStart(2, '0') : '12')
    const [minutes, setMinutes] = useState<string>(dateValue ? dateValue.getMinutes().toString().padStart(2, '0') : '00')

    const locale = intl.locale.toLowerCase()
    if (locale && locale !== 'en' && !loadedLocales[locale]) {
        // eslint-disable-next-line global-require
        loadedLocales[locale] = require(`moment/locale/${locale}`)
    }

    const displayValue = useMemo(() => {
        if (isNowVariable) {
            return intl.formatMessage({id: 'QuickActionDatePicker.now', defaultMessage: '{now} (current time)'})
        }
        if (dateValue) {
            if (includeTime) {
                return Utils.displayDateTime(dateValue, intl)
            }
            return Utils.displayDate(dateValue, intl)
        }
        return intl.formatMessage({id: 'QuickActionDatePicker.select', defaultMessage: 'Select date...'})
    }, [isNowVariable, dateValue, includeTime, intl])

    const handleDayClick = useCallback((day: Date) => {
        setSelectedDate(day)
    }, [])

    const handleSetNow = useCallback(() => {
        onChange('{now}')
        setShowDialog(false)
    }, [onChange])

    const handleClear = useCallback(() => {
        onChange('')
        setSelectedDate(undefined)
        setShowDialog(false)
    }, [onChange])

    const handleSave = useCallback(() => {
        if (selectedDate) {
            const date = new Date(selectedDate)
            if (includeTime) {
                date.setHours(parseInt(hours, 10) || 0)
                date.setMinutes(parseInt(minutes, 10) || 0)
                date.setSeconds(0)
                date.setMilliseconds(0)
            }
            onChange(date.getTime().toString())
        }
        setShowDialog(false)
    }, [selectedDate, hours, minutes, includeTime, onChange])

    return (
        <div className='QuickActionDatePicker'>
            <Button
                className='QuickActionDatePicker__button'
                onClick={() => setShowDialog(true)}
            >
                {displayValue}
            </Button>

            {showDialog && (
                <ModalWrapper>
                    <Modal
                        onClose={() => setShowDialog(false)}
                    >
                        <div className='QuickActionDatePicker__modal'>
                            <div className='QuickActionDatePicker__header'>
                                <Button
                                    emphasis='secondary'
                                    onClick={handleSetNow}
                                >
                                    {intl.formatMessage({id: 'QuickActionDatePicker.useNow', defaultMessage: 'Use {now}'})}
                                </Button>
                                <Button
                                    emphasis='tertiary'
                                    onClick={handleClear}
                                >
                                    {intl.formatMessage({id: 'QuickActionDatePicker.clear', defaultMessage: 'Clear'})}
                                </Button>
                            </div>

                            <DayPicker
                                onDayClick={handleDayClick}
                                selectedDays={selectedDate}
                                locale={locale}
                                localeUtils={MomentLocaleUtils}
                            />

                            {includeTime && (
                                <div className='QuickActionDatePicker__time'>
                                    <label>
                                        {intl.formatMessage({id: 'QuickActionDatePicker.time', defaultMessage: 'Time:'})}
                                    </label>
                                    <input
                                        type='number'
                                        min='0'
                                        max='23'
                                        value={hours}
                                        onChange={(e) => setHours(e.target.value)}
                                        className='QuickActionDatePicker__time-input'
                                    />
                                    <span>:</span>
                                    <input
                                        type='number'
                                        min='0'
                                        max='59'
                                        value={minutes}
                                        onChange={(e) => setMinutes(e.target.value)}
                                        className='QuickActionDatePicker__time-input'
                                    />
                                </div>
                            )}

                            <div className='QuickActionDatePicker__footer'>
                                <Button
                                    emphasis='primary'
                                    onClick={handleSave}
                                    disabled={!selectedDate}
                                >
                                    {intl.formatMessage({id: 'QuickActionDatePicker.save', defaultMessage: 'Save'})}
                                </Button>
                                <Button
                                    emphasis='tertiary'
                                    onClick={() => setShowDialog(false)}
                                >
                                    {intl.formatMessage({id: 'QuickActionDatePicker.cancel', defaultMessage: 'Cancel'})}
                                </Button>
                            </div>
                        </div>
                    </Modal>
                </ModalWrapper>
            )}
        </div>
    )
}

export default QuickActionDatePicker
