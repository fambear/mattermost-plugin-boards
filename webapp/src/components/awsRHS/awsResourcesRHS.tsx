// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {octoClient} from '../../octoClient';
import {ResourceGroup, CostData} from '../../blocks/aws';
import ResourceSection from './resourceSection';
import CostSection from './costSection';

const AWSResourcesRHS: React.FC = () => {
	const intl = useIntl();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [resources, setResources] = useState<ResourceGroup[]>([]);
	const [costs, setCosts] = useState<CostData[]>([]);

	useEffect(() => {
		loadData();
	}, []);

	const loadData = async () => {
		setLoading(true);
		setError(null);
		try {
			const [resourcesData, costsData] = await Promise.all([
				octoClient.getAWSResources(),
				octoClient.getAWSCosts(),
			]);
			setResources(resourcesData);
			setCosts(costsData);
		} catch (err) {
			setError(intl.formatMessage({
				id: 'AWSExplorer.error.loadFailed',
				defaultMessage: 'Failed to load AWS data. Please check your credentials.',
			}));
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className='aws-resources-rhs'>
				<div className='loading-spinner'>
					{intl.formatMessage({
						id: 'AWSExplorer.loading',
						defaultMessage: 'Loading AWS data...',
					})}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='aws-resources-rhs'>
				<div className='error-message'>
					<p>{error}</p>
					<button onClick={loadData}>
						{intl.formatMessage({
							id: 'AWSExplorer.retry',
							defaultMessage: 'Retry',
						})}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className='aws-resources-rhs'>
			<ResourceSection resources={resources} />
			<CostSection costs={costs} />
		</div>
	);
};

export default AWSResourcesRHS;
