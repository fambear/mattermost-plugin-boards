// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"errors"
	"fmt"

	mm_model "github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	// botUsername is the Mattermost username of the bot that handles task creation.
	taskBotUsername = "clawdbot"
)

// ErrSiteURLNotConfigured is returned when SiteURL is not set in the server config.
var ErrSiteURLNotConfigured = errors.New("SiteURL is not configured")

// CreateTaskFromPost opens a DM with the task bot and posts a message
// containing a permalink to the specified post, triggering task creation.
// Returns the DM channel ID for navigation.
func (a *App) CreateTaskFromPost(userID, postID, teamID string) (string, error) {
	// Get site URL from config
	cfg := a.servicesAPI.GetConfig()
	siteURL := ""
	if cfg != nil && cfg.ServiceSettings.SiteURL != nil {
		siteURL = *cfg.ServiceSettings.SiteURL
	}
	if siteURL == "" {
		return "", ErrSiteURLNotConfigured
	}

	// Find the bot user
	botUser, err := a.servicesAPI.GetUserByUsername(taskBotUsername)
	if err != nil {
		return "", fmt.Errorf("could not find bot user @%s: %w", taskBotUsername, err)
	}

	// Create or get the DM channel between the user and the bot
	dmChannel, err := a.servicesAPI.GetDirectChannelOrCreate(userID, botUser.Id)
	if err != nil {
		return "", fmt.Errorf("could not create DM channel: %w", err)
	}

	// Build the permalink
	permalink := fmt.Sprintf("%s/_redirect/pl/%s", siteURL, postID)

	// Post the message
	post := &mm_model.Post{
		UserId:    userID,
		ChannelId: dmChannel.Id,
		Message:   fmt.Sprintf("Create task from discussion: %s", permalink),
	}

	if _, err := a.servicesAPI.CreatePost(post); err != nil {
		return "", fmt.Errorf("could not create post: %w", err)
	}

	a.logger.Info("CreateTaskFromPost: message sent",
		mlog.String("userID", userID),
		mlog.String("postID", postID),
		mlog.String("dmChannelID", dmChannel.Id),
	)

	return dmChannel.Id, nil
}
