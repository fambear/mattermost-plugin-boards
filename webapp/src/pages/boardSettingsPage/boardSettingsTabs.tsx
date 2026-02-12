// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {FormattedMessage} from 'react-intl'

import './boardSettingsTabs.scss'

export type TabType = 'general' | 'views' | 'properties' | 'status' | 'quickActions'

type Tab = {
    id: TabType
    labelId: string
    defaultLabel: string
}

type Props = {
    activeTab: TabType
    onTabChange: (tabId: TabType) => void
}

const BoardSettingsTabs = ({activeTab, onTabChange}: Props): JSX.Element => {
    const tabs: Tab[] = [
        {id: 'general', labelId: 'BoardSettings.general-section', defaultLabel: 'General'},
        {id: 'views', labelId: 'BoardSettings.views-section', defaultLabel: 'Views Management'},
        {id: 'properties', labelId: 'BoardSettings.properties-section', defaultLabel: 'Card Properties and Options'},
        {id: 'status', labelId: 'BoardSettings.status-transition-section', defaultLabel: 'Status Transition Rules'},
        {id: 'quickActions', labelId: 'BoardSettings.quick-actions-section', defaultLabel: 'Quick Actions'},
    ]

    return (
        <div className='BoardSettingsTabs'>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    className={`BoardSettingsTabs__tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    <FormattedMessage id={tab.labelId} defaultMessage={tab.defaultLabel} />
                </button>
            ))}
        </div>
    )
}

export default React.memo(BoardSettingsTabs)
