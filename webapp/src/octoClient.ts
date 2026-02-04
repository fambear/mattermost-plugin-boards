// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ResourceGroup, CostData} from './blocks/aws';

class OctoClient {
	private getBaseURL(): string {
		return window.basename?.replace(/\/$/, '') || '';
	}

	private headers(): Record<string, string> {
		return {
			'Content-Type': 'application/json',
		};
	}

	private async getJson<T>(response: Response, defaultValue: T): Promise<T> {
		try {
			const value = await response.json();
			return value || defaultValue;
		} catch {
			return defaultValue;
		}
	}

	async getAWSResources(): Promise<ResourceGroup[]> {
		const path = '/aws/resources';
		const response = await fetch(this.getBaseURL() + path, {
			method: 'GET',
			headers: this.headers(),
		});

		if (response.status !== 200) {
			return [];
		}

		return await this.getJson(response, []);
	}

	async getAWSCosts(): Promise<CostData[]> {
		const path = '/aws/costs';
		const response = await fetch(this.getBaseURL() + path, {
			method: 'GET',
			headers: this.headers(),
		});

		if (response.status !== 200) {
			return [];
		}

		return await this.getJson(response, []);
	}
}

export const octoClient = new OctoClient();
