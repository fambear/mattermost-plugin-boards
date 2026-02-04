export interface PluginRegistry {
	registerRightHandSidebarComponent?: (
		component: React.FC,
		headerComponent: React.FC,
	) => {rhsId: string; toggleRHSPlugin: () => void};

	registerAppBarComponent?: (
		icon: string,
		action: () => void,
		tooltipText: string,
	) => void;
}
