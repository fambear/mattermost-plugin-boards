// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ResourceGroup, Resource, CostData} from './aws';

describe('AWS Type Definitions', () => {
    describe('Resource', () => {
        it('creates valid resource with all fields', () => {
            const resource: Resource = {
                id: 'i-1234567890abcdef0',
                type: 't2.micro',
                state: 'running',
                details: {
                    availability_zone: 'us-east-1a',
                    private_ip: '10.0.0.1',
                },
            };

            expect(resource.id).toBe('i-1234567890abcdef0');
            expect(resource.type).toBe('t2.micro');
            expect(resource.state).toBe('running');
            expect(resource.details?.availability_zone).toBe('us-east-1a');
        });

        it('creates resource without optional fields', () => {
            const resource: Resource = {
                id: 'my-bucket',
                type: 'Bucket',
            };

            expect(resource.id).toBe('my-bucket');
            expect(resource.type).toBe('Bucket');
            expect(resource.state).toBeUndefined();
            expect(resource.details).toBeUndefined();
        });

        it('allows empty details', () => {
            const resource: Resource = {
                id: 'test-resource',
                type: 'test-type',
                details: {},
            };

            expect(resource.details).toEqual({});
        });

        it('allows complex detail values', () => {
            const resource: Resource = {
                id: 'complex-resource',
                type: 'complex',
                details: {
                    string: 'value',
                    number: 123,
                    boolean: true,
                    nested: {
                        key: 'value',
                    },
                },
            };

            expect(resource.details?.string).toBe('value');
            expect(resource.details?.number).toBe(123);
            expect(resource.details?.boolean).toBe(true);
            expect(resource.details?.nested?.key).toBe('value');
        });
    });

    describe('ResourceGroup', () => {
        it('creates valid resource group', () => {
            const resourceGroup: ResourceGroup = {
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
            };

            expect(resourceGroup.service).toBe('EC2');
            expect(resourceGroup.count).toBe(2);
            expect(resourceGroup.resources).toHaveLength(2);
        });

        it('creates empty resource group', () => {
            const resourceGroup: ResourceGroup = {
                service: 'S3',
                count: 0,
                resources: [],
            };

            expect(resourceGroup.service).toBe('S3');
            expect(resourceGroup.count).toBe(0);
            expect(resourceGroup.resources).toHaveLength(0);
        });

        it('handles resources with mixed optional fields', () => {
            const resourceGroup: ResourceGroup = {
                service: 'Lambda',
                count: 2,
                resources: [
                    {
                        id: 'function-1',
                        type: 'python3.9',
                        state: 'Active',
                        details: {memory: '256MB'},
                    },
                    {
                        id: 'function-2',
                        type: 'nodejs18.x',
                    },
                ],
            };

            expect(resourceGroup.resources[0].state).toBe('Active');
            expect(resourceGroup.resources[1].state).toBeUndefined();
        });
    });

    describe('CostData', () => {
        it('creates valid cost data with increase', () => {
            const costData: CostData = {
                service: 'EC2',
                amount: 150.50,
                delta: 25.5,
                deltaType: 'increase',
            };

            expect(costData.service).toBe('EC2');
            expect(costData.amount).toBe(150.50);
            expect(costData.delta).toBe(25.5);
            expect(costData.deltaType).toBe('increase');
        });

        it('creates valid cost data with decrease', () => {
            const costData: CostData = {
                service: 'S3',
                amount: 80.25,
                delta: 15.3,
                deltaType: 'decrease',
            };

            expect(costData.deltaType).toBe('decrease');
        });

        it('creates valid cost data with neutral delta', () => {
            const costData: CostData = {
                service: 'Lambda',
                amount: 50.0,
                delta: 0,
                deltaType: 'neutral',
            };

            expect(costData.deltaType).toBe('neutral');
        });

        it('handles zero cost', () => {
            const costData: CostData = {
                service: 'ECS',
                amount: 0,
                delta: 0,
                deltaType: 'neutral',
            };

            expect(costData.amount).toBe(0);
        });

        it('handles large delta values', () => {
            const costData: CostData = {
                service: 'CloudFront',
                amount: 500,
                delta: 300,
                deltaType: 'increase',
            };

            expect(costData.delta).toBe(300);
        });

        it('only allows valid delta types', () => {
            const validTypes: Array<'increase' | 'decrease' | 'neutral'> = ['increase', 'decrease', 'neutral'];

            validTypes.forEach((deltaType) => {
                const costData: CostData = {
                    service: 'Test',
                    amount: 100,
                    delta: 10,
                    deltaType,
                };

                expect(costData.deltaType).toBe(deltaType);
            });
        });

        it('handles floating point precision', () => {
            const costData: CostData = {
                service: 'RDS',
                amount: 123.456789,
                delta: 12.345678,
                deltaType: 'increase',
            };

            expect(costData.amount).toBeCloseTo(123.456789, 6);
            expect(costData.delta).toBeCloseTo(12.345678, 6);
        });
    });

    describe('Type Compatibility', () => {
        it('allows ResourceGroup with Resource arrays', () => {
            const resources: Resource[] = [
                {id: '1', type: 'A'},
                {id: '2', type: 'B', state: 'active'},
            ];

            const group: ResourceGroup = {
                service: 'Test',
                count: resources.length,
                resources,
            };

            expect(group.resources).toEqual(resources);
        });

        it('allows CostData arrays', () => {
            const costs: CostData[] = [
                {
                    service: 'EC2',
                    amount: 100,
                    delta: 10,
                    deltaType: 'increase',
                },
                {
                    service: 'S3',
                    amount: 50,
                    delta: 5,
                    deltaType: 'decrease',
                },
            ];

            expect(costs).toHaveLength(2);
            expect(costs[0].service).toBe('EC2');
            expect(costs[1].service).toBe('S3');
        });
    });
});
