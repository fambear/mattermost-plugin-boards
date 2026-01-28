// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-plugin-boards/server/model"
	"github.com/mattermost/mattermost-plugin-boards/server/services/audit"
	"github.com/mattermost/mattermost-plugin-boards/server/services/github"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

func (a *API) registerGitHubRoutes(r *mux.Router) {
	// GitHub integration APIs
	r.HandleFunc("/github/connected", a.sessionRequired(a.handleGitHubConnected)).Methods("GET")
	r.HandleFunc("/github/repositories", a.sessionRequired(a.handleGitHubRepositories)).Methods("GET")
	r.HandleFunc("/github/issues/search", a.sessionRequired(a.handleGitHubSearchIssues)).Methods("GET")
	r.HandleFunc("/github/issues", a.sessionRequired(a.handleGitHubCreateIssue)).Methods("POST")
	r.HandleFunc("/github/issues/{owner}/{repo}/{number}", a.sessionRequired(a.handleGitHubGetIssue)).Methods("GET")
	r.HandleFunc("/github/labels", a.sessionRequired(a.handleGitHubGetLabels)).Methods("GET")
	r.HandleFunc("/github/milestones", a.sessionRequired(a.handleGitHubGetMilestones)).Methods("GET")
	r.HandleFunc("/github/assignees", a.sessionRequired(a.handleGitHubGetAssignees)).Methods("GET")
}

func (a *API) handleGitHubConnected(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /github/connected getGitHubConnected
	//
	// Checks if the user has connected their GitHub account.
	//
	// ---
	// produces:
	// - application/json
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       type: object
	//       properties:
	//         connected:
	//           type: boolean
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)

	githubService := a.app.GetGitHubService()
	if githubService == nil {
		a.errorResponse(w, r, model.NewErrBadRequest("GitHub integration not available"))
		return
	}

	auditRec := a.makeAuditRecord(r, "getGitHubConnected", audit.Fail)
	defer a.audit.LogRecord(audit.LevelRead, auditRec)

	connected, err := githubService.IsUserConnected(userID)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(fmt.Sprintf("failed to check GitHub connection: %s", err)))
		return
	}

	a.logger.Debug("GetGitHubConnected",
		mlog.String("userID", userID),
		mlog.Bool("connected", connected),
	)

	response := map[string]bool{
		"connected": connected,
	}

	data, err := json.Marshal(response)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
	auditRec.Success()
}

func (a *API) handleGitHubRepositories(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /github/repositories getGitHubRepositories
	//
	// Gets the user's GitHub repositories.
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: channelId
	//   in: query
	//   description: Channel ID
	//   required: false
	//   type: string
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       type: array
	//       items:
	//         type: object
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)
	channelID := r.URL.Query().Get("channelId")

	githubService := a.app.GetGitHubService()
	if githubService == nil {
		a.errorResponse(w, r, model.NewErrBadRequest("GitHub integration not available"))
		return
	}

	auditRec := a.makeAuditRecord(r, "getGitHubRepositories", audit.Fail)
	defer a.audit.LogRecord(audit.LevelRead, auditRec)

	repos, err := githubService.GetRepositories(userID, channelID)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(fmt.Sprintf("failed to get repositories: %s", err)))
		return
	}

	a.logger.Debug("GetGitHubRepositories",
		mlog.String("userID", userID),
		mlog.Int("count", len(repos)),
	)

	data, err := json.Marshal(repos)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
	auditRec.Success()
}

func (a *API) handleGitHubSearchIssues(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /github/issues/search searchGitHubIssues
	//
	// Searches for GitHub issues.
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: term
	//   in: query
	//   description: Search term
	//   required: true
	//   type: string
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       type: array
	//       items:
	//         type: object
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)
	term := r.URL.Query().Get("term")

	if term == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("search term is required"))
		return
	}

	githubService := a.app.GetGitHubService()
	if githubService == nil {
		a.errorResponse(w, r, model.NewErrBadRequest("GitHub integration not available"))
		return
	}

	auditRec := a.makeAuditRecord(r, "searchGitHubIssues", audit.Fail)
	defer a.audit.LogRecord(audit.LevelRead, auditRec)

	issues, err := githubService.SearchIssues(userID, term)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(fmt.Sprintf("failed to search issues: %s", err)))
		return
	}

	a.logger.Debug("SearchGitHubIssues",
		mlog.String("userID", userID),
		mlog.String("term", term),
		mlog.Int("count", len(issues)),
	)

	data, err := json.Marshal(issues)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
	auditRec.Success()
}

func (a *API) handleGitHubCreateIssue(w http.ResponseWriter, r *http.Request) {
	// swagger:operation POST /github/issues createGitHubIssue
	//
	// Creates a new GitHub issue.
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: Body
	//   in: body
	//   description: the issue to create
	//   required: true
	//   schema:
	//     type: object
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       type: object
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)

	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	var req github.CreateIssueRequest
	if err = json.Unmarshal(requestBody, &req); err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(err.Error()))
		return
	}

	githubService := a.app.GetGitHubService()
	if githubService == nil {
		a.errorResponse(w, r, model.NewErrBadRequest("GitHub integration not available"))
		return
	}

	auditRec := a.makeAuditRecord(r, "createGitHubIssue", audit.Fail)
	defer a.audit.LogRecord(audit.LevelModify, auditRec)
	auditRec.AddMeta("repo", req.Repo)

	response, err := githubService.CreateIssue(userID, &req)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(fmt.Sprintf("failed to create issue: %s", err)))
		return
	}

	a.logger.Debug("CreateGitHubIssue",
		mlog.String("userID", userID),
		mlog.String("repo", req.Repo),
		mlog.Int("number", response.Number),
	)

	data, err := json.Marshal(response)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
	auditRec.Success()
}

func (a *API) handleGitHubGetIssue(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /github/issues/{owner}/{repo}/{number} getGitHubIssue
	//
	// Gets a specific GitHub issue.
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: owner
	//   in: path
	//   description: Repository owner
	//   required: true
	//   type: string
	// - name: repo
	//   in: path
	//   description: Repository name
	//   required: true
	//   type: string
	// - name: number
	//   in: path
	//   description: Issue number
	//   required: true
	//   type: integer
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       type: object
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)
	vars := mux.Vars(r)
	owner := vars["owner"]
	repo := vars["repo"]
	numberStr := vars["number"]

	number, err := strconv.Atoi(numberStr)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest("invalid issue number"))
		return
	}

	githubService := a.app.GetGitHubService()
	if githubService == nil {
		a.errorResponse(w, r, model.NewErrBadRequest("GitHub integration not available"))
		return
	}

	auditRec := a.makeAuditRecord(r, "getGitHubIssue", audit.Fail)
	defer a.audit.LogRecord(audit.LevelRead, auditRec)

	issue, err := githubService.GetIssue(userID, owner, repo, number)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(fmt.Sprintf("failed to get issue: %s", err)))
		return
	}

	a.logger.Debug("GetGitHubIssue",
		mlog.String("userID", userID),
		mlog.String("owner", owner),
		mlog.String("repo", repo),
		mlog.Int("number", number),
	)

	data, err := json.Marshal(issue)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
	auditRec.Success()
}

func (a *API) handleGitHubGetLabels(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	repo := r.URL.Query().Get("repo")

	if repo == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("repo parameter is required"))
		return
	}

	githubService := a.app.GetGitHubService()
	if githubService == nil {
		a.errorResponse(w, r, model.NewErrBadRequest("GitHub integration not available"))
		return
	}

	labels, err := githubService.GetLabels(userID, repo)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(fmt.Sprintf("failed to get labels: %s", err)))
		return
	}

	data, err := json.Marshal(labels)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleGitHubGetMilestones(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	repo := r.URL.Query().Get("repo")

	if repo == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("repo parameter is required"))
		return
	}

	githubService := a.app.GetGitHubService()
	if githubService == nil {
		a.errorResponse(w, r, model.NewErrBadRequest("GitHub integration not available"))
		return
	}

	milestones, err := githubService.GetMilestones(userID, repo)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(fmt.Sprintf("failed to get milestones: %s", err)))
		return
	}

	data, err := json.Marshal(milestones)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleGitHubGetAssignees(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	repo := r.URL.Query().Get("repo")

	if repo == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("repo parameter is required"))
		return
	}

	githubService := a.app.GetGitHubService()
	if githubService == nil {
		a.errorResponse(w, r, model.NewErrBadRequest("GitHub integration not available"))
		return
	}

	assignees, err := githubService.GetAssignees(userID, repo)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest(fmt.Sprintf("failed to get assignees: %s", err)))
		return
	}

	data, err := json.Marshal(assignees)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

