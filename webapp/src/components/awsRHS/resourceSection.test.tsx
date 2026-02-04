// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render} from '@testing-library/react';
import {screen} from '@testing-library/dom';
import ResourceSection from './resourceSection';
import {ResourceGroup} from '../../blocks/aws';

// Mock react-intl
jest.mock('react-intl', () => ({
    useIntl: () => ({
        formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
    }),
}));

describe('ResourceSection', () => {
    const mockResources: ResourceGroup[] = [
        {
            service: 'EC2',
            count: 2,
            resources: [
                {
                    id: 'i-1234567890abcdef0',
                    type: 't2.micro',
                    state: 'running',
                },
                {
                    id: 'i-0987654321fedcba0',
                    type: 't3.small',
                    state: 'stopped',
                },
            ],
        },
        {
            service: 'S3',
            count: 3,
            resources: [
                {
                    id: 'my-bucket-1',
                    type: 'Bucket',
                },
                {
                    id: 'my-bucket-2',
                    type: 'Bucket',
                },
                {
                    id: 'my-bucket-3',
                    type: 'Bucket',
                },
            ],
        },
    ];

    it('renders resource section with resources', () => {
        render(<ResourceSection resources={mockResources} />);

        expect(screen.getByText('Resources')).toBeInTheDocument();
        expect(screen.getByText('EC2')).toBeInTheDocument();
        expect(screen.getByText('S3')).toBeInTheDocument();
    });

    it('renders empty state when no resources', () => {
        render(<ResourceSection resources={[]} />);

        expect(screen.getByText('Resources')).toBeInTheDocument();
        expect(screen.getByText('No resources found')).toBeInTheDocument();
    });

    it('displays service count', () => {
        render(<ResourceSection resources={mockResources} />);

        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders resource IDs', () => {
        render(<ResourceSection resources={mockResources} />);

        expect(screen.getByText('i-1234567890abcdef0')).toBeInTheDocument();
        expect(screen.getByText('i-0987654321fedcba0')).toBeInTheDocument();
        expect(screen.getByText('my-bucket-1')).toBeInTheDocument();
    });

    it('renders resource types', () => {
        render(<ResourceSection resources={mockResources} />);

        expect(screen.getByText('t2.micro')).toBeInTheDocument();
        expect(screen.getByText('t3.small')).toBeInTheDocument();
        expect(screen.getByText('Bucket')).toBeInTheDocument();
    });

    it('renders resource states when available', () => {
        render(<ResourceSection resources={mockResources} />);

        expect(screen.getByText('running')).toBeInTheDocument();
        expect(screen.getByText('stopped')).toBeInTheDocument();
    });

    it('does not render state for resources without state', () => {
        render(<ResourceSection resources={mockResources} />);

        // S3 buckets don't have state
        const bucketElements = screen.getAllByText('Bucket');
        expect(bucketElements).toHaveLength(3);
    });

    it('renders service icons', () => {
        const {container} = render(<ResourceSection resources={mockResources} />);

        const serviceIcons = container.querySelectorAll('.service-icon');
        expect(serviceIcons.length).toBeGreaterThan(0);
    });

    it('renders resources with details', () => {
        const resourcesWithDetails: ResourceGroup[] = [
            {
                service: 'Lambda',
                count: 1,
                resources: [
                    {
                        id: 'my-function',
                        type: 'python3.9',
                        state: 'Active',
                        details: {
                            memory: '256MB',
                            timeout: '30s',
                        },
                    },
                ],
            },
        ];

        render(<ResourceSection resources={resourcesWithDetails} />);

        expect(screen.getByText('my-function')).toBeInTheDocument();
        expect(screen.getByText('python3.9')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders multiple resource groups', () => {
        const {container} = render(<ResourceSection resources={mockResources} />);

        const serviceGroups = container.querySelectorAll('.service-group');
        expect(serviceGroups).toHaveLength(2);
    });

    it('renders resources in correct order', () => {
        const {container} = render(<ResourceSection resources={mockResources} />);

        const resourceLists = container.querySelectorAll('.resource-list');
        expect(resourceLists.length).toBeGreaterThan(0);
    });
});
