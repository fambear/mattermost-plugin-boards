// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {CostData} from '../../blocks/aws';
import CostCard from './costCard';

interface Props {
	costs: CostData[];
}

const CostSection: React.FC<Props> = ({costs}) => {
	const intl = useIntl();

	if (costs.length === 0) {
		return (
			<div className='cost-section'>
				<h3>
					{intl.formatMessage({
						id: 'AWSExplorer.costs',
						defaultMessage: 'Costs',
					})}
				</h3>
				<p className='empty-state'>
					{intl.formatMessage({
						id: 'AWSExplorer.noCosts',
						defaultMessage: 'No cost data available',
					})}
				</p>
			</div>
		);
	}

	return (
		<div className='cost-section'>
			<h3>
				{intl.formatMessage({
					id: 'AWSExplorer.costs.lastMonth',
					defaultMessage: 'Last Month Costs',
				})}
			</h3>
			<div className='cost-card-list'>
				{costs.map((cost) => (
					<CostCard
						key={cost.service}
						service={cost.service}
						amount={cost.amount}
						delta={cost.delta}
						deltaType={cost.deltaType}
					/>
				))}
			</div>
		</div>
	);
};

export default CostSection;
