// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render} from '@testing-library/react';
import {screen} from '@testing-library/dom';
import CostSection from './costSection';
import {CostData} from '../../blocks/aws';

// Mock react-intl
jest.mock('react-intl', () => ({
    useIntl: () => ({
        formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
    }),
}));

// Mock CostCard component
jest.mock('./costCard', () => {
    return function CostCard(props: {service: string; amount: number; delta: number; deltaType: string}) {
        return (
            <div data-testid={`cost-card-${props.service}`}>
                {props.service}: ${props.amount} ({props.deltaType})
            </div>
        );
    };
});

describe('CostSection', () => {
    const mockCosts: CostData[] = [
        {
            service: 'EC2',
            amount: 150.50,
            delta: 25.5,
            deltaType: 'increase',
        },
        {
            service: 'S3',
            amount: 80.25,
            delta: 15.3,
            deltaType: 'decrease',
        },
        {
            service: 'Lambda',
            amount: 50.0,
            delta: 0,
            deltaType: 'neutral',
        },
    ];

    it('renders cost section with costs', () => {
        render(<CostSection costs={mockCosts} />);

        expect(screen.getByText('Last Month Costs')).toBeInTheDocument();
        expect(screen.getByTestId('cost-card-EC2')).toBeInTheDocument();
        expect(screen.getByTestId('cost-card-S3')).toBeInTheDocument();
        expect(screen.getByTestId('cost-card-Lambda')).toBeInTheDocument();
    });

    it('renders empty state when no costs', () => {
        render(<CostSection costs={[]} />);

        expect(screen.getByText('Costs')).toBeInTheDocument();
        expect(screen.getByText('No cost data available')).toBeInTheDocument();
    });

    it('renders all cost cards', () => {
        render(<CostSection costs={mockCosts} />);

        const costCards = screen.getAllByTestId(/cost-card-/);
        expect(costCards).toHaveLength(3);
    });

    it('renders cost section with single cost', () => {
        const singleCost: CostData[] = [
            {
                service: 'RDS',
                amount: 200.75,
                delta: 10.0,
                deltaType: 'increase',
            },
        ];

        render(<CostSection costs={singleCost} />);

        expect(screen.getByTestId('cost-card-RDS')).toBeInTheDocument();
    });

    it('renders cost section with many services', () => {
        const manyCosts: CostData[] = Array.from({length: 10}, (_, i) => ({
            service: `Service-${i}`,
            amount: i * 10,
            delta: i * 5,
            deltaType: i % 2 === 0 ? 'increase' : 'decrease',
        }));

        render(<CostSection costs={manyCosts} />);

        const costCards = screen.getAllByTestId(/cost-card-/);
        expect(costCards).toHaveLength(10);
    });
});
