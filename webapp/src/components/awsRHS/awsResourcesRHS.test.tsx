// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render} from '@testing-library/react';
import {screen, waitFor} from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import AWSResourcesRHS from './awsResourcesRHS';
import {ResourceGroup, CostData} from '../../blocks/aws';

// Mock react-intl
jest.mock('react-intl', () => ({
    useIntl: () => ({
        formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
        locale: 'en-US',
    }),
}));

// Mock octoClient
jest.mock('../../octoClient', () => ({
    octoClient: {
        getAWSResources: jest.fn(),
        getAWSCosts: jest.fn(),
    },
}));

// Mock sub-components
jest.mock('./resourceSection', () => {
    return function ResourceSection({resources}: {resources: ResourceGroup[]}) {
        return (
            <div data-testid='resource-section'>
                Resources: {resources.length} groups
            </div>
        );
    };
});

jest.mock('./costSection', () => {
    return function CostSection({costs}: {costs: CostData[]}) {
        return (
            <div data-testid='cost-section'>
                Costs: {costs.length} services
            </div>
        );
    };
});

import {octoClient} from '../../octoClient';

const mockGetAWSResources = octoClient.getAWSResources as jest.MockedFunction<typeof octoClient.getAWSResources>;
const mockGetAWSCosts = octoClient.getAWSCosts as jest.MockedFunction<typeof octoClient.getAWSCosts>;

describe('AWSResourcesRHS', () => {
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
            ],
        },
    ];

    const mockCosts: CostData[] = [
        {
            service: 'EC2',
            amount: 150.50,
            delta: 25.5,
            deltaType: 'increase',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        mockGetAWSResources.mockImplementation(() => new Promise(() => {}));
        mockGetAWSCosts.mockImplementation(() => new Promise(() => {}));

        render(<AWSResourcesRHS />);

        expect(screen.getByText('Loading AWS data...')).toBeInTheDocument();
    });

    it('renders data after successful load', async () => {
        mockGetAWSResources.mockResolvedValue(mockResources);
        mockGetAWSCosts.mockResolvedValue(mockCosts);

        render(<AWSResourcesRHS />);

        await waitFor(() => {
            expect(screen.getByTestId('resource-section')).toBeInTheDocument();
            expect(screen.getByTestId('cost-section')).toBeInTheDocument();
        });

        expect(mockGetAWSResources).toHaveBeenCalledTimes(1);
        expect(mockGetAWSCosts).toHaveBeenCalledTimes(1);
    });

    it('renders error state on load failure', async () => {
        mockGetAWSResources.mockRejectedValue(new Error('Network error'));
        mockGetAWSCosts.mockRejectedValue(new Error('Network error'));

        render(<AWSResourcesRHS />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load AWS data. Please check your credentials.')).toBeInTheDocument();
        });
    });

    it('renders retry button on error', async () => {
        mockGetAWSResources.mockRejectedValue(new Error('Network error'));
        mockGetAWSCosts.mockRejectedValue(new Error('Network error'));

        render(<AWSResourcesRHS />);

        await waitFor(() => {
            expect(screen.getByText('Retry')).toBeInTheDocument();
        });
    });

    it('retries data load on retry button click', async () => {
        const user = userEvent.setup();

        mockGetAWSResources.mockRejectedValueOnce(new Error('Network error'));
        mockGetAWSCosts.mockRejectedValueOnce(new Error('Network error'));

        render(<AWSResourcesRHS />);

        await waitFor(() => {
            expect(screen.getByText('Retry')).toBeInTheDocument();
        });

        mockGetAWSResources.mockResolvedValueOnce(mockResources);
        mockGetAWSCosts.mockResolvedValueOnce(mockCosts);

        await user.click(screen.getByText('Retry'));

        await waitFor(() => {
            expect(screen.getByTestId('resource-section')).toBeInTheDocument();
        });

        expect(mockGetAWSResources).toHaveBeenCalledTimes(2);
        expect(mockGetAWSCosts).toHaveBeenCalledTimes(2);
    });

    it('handles empty data gracefully', async () => {
        mockGetAWSResources.mockResolvedValue([]);
        mockGetAWSCosts.mockResolvedValue([]);

        render(<AWSResourcesRHS />);

        await waitFor(() => {
            expect(screen.getByTestId('resource-section')).toBeInTheDocument();
            expect(screen.getByTestId('cost-section')).toBeInTheDocument();
        });
    });

    it('loads data on mount', async () => {
        mockGetAWSResources.mockResolvedValue(mockResources);
        mockGetAWSCosts.mockResolvedValue(mockCosts);

        render(<AWSResourcesRHS />);

        expect(mockGetAWSResources).toHaveBeenCalledTimes(1);
        expect(mockGetAWSCosts).toHaveBeenCalledTimes(1);
    });

    it('displays correct counts', async () => {
        mockGetAWSResources.mockResolvedValue(mockResources);
        mockGetAWSCosts.mockResolvedValue(mockCosts);

        render(<AWSResourcesRHS />);

        await waitFor(() => {
            expect(screen.getByText('Resources: 1 groups')).toBeInTheDocument();
            expect(screen.getByText('Costs: 1 services')).toBeInTheDocument();
        });
    });

    it('handles partial API failures', async () => {
        mockGetAWSResources.mockResolvedValue(mockResources);
        mockGetAWSCosts.mockRejectedValue(new Error('Cost API failed'));

        render(<AWSResourcesRHS />);

        await waitFor(() => {
            expect(screen.getByText('Failed to load AWS data. Please check your credentials.')).toBeInTheDocument();
        });
    });
});
