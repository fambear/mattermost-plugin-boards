// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"errors"
	"fmt"
	"sort"
	"strings"

	mm_model "github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	// taskBotUsername is the Mattermost username of the bot that handles task creation.
	taskBotUsername = "clawdbot"

	// maxThreadMessages is the maximum number of thread messages to include.
	maxThreadMessages = 50
)

// ErrSiteURLNotConfigured is returned when SiteURL is not set in the server config.
var ErrSiteURLNotConfigured = errors.New("SiteURL is not configured")

// CreateTaskFromPost opens a DM with the task bot and posts a message
// containing the thread context from the specified post, triggering task creation.
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

	// Get the clicked post
	clickedPost, err := a.servicesAPI.GetPost(postID)
	if err != nil {
		return "", fmt.Errorf("could not get post: %w", err)
	}

	// Build the message with thread context
	message := a.buildThreadContextMessage(clickedPost, postID, siteURL)

	// Post the message
	post := &mm_model.Post{
		UserId:    userID,
		ChannelId: dmChannel.Id,
		Message:   message,
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

// buildThreadContextMessage builds a message containing the full thread context.
// If the post is part of a thread, includes all messages from root to the clicked post.
// If it's a standalone message, includes just that message.
func (a *App) buildThreadContextMessage(clickedPost *mm_model.Post, clickedPostID, siteURL string) string {
	var sb strings.Builder

	// Determine the root post ID
	rootID := clickedPost.RootId
	if rootID == "" {
		// The clicked post IS the root (or standalone message)
		rootID = clickedPost.Id
	}

	// Build permalink to the root post
	permalink := fmt.Sprintf("%s/_redirect/pl/%s", siteURL, rootID)
	sb.WriteString(fmt.Sprintf("Create task from discussion: %s\n\n", permalink))

	// Get the thread
	thread, err := a.servicesAPI.GetPostThread(rootID)
	if err != nil {
		// Fallback: just use the clicked post
		author := a.getUsername(clickedPost.UserId)
		sb.WriteString(fmt.Sprintf("**@%s:** %s", author, clickedPost.Message))
		return sb.String()
	}

	// Sort posts by create time
	posts := make([]*mm_model.Post, 0, len(thread.Posts))
	for _, p := range thread.Posts {
		posts = append(posts, p)
	}
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].CreateAt < posts[j].CreateAt
	})

	// Limit to maxThreadMessages and only up to the clicked post
	sb.WriteString("**Thread context:**\n")
	count := 0
	for _, p := range posts {
		if count >= maxThreadMessages {
			sb.WriteString("\n_(thread truncated)_\n")
			break
		}
		if p.Message == "" {
			continue
		}

		author := a.getUsername(p.UserId)
		sb.WriteString(fmt.Sprintf("> **@%s:** %s\n", author, p.Message))
		count++

		// Stop after the clicked post
		if p.Id == clickedPostID {
			break
		}
	}

	return sb.String()
}

// getUsername returns the username for a user ID, or "unknown" if not found.
func (a *App) getUsername(userID string) string {
	user, err := a.servicesAPI.GetUserByID(userID)
	if err != nil {
		return "unknown"
	}
	return user.Username
}
