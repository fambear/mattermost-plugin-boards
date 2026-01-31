// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const octoClient = {
    getFileAsDataUrl: jest.fn(),
    getFileInfo: jest.fn(),
    uploadFile: jest.fn(),
    getAllBlocks: jest.fn(),
    getBlocksWithType: jest.fn(),
    getBlocksWithParent: jest.fn(),
    insertBlocks: jest.fn(),
    patchBlock: jest.fn(),
    patchBlocks: jest.fn(),
    deleteBlock: jest.fn(),
    exportBoardArchive: jest.fn(),
    exportFullArchive: jest.fn(),
    importFullArchive: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    getUser: jest.fn(),
    getTeam: jest.fn(),
    getTeams: jest.fn(),
    searchTeamUsers: jest.fn(),
    getChannel: jest.fn(),
    getChannels: jest.fn(),
    patchUserConfig: jest.fn(),
    getBoardsCloudLimits: jest.fn(),
    notifyAdminUpgrade: jest.fn(),
    getGitHubPR: jest.fn(),
}

export default octoClient

