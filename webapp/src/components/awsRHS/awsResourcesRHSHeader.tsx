// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

const AWSResourcesRHSHeader: React.FC = () => {
	const intl = useIntl();

	return (
		<div className='aws-rhs-header'>
			<div className='aws-rhs-header-title'>
				{intl.formatMessage({
					id: 'AWSExplorer.title',
					defaultMessage: 'AWS Explorer',
				})}
			</div>
		</div>
	);
};

export default AWSResourcesRHSHeader;
