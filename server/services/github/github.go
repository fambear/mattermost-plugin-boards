// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package github

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	mm_model "github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	GitHubPluginID = "github"
)

// ServicesAPI is the interface required by the GitHub service to interact with
// the Mattermost server and other plugins.
type ServicesAPI interface {
	PluginHTTP(request *mm_model.PluginHTTPRequest) (*mm_model.PluginHTTPResponse, error)
	GetLogger() mlog.LoggerIFace
}

// Service provides GitHub integration functionality via IPC with the GitHub plugin.
type Service struct {
	api    ServicesAPI
	logger mlog.LoggerIFace
}

// New creates a new GitHub service instance.
func New(api ServicesAPI) *Service {
	return &Service{
		api:    api,
		logger: api.GetLogger(),
	}
}

// CreateIssueRequest represents the request to create a GitHub issue.
type CreateIssueRequest struct {
	Title       string   `json:"title"`
	Body        string   `json:"body"`
	Repo        string   `json:"repo"`
	ChannelID   string   `json:"channel_id"`
	Assignees   []string `json:"assignees,omitempty"`
	Labels      []string `json:"labels,omitempty"`
	Milestone   int      `json:"milestone,omitempty"`
}

// CreateIssueResponse represents the response from creating a GitHub issue.
type CreateIssueResponse struct {
	Number  int    `json:"number"`
	HTMLURL string `json:"html_url"`
	Error   string `json:"error,omitempty"`
}

// SearchIssuesRequest represents the request to search GitHub issues.
type SearchIssuesRequest struct {
	Term string `json:"term"`
}

// Issue represents a GitHub issue.
type Issue struct {
	Number  int    `json:"number"`
	Title   string `json:"title"`
	State   string `json:"state"`
	HTMLURL string `json:"html_url"`
	Repo    string `json:"repo"`
}

// Repository represents a GitHub repository.
type Repository struct {
	FullName string `json:"full_name"`
	Name     string `json:"name"`
	Owner    string `json:"owner"`
}

// Label represents a GitHub label.
type Label struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

// Milestone represents a GitHub milestone.
type Milestone struct {
	Number int    `json:"number"`
	Title  string `json:"title"`
}

// Assignee represents a GitHub assignee.
type Assignee struct {
	Login string `json:"login"`
}

// pluginHTTPCall makes an HTTP call to another plugin via IPC.
func (s *Service) pluginHTTPCall(method, path string, userID string, body interface{}) ([]byte, error) {
	var bodyReader io.Reader
	if body != nil {
		bodyBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(bodyBytes)
	}

	headers := map[string]string{
		"Mattermost-User-ID": userID,
		"Content-Type":       "application/json",
	}

	request := &mm_model.PluginHTTPRequest{
		Method:   method,
		URL:      path,
		Body:     bodyReader,
		Header:   headers,
		PluginID: GitHubPluginID,
	}

	response, err := s.api.PluginHTTP(request)
	if err != nil {
		return nil, fmt.Errorf("plugin HTTP call failed: %w", err)
	}

	if response.StatusCode >= 400 {
		return nil, fmt.Errorf("GitHub plugin returned error status %d", response.StatusCode)
	}

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	return responseBody, nil
}

// IsUserConnected checks if a user has connected their GitHub account.
func (s *Service) IsUserConnected(userID string) (bool, error) {
	respBody, err := s.pluginHTTPCall(http.MethodGet, "/api/v1/connected", userID, nil)
	if err != nil {
		return false, err
	}

	var connected struct {
		Connected bool `json:"connected"`
	}
	if err := json.Unmarshal(respBody, &connected); err != nil {
		return false, fmt.Errorf("failed to parse connected response: %w", err)
	}

	return connected.Connected, nil
}

// CreateIssue creates a new GitHub issue.
func (s *Service) CreateIssue(userID string, req *CreateIssueRequest) (*CreateIssueResponse, error) {
	respBody, err := s.pluginHTTPCall(http.MethodPost, "/api/v1/createissue", userID, req)
	if err != nil {
		return nil, err
	}

	var response CreateIssueResponse
	if err := json.Unmarshal(respBody, &response); err != nil {
		return nil, fmt.Errorf("failed to parse create issue response: %w", err)
	}

	if response.Error != "" {
		return nil, fmt.Errorf("GitHub error: %s", response.Error)
	}

	return &response, nil
}

// SearchIssues searches for GitHub issues.
func (s *Service) SearchIssues(userID, term string) ([]Issue, error) {
	path := fmt.Sprintf("/api/v1/searchissues?term=%s", term)
	respBody, err := s.pluginHTTPCall(http.MethodGet, path, userID, nil)
	if err != nil {
		return nil, err
	}

	var issues []Issue
	if err := json.Unmarshal(respBody, &issues); err != nil {
		return nil, fmt.Errorf("failed to parse search issues response: %w", err)
	}

	return issues, nil
}

// GetRepositories gets the user's GitHub repositories.
func (s *Service) GetRepositories(userID, channelID string) ([]Repository, error) {
	path := fmt.Sprintf("/api/v1/repositories?channelId=%s", channelID)
	respBody, err := s.pluginHTTPCall(http.MethodGet, path, userID, nil)
	if err != nil {
		return nil, err
	}

	var repos []Repository
	if err := json.Unmarshal(respBody, &repos); err != nil {
		return nil, fmt.Errorf("failed to parse repositories response: %w", err)
	}

	return repos, nil
}

// GetLabels gets labels for a repository.
func (s *Service) GetLabels(userID, repo string) ([]Label, error) {
	path := fmt.Sprintf("/api/v1/labels?repo=%s", repo)
	respBody, err := s.pluginHTTPCall(http.MethodGet, path, userID, nil)
	if err != nil {
		return nil, err
	}

	var labels []Label
	if err := json.Unmarshal(respBody, &labels); err != nil {
		return nil, fmt.Errorf("failed to parse labels response: %w", err)
	}

	return labels, nil
}

// GetMilestones gets milestones for a repository.
func (s *Service) GetMilestones(userID, repo string) ([]Milestone, error) {
	path := fmt.Sprintf("/api/v1/milestones?repo=%s", repo)
	respBody, err := s.pluginHTTPCall(http.MethodGet, path, userID, nil)
	if err != nil {
		return nil, err
	}

	var milestones []Milestone
	if err := json.Unmarshal(respBody, &milestones); err != nil {
		return nil, fmt.Errorf("failed to parse milestones response: %w", err)
	}

	return milestones, nil
}

// GetAssignees gets assignees for a repository.
func (s *Service) GetAssignees(userID, repo string) ([]Assignee, error) {
	path := fmt.Sprintf("/api/v1/assignees?repo=%s", repo)
	respBody, err := s.pluginHTTPCall(http.MethodGet, path, userID, nil)
	if err != nil {
		return nil, err
	}

	var assignees []Assignee
	if err := json.Unmarshal(respBody, &assignees); err != nil {
		return nil, fmt.Errorf("failed to parse assignees response: %w", err)
	}

	return assignees, nil
}

// GetIssue gets details for a specific GitHub issue.
func (s *Service) GetIssue(userID, owner, repo string, number int) (*Issue, error) {
	path := fmt.Sprintf("/api/v1/issue?owner=%s&repo=%s&number=%d", owner, repo, number)
	respBody, err := s.pluginHTTPCall(http.MethodGet, path, userID, nil)
	if err != nil {
		return nil, err
	}

	var issue Issue
	if err := json.Unmarshal(respBody, &issue); err != nil {
		return nil, fmt.Errorf("failed to parse issue response: %w", err)
	}

	return &issue, nil
}

