// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PluginRegistry} from './types/mattermost-webapp';

import AWSResourcesRHS from './components/awsRHS/awsResourcesRHS';
import AWSResourcesRHSHeader from './components/awsRHS/awsResourcesRHSHeader';

class Plugin {
	registry: PluginRegistry;
	rhsId: string;

	constructor(registry: PluginRegistry) {
		this.registry = registry;
	}

	initialize() {
		if (this.registry.registerRightHandSidebarComponent) {
			const {rhsId} = this.registry.registerRightHandSidebarComponent(
				AWSResourcesRHS,
				AWSResourcesRHSHeader,
			);
			this.rhsId = rhsId;
		}

		if (this.registry.registerAppBarComponent) {
			this.registry.registerAppBarComponent(
				'/plugins/aws-explorer/assets/aws-icon.png',
				() => {
					this.rhsId && this.registry.toggleRHSPlugin(this.rhsId);
				},
				'AWS Explorer',
			);
		}
	}
}

declare global {
	interface Window {
		registerPlugin?: (id: string, plugin: unknown) => void;
	}
}

window.registerPlugin?.('aws-explorer', {
	initialize: (registry: PluginRegistry) => {
		const plugin = new Plugin(registry);
		plugin.initialize();
	},
});

export {};
