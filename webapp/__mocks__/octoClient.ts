// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Manual mock for octoClient to work with @swc/jest transformer
// The @swc/jest transformer doesn't properly hoist jest.mock() calls,
// so we use this manual mock which Jest will automatically pick up.

type OctoClientMock = {
    getFileAsDataUrl: jest.Mock
    getFileInfo: jest.Mock
    uploadFile: jest.Mock
    uploadAttachment: jest.Mock
    getFileUrl: jest.Mock
    getBlocksWithParent: jest.Mock
    getBlocksWithType: jest.Mock
    getBlocksWithBlockID: jest.Mock
    getAllBlocks: jest.Mock
    insertBlock: jest.Mock
    insertBlocks: jest.Mock
    patchBlock: jest.Mock
    patchBlocks: jest.Mock
    deleteBlock: jest.Mock
    undeleteBlock: jest.Mock
    duplicateBlock: jest.Mock
    moveBlockTo: jest.Mock
    repairBlockOrder: jest.Mock
    getBoard: jest.Mock
    getBoards: jest.Mock
    getBoardsForTeam: jest.Mock
    createBoard: jest.Mock
    patchBoard: jest.Mock
    deleteBoard: jest.Mock
    duplicateBoard: jest.Mock
    undeleteBoard: jest.Mock
    getBoardMembers: jest.Mock
    createBoardMember: jest.Mock
    updateBoardMember: jest.Mock
    deleteBoardMember: jest.Mock
    joinBoard: jest.Mock
    getMyBoardMemberships: jest.Mock
    getMe: jest.Mock
    getUser: jest.Mock
    getUsersList: jest.Mock
    getTeamUsers: jest.Mock
    getTeamUsersList: jest.Mock
    searchTeamUsers: jest.Mock
    getTeam: jest.Mock
    getTeams: jest.Mock
    login: jest.Mock
    logout: jest.Mock
    register: jest.Mock
    changePassword: jest.Mock
    getClientConfig: jest.Mock
    getMyConfig: jest.Mock
    patchUserConfig: jest.Mock
    getCardsForBoard: jest.Mock
    getCardByCode: jest.Mock
    getCardRelations: jest.Mock
    createCardRelation: jest.Mock
    deleteCardRelation: jest.Mock
    followBlock: jest.Mock
    unfollowBlock: jest.Mock
    getUserBlockSubscriptions: jest.Mock
    getSharing: jest.Mock
    setSharing: jest.Mock
    getSidebarCategories: jest.Mock
    createSidebarCategory: jest.Mock
    deleteSidebarCategory: jest.Mock
    updateSidebarCategory: jest.Mock
    reorderSidebarCategories: jest.Mock
    reorderSidebarCategoryBoards: jest.Mock
    moveBoardToCategory: jest.Mock
    hideBoard: jest.Mock
    unhideBoard: jest.Mock
    search: jest.Mock
    searchLinkableBoards: jest.Mock
    searchAll: jest.Mock
    searchUserChannels: jest.Mock
    getChannel: jest.Mock
    exportBoardArchive: jest.Mock
    exportFullArchive: jest.Mock
    importFullArchive: jest.Mock
    createBoardsAndBlocks: jest.Mock
    deleteBoardsAndBlocks: jest.Mock
    patchBoardsAndBlocks: jest.Mock
    prepareOnboarding: jest.Mock
    notifyAdminUpgrade: jest.Mock
    getBoardsCloudLimits: jest.Mock
    getSiteStatistics: jest.Mock
    getMyTopBoards: jest.Mock
    getTeamTopBoards: jest.Mock
    getTeamTemplates: jest.Mock
    getStatusTransitionRules: jest.Mock
    saveStatusTransitionRules: jest.Mock
    getGitHubConnected: jest.Mock
    getGitHubRepositories: jest.Mock
    getGitHubBranches: jest.Mock
    createGitHubIssue: jest.Mock
    searchGitHubIssues: jest.Mock
    createGitHubBranch: jest.Mock
    getGitHubPR: jest.Mock
    generateFigmaPreview: jest.Mock
    executeQuickAction: jest.Mock
    createTaskFromPost: jest.Mock
    regenerateTeamSignupToken: jest.Mock
    serverUrl: string | undefined
    teamId: string
    channelId: string
    token: string
}

const octoClient: OctoClientMock = {
    // File operations
    getFileAsDataUrl: jest.fn().mockResolvedValue({url: ''}),
    getFileInfo: jest.fn().mockResolvedValue({}),
    uploadFile: jest.fn().mockResolvedValue(undefined),
    uploadAttachment: jest.fn().mockResolvedValue(undefined),
    getFileUrl: jest.fn().mockReturnValue(''),

    // Block operations
    getBlocksWithParent: jest.fn().mockResolvedValue([]),
    getBlocksWithType: jest.fn().mockResolvedValue([]),
    getBlocksWithBlockID: jest.fn().mockResolvedValue([]),
    getAllBlocks: jest.fn().mockResolvedValue([]),
    insertBlock: jest.fn().mockResolvedValue(new Response()),
    insertBlocks: jest.fn().mockResolvedValue(new Response()),
    patchBlock: jest.fn().mockResolvedValue(new Response()),
    patchBlocks: jest.fn().mockResolvedValue(new Response()),
    deleteBlock: jest.fn().mockResolvedValue(new Response()),
    undeleteBlock: jest.fn().mockResolvedValue(new Response()),
    duplicateBlock: jest.fn().mockResolvedValue([]),
    moveBlockTo: jest.fn().mockResolvedValue(new Response()),
    repairBlockOrder: jest.fn().mockResolvedValue(new Response()),

    // Board operations
    getBoard: jest.fn().mockResolvedValue(undefined),
    getBoards: jest.fn().mockResolvedValue([]),
    getBoardsForTeam: jest.fn().mockResolvedValue([]),
    createBoard: jest.fn().mockResolvedValue(new Response()),
    patchBoard: jest.fn().mockResolvedValue(new Response()),
    deleteBoard: jest.fn().mockResolvedValue(new Response()),
    duplicateBoard: jest.fn().mockResolvedValue(undefined),
    undeleteBoard: jest.fn().mockResolvedValue(new Response()),

    // Board member operations
    getBoardMembers: jest.fn().mockResolvedValue([]),
    createBoardMember: jest.fn().mockResolvedValue(undefined),
    updateBoardMember: jest.fn().mockResolvedValue(new Response()),
    deleteBoardMember: jest.fn().mockResolvedValue(new Response()),
    joinBoard: jest.fn().mockResolvedValue(undefined),
    getMyBoardMemberships: jest.fn().mockResolvedValue([]),

    // User operations
    getMe: jest.fn().mockResolvedValue(undefined),
    getUser: jest.fn().mockResolvedValue(undefined),
    getUsersList: jest.fn().mockResolvedValue([]),
    getTeamUsers: jest.fn().mockResolvedValue([]),
    getTeamUsersList: jest.fn().mockResolvedValue([]),
    searchTeamUsers: jest.fn().mockResolvedValue([]),

    // Team operations
    getTeam: jest.fn().mockResolvedValue(null),
    getTeams: jest.fn().mockResolvedValue([]),

    // Auth
    login: jest.fn().mockResolvedValue(false),
    logout: jest.fn().mockResolvedValue(false),
    register: jest.fn().mockResolvedValue({code: 0, json: {}}),
    changePassword: jest.fn().mockResolvedValue({code: 0, json: {}}),

    // Config
    getClientConfig: jest.fn().mockResolvedValue(null),
    getMyConfig: jest.fn().mockResolvedValue(undefined),
    patchUserConfig: jest.fn().mockResolvedValue(undefined),

    // Card operations
    getCardsForBoard: jest.fn().mockResolvedValue([]),
    getCardByCode: jest.fn().mockRejectedValue(new Error('Card not found')),
    getCardRelations: jest.fn().mockResolvedValue([]),
    createCardRelation: jest.fn().mockResolvedValue({}),
    deleteCardRelation: jest.fn().mockResolvedValue(undefined),

    // Subscription
    followBlock: jest.fn().mockResolvedValue(new Response()),
    unfollowBlock: jest.fn().mockResolvedValue(new Response()),
    getUserBlockSubscriptions: jest.fn().mockResolvedValue([]),

    // Sharing
    getSharing: jest.fn().mockResolvedValue(undefined),
    setSharing: jest.fn().mockResolvedValue(false),

    // Sidebar
    getSidebarCategories: jest.fn().mockResolvedValue([]),
    createSidebarCategory: jest.fn().mockResolvedValue(new Response()),
    deleteSidebarCategory: jest.fn().mockResolvedValue(new Response()),
    updateSidebarCategory: jest.fn().mockResolvedValue(new Response()),
    reorderSidebarCategories: jest.fn().mockResolvedValue([]),
    reorderSidebarCategoryBoards: jest.fn().mockResolvedValue([]),
    moveBoardToCategory: jest.fn().mockResolvedValue(new Response()),
    hideBoard: jest.fn().mockResolvedValue(new Response()),
    unhideBoard: jest.fn().mockResolvedValue(new Response()),

    // Search
    search: jest.fn().mockResolvedValue([]),
    searchLinkableBoards: jest.fn().mockResolvedValue([]),
    searchAll: jest.fn().mockResolvedValue([]),
    searchUserChannels: jest.fn().mockResolvedValue(undefined),

    // Channel
    getChannel: jest.fn().mockResolvedValue(undefined),

    // Import/Export
    exportBoardArchive: jest.fn().mockResolvedValue(new Response()),
    exportFullArchive: jest.fn().mockResolvedValue(new Response()),
    importFullArchive: jest.fn().mockResolvedValue(new Response()),

    // Boards and blocks
    createBoardsAndBlocks: jest.fn().mockResolvedValue(new Response()),
    deleteBoardsAndBlocks: jest.fn().mockResolvedValue(new Response()),
    patchBoardsAndBlocks: jest.fn().mockResolvedValue(new Response()),

    // Onboarding
    prepareOnboarding: jest.fn().mockResolvedValue(undefined),
    notifyAdminUpgrade: jest.fn().mockResolvedValue(undefined),

    // Limits and statistics
    getBoardsCloudLimits: jest.fn().mockResolvedValue(undefined),
    getSiteStatistics: jest.fn().mockResolvedValue(undefined),

    // Insights
    getMyTopBoards: jest.fn().mockResolvedValue(undefined),
    getTeamTopBoards: jest.fn().mockResolvedValue(undefined),

    // Templates
    getTeamTemplates: jest.fn().mockResolvedValue([]),

    // Status transition rules
    getStatusTransitionRules: jest.fn().mockResolvedValue([]),
    saveStatusTransitionRules: jest.fn().mockResolvedValue(new Response()),

    // GitHub integration
    getGitHubConnected: jest.fn().mockResolvedValue(undefined),
    getGitHubRepositories: jest.fn().mockResolvedValue([]),
    getGitHubBranches: jest.fn().mockRejectedValue(new Error('Failed to fetch branches')),
    createGitHubIssue: jest.fn().mockResolvedValue(undefined),
    searchGitHubIssues: jest.fn().mockResolvedValue([]),
    createGitHubBranch: jest.fn().mockResolvedValue(undefined),
    getGitHubPR: jest.fn().mockResolvedValue(undefined),

    // Figma
    generateFigmaPreview: jest.fn().mockResolvedValue({fileId: '', error: 'Failed to generate Figma preview'}),

    // Quick actions
    executeQuickAction: jest.fn().mockResolvedValue(undefined),

    // Task creation
    createTaskFromPost: jest.fn().mockResolvedValue(undefined),

    // Token
    regenerateTeamSignupToken: jest.fn().mockResolvedValue(undefined),

    // Properties
    serverUrl: undefined,
    teamId: 'test-team-id',
    channelId: 'test-channel-id',
    token: 'test-token',
}

export {octoClient as OctoClient}
export default octoClient
