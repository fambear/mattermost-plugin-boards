// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-plugin-boards/server/model"
)

func (a *API) registerActionsRoutes(r *mux.Router) {
	r.HandleFunc("/actions/create-task-from-post", a.sessionRequired(a.handleCreateTaskFromPost)).Methods(http.MethodPost)
}

// CreateTaskFromPostRequest is the request body for the create-task-from-post action.
type CreateTaskFromPostRequest struct {
	PostID string `json:"postId"`
	TeamID string `json:"teamId"`
}

// CreateTaskFromPostResponse is the response body for the create-task-from-post action.
type CreateTaskFromPostResponse struct {
	ChannelID string `json:"channelId"`
}

func (a *API) handleCreateTaskFromPost(w http.ResponseWriter, r *http.Request) {
	userID := getUserID(r)
	if userID == "" {
		a.errorResponse(w, r, model.NewErrUnauthorized("unauthorized"))
		return
	}

	var req CreateTaskFromPostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest("invalid request body"))
		return
	}

	if req.PostID == "" || req.TeamID == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("postId and teamId are required"))
		return
	}

	channelID, err := a.app.CreateTaskFromPost(userID, req.PostID, req.TeamID)
	if err != nil {
		a.errorResponse(w, r, fmt.Errorf("failed to create task from post: %w", err))
		return
	}

	resp := CreateTaskFromPostResponse{ChannelID: channelID}
	data, err := json.Marshal(resp)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}
