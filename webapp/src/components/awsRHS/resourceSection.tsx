// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {ResourceGroup} from '../../blocks/aws';

interface Props {
	resources: ResourceGroup[];
}

const ResourceSection: React.FC<Props> = ({resources}) => {
	const intl = useIntl();

	const getServiceIcon = (service: string): string => {
		const icons: Record<string, string> = {
			EC2: '',
			S3: '',
			Lambda: 'λ',
			RDS: '',
			EFS: '',
			ELB: '⚖️',
			ECS: '',
		};
		return icons[service] || '📦';
	};

	if (resources.length === 0) {
		return (
			<div className='resource-section'>
				<h3>
					{intl.formatMessage({
						id: 'AWSExplorer.resources',
						defaultMessage: 'Resources',
					})}
				</h3>
				<p className='empty-state'>
					{intl.formatMessage({
						id: 'AWSExplorer.noResources',
						defaultMessage: 'No resources found',
					})}
				</p>
			</div>
		);
	}

	return (
		<div className='resource-section'>
			<h3>
				{intl.formatMessage({
					id: 'AWSExplorer.resources',
					defaultMessage: 'Resources',
				})}
			</h3>
			{resources.map((group) => (
				<div key={group.service} className='service-group'>
					<div className='service-header'>
						<span className='service-icon'>{getServiceIcon(group.service)}</span>
						<span className='service-name'>{group.service}</span>
						<span className='service-count'>{group.count}</span>
					</div>
					<div className='resource-list'>
						{group.resources.map((resource) => (
							<div key={resource.id} className='resource-item'>
								<span className='resource-id'>{resource.id}</span>
								<span className='resource-type'>{resource.type}</span>
								{resource.state && (
									<span className={`resource-state state-${resource.state.toLowerCase()}`}>
										{resource.state}
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
};

export default ResourceSection;
