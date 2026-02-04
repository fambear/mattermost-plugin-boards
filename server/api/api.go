// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/mattermost/mattermost-plugin-aws-explorer/server/model"
	"github.com/mattermost/mattermost/server/public"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

type API struct {
	plugin *Plugin
}

func NewAPI(plugin *Plugin) *API {
	return &API{
		plugin: plugin,
	}
}

func (a *API) RegisterRoutes(r *mux.Router) {
	r.HandleFunc("/aws/resources", a.handleGetAWSResources).Methods("GET")
	r.HandleFunc("/aws/costs", a.handleGetAWSCosts).Methods("GET")
}

func (a *API) handleGetAWSResources(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	if userID == "" {
		a.errorResponse(w, r, model.NewErrUnauthorized("Unauthorized"))
		return
	}

	config := a.plugin.getConfiguration()
	if config.AWSAccessKeyID == "" || config.AWSSecretAccessKey == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("AWS credentials not configured"))
		return
	}

	resources, err := a.plugin.GetAWSResources()
	if err != nil {
		a.plugin.logger.Error("Failed to get AWS resources", mlog.Err(err))
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(resources)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) handleGetAWSCosts(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("Mattermost-User-ID")
	if userID == "" {
		a.errorResponse(w, r, model.NewErrUnauthorized("Unauthorized"))
		return
	}

	config := a.plugin.getConfiguration()
	if config.AWSAccessKeyID == "" || config.AWSSecretAccessKey == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("AWS credentials not configured"))
		return
	}

	costs, err := a.plugin.GetAWSCosts()
	if err != nil {
		a.plugin.logger.Error("Failed to get AWS costs", mlog.Err(err))
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(costs)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
}

func (a *API) errorResponse(w http.ResponseWriter, r *http.Request, err error) {
	errorResponse := model.ErrorResponse{
		Error:     err.Error(),
		ErrorCode: http.StatusInternalServerError,
	}

	switch {
	case model.IsErrBadRequest(err):
		errorResponse.ErrorCode = http.StatusBadRequest
	case model.IsErrUnauthorized(err):
		errorResponse.ErrorCode = http.StatusUnauthorized
	case model.IsErrNotFound(err):
		errorResponse.ErrorCode = http.StatusNotFound
	default:
		errorResponse.Error = "internal server error"
		errorResponse.ErrorCode = http.StatusInternalServerError
	}

	a.plugin.logger.Warn("api error response",
		mlog.Int("code", errorResponse.ErrorCode),
		mlog.Err(err),
		mlog.String("api", r.URL.Path),
	)

	setResponseHeader(w, "Content-Type", "application/json")
	data, _ := json.Marshal(errorResponse)
	w.WriteHeader(errorResponse.ErrorCode)
	w.Write(data)
}

func jsonBytesResponse(w http.ResponseWriter, code int, jsonBytes []byte) {
	setResponseHeader(w, "Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(jsonBytes)
}

func setResponseHeader(w http.ResponseWriter, key string, value string) {
	header := w.Header()
	if header == nil {
		return
	}
	header.Set(key, value)
}
