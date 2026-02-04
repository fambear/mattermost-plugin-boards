// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

interface Props {
	service: string;
	amount: number;
	delta: number;
	deltaType: 'increase' | 'decrease' | 'neutral';
}

const CostCard: React.FC<Props> = ({service, amount, delta, deltaType}) => {
	const intl = useIntl();

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat(intl.locale, {
			style: 'currency',
			currency: 'USD',
		}).format(value);
	};

	const renderDelta = () => {
		if (deltaType === 'neutral') {
			return null;
		}

		const colorClass = deltaType === 'decrease' ? 'cost-delta-green' : 'cost-delta-red';
		const icon = deltaType === 'decrease' ? '' : '';

		return (
			<span className={`cost-delta ${colorClass}`}>
				{icon} {delta.toFixed(1)}%
			</span>
		);
	};

	return (
		<div className='cost-card'>
			<div className='cost-service'>{service}</div>
			<div className='cost-amount'>{formatCurrency(amount)}</div>
			{renderDelta()}
		</div>
	);
};

export default CostCard;
