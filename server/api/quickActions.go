// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-plugin-boards/server/services/audit"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

func (a *API) registerQuickActionsRoutes(r *mux.Router) {
	r.HandleFunc("/boards/{boardID}/cards/{cardID}/quickActions/{actionID}", a.sessionRequired(a.handleExecuteQuickAction)).Methods("POST")
}

func (a *API) handleExecuteQuickAction(w http.ResponseWriter, r *http.Request) {
	// swagger:operation POST /boards/{boardID}/cards/{cardID}/quickActions/{actionID} executeQuickAction
	//
	// Executes a quick action on a card
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: boardID
	//   in: path
	//   description: Board ID
	//   required: true
	//   type: string
	// - name: cardID
	//   in: path
	//   description: Card ID
	//   required: true
	//   type: string
	// - name: actionID
	//   in: path
	//   description: Quick Action ID
	//   required: true
	//   type: string
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       "$ref": '#/definitions/BoardAndBlocks'
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	vars := mux.Vars(r)
	boardID := vars["boardID"]
	cardID := vars["cardID"]
	actionID := vars["actionID"]
	userID := getUserID(r)

	auditRec := a.makeAuditRecord(r, "executeQuickAction", audit.Fail)
	defer a.audit.LogRecord(audit.LevelModify, auditRec)
	auditRec.AddMeta("boardID", boardID)
	auditRec.AddMeta("cardID", cardID)
	auditRec.AddMeta("actionID", actionID)

	// Execute the quick action
	err := a.app.ExecuteQuickAction(boardID, cardID, actionID, userID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	// Get the updated card to return in response
	card, err := a.app.GetBlockByID(cardID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	a.logger.Debug("Executed quick action",
		mlog.String("boardID", boardID),
		mlog.String("cardID", cardID),
		mlog.String("actionID", actionID),
	)

	// Return the updated card
	data, err := json.Marshal(card)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	jsonBytesResponse(w, http.StatusOK, data)

	auditRec.Success()
}
