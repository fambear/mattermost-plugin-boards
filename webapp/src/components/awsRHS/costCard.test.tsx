// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render} from '@testing-library/react';
import {screen} from '@testing-library/dom';
import CostCard from './costCard';

// Mock react-intl
jest.mock('react-intl', () => ({
    useIntl: () => ({
        formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
        locale: 'en-US',
    }),
}));

describe('CostCard', () => {
    it('renders cost card with increase', () => {
        render(
            <CostCard
                service='EC2'
                amount={150.50}
                delta={25.5}
                deltaType='increase'
            />
        );

        expect(screen.getByText('EC2')).toBeInTheDocument();
        expect(screen.getByText(/\$150\.50/)).toBeInTheDocument();
        expect(screen.getByText(/25\.5%/)).toBeInTheDocument();
    });

    it('renders cost card with decrease', () => {
        render(
            <CostCard
                service='S3'
                amount={80.25}
                delta={15.3}
                deltaType='decrease'
            />
        );

        expect(screen.getByText('S3')).toBeInTheDocument();
        expect(screen.getByText(/\$80\.25/)).toBeInTheDocument();
        expect(screen.getByText(/15\.3%/)).toBeInTheDocument();
    });

    it('renders cost card with neutral delta', () => {
        render(
            <CostCard
                service='Lambda'
                amount={50.0}
                delta={0}
                deltaType='neutral'
            />
        );

        expect(screen.getByText('Lambda')).toBeInTheDocument();
        expect(screen.getByText(/\$50\.00/)).toBeInTheDocument();
        // Delta should not be rendered for neutral
        expect(screen.queryByText(/0\.0%/)).not.toBeInTheDocument();
    });

    it('formats currency correctly for large amounts', () => {
        render(
            <CostCard
                service='RDS'
                amount={1234.56}
                delta={10}
                deltaType='increase'
            />
        );

        expect(screen.getByText(/\$1,234\.56/)).toBeInTheDocument();
    });

    it('formats currency correctly for small amounts', () => {
        render(
            <CostCard
                service='CloudWatch'
                amount={0.99}
                delta={5}
                deltaType='decrease'
            />
        );

        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
    });

    it('renders zero cost', () => {
        render(
            <CostCard
                service='ECS'
                amount={0}
                delta={0}
                deltaType='neutral'
            />
        );

        expect(screen.getByText(/\$0\.00/)).toBeInTheDocument();
    });

    it('applies correct CSS class for increase', () => {
        const {container} = render(
            <CostCard
                service='EC2'
                amount={100}
                delta={20}
                deltaType='increase'
            />
        );

        const deltaElement = container.querySelector('.cost-delta-red');
        expect(deltaElement).toBeInTheDocument();
    });

    it('applies correct CSS class for decrease', () => {
        const {container} = render(
            <CostCard
                service='S3'
                amount={100}
                delta={20}
                deltaType='decrease'
            />
        );

        const deltaElement = container.querySelector('.cost-delta-green');
        expect(deltaElement).toBeInTheDocument();
    });

    it('renders delta with one decimal place', () => {
        render(
            <CostCard
                service='EC2'
                amount={100}
                delta={25.67}
                deltaType='increase'
            />
        );

        expect(screen.getByText(/25\.7%/)).toBeInTheDocument();
    });

    it('renders very large delta percentage', () => {
        render(
            <CostCard
                service='CloudFront'
                amount={500}
                delta={300}
                deltaType='increase'
            />
        );

        expect(screen.getByText(/300\.0%/)).toBeInTheDocument();
    });
});
