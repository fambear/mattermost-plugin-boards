// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PluginRegistry} from './types/mattermost-webapp';

import AWSResourcesRHS from './components/awsRHS/awsResourcesRHS';
import AWSResourcesRHSHeader from './components/awsRHS/awsResourcesRHSHeader';

class Plugin {
	registry: PluginRegistry;
	rhsId: string = '';
	toggleRHSPlugin?: () => void;

	constructor(registry: PluginRegistry) {
		this.registry = registry;
	}

	initialize() {
		if (this.registry.registerRightHandSidebarComponent) {
			const registered = this.registry.registerRightHandSidebarComponent(
				AWSResourcesRHS,
				AWSResourcesRHSHeader,
			);
			this.rhsId = registered.rhsId;
			this.toggleRHSPlugin = registered.toggleRHSPlugin;
		}

		if (this.registry.registerAppBarComponent) {
			this.registry.registerAppBarComponent(
				'/plugins/aws-explorer/assets/aws-icon.png',
				() => {
					this.toggleRHSPlugin?.();
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
