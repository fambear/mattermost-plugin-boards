export interface ResourceGroup {
	service: string;
	count: number;
	resources: Resource[];
}

export interface Resource {
	id: string;
	type: string;
	state?: string;
	details?: Record<string, any>;
}

export interface CostData {
	service: string;
	amount: number;
	delta: number;
	deltaType: 'increase' | 'decrease' | 'neutral';
}
