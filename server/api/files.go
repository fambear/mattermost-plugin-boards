// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/mattermost/mattermost-plugin-boards/server/app"

	"github.com/gorilla/mux"
	"github.com/mattermost/mattermost-plugin-boards/server/model"

	"github.com/mattermost/mattermost-plugin-boards/server/services/audit"

	mmModel "github.com/mattermost/mattermost/server/public/model"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/platform/shared/filestore"
)

var UnsafeContentTypes = [...]string{
	"application/javascript",
	"application/ecmascript",
	"text/javascript",
	"text/ecmascript",
	"application/x-javascript",
	"text/html",
}

var MediaContentTypes = [...]string{
	"image/jpeg",
	"image/png",
	"image/bmp",
	"image/gif",
	"image/tiff",
	"video/avi",
	"video/mpeg",
	"video/mp4",
	"audio/mpeg",
	"audio/wav",
}

// FileUploadResponse is the response to a file upload
// swagger:model
type FileUploadResponse struct {
	// The FileID to retrieve the uploaded file
	// required: true
	FileID string `json:"fileId"`

	// Image width in pixels (only for image files)
	Width int `json:"width,omitempty"`

	// Image height in pixels (only for image files)
	Height int `json:"height,omitempty"`

	// Base64-encoded mini JPEG preview (only for image files)
	MiniPreview string `json:"miniPreview,omitempty"`
}

func FileUploadResponseFromJSON(data io.Reader) (*FileUploadResponse, error) {
	var fileUploadResponse FileUploadResponse

	if err := json.NewDecoder(data).Decode(&fileUploadResponse); err != nil {
		return nil, err
	}
	return &fileUploadResponse, nil
}

func FileInfoResponseFromJSON(data io.Reader) (*mmModel.FileInfo, error) {
	var fileInfo mmModel.FileInfo

	if err := json.NewDecoder(data).Decode(&fileInfo); err != nil {
		return nil, err
	}
	return &fileInfo, nil
}

func (a *API) registerFilesRoutes(r *mux.Router) {
	// Files API
	r.HandleFunc("/files/teams/{teamID}/{boardID}/{filename}", a.attachSession(a.handleServeFile)).Methods("GET")
	r.HandleFunc("/files/teams/{teamID}/{boardID}/{filename}/info", a.attachSession(a.getFileInfo)).Methods("GET")
	r.HandleFunc("/files/teams/{teamID}/{boardID}/{filename}/metadata", a.attachSession(a.handleGetFileMetadata)).Methods("GET")
	r.HandleFunc("/teams/{teamID}/{boardID}/files", a.sessionRequired(a.handleUploadFile)).Methods("POST")
}

func (a *API) handleServeFile(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /files/teams/{teamID}/{boardID}/{filename} getFile
	//
	// Returns the contents of an uploaded file
	//
	// ---
	// produces:
	// - application/json
	// - image/jpg
	// - image/png
	// - image/gif
	// parameters:
	// - name: teamID
	//   in: path
	//   description: Team ID
	//   required: true
	//   type: string
	// - name: boardID
	//   in: path
	//   description: Board ID
	//   required: true
	//   type: string
	// - name: filename
	//   in: path
	//   description: name of the file
	//   required: true
	//   type: string
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//   '404':
	//     description: file not found
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	vars := mux.Vars(r)
	boardID := vars["boardID"]
	filename := vars["filename"]
	userID := getUserID(r)

	hasValidReadToken := a.hasValidReadTokenForBoard(r, boardID)
	if userID == "" && !hasValidReadToken {
		a.errorResponse(w, r, model.NewErrUnauthorized("access denied to board"))
		return
	}

	if !hasValidReadToken && !a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionViewBoard) {
		a.errorResponse(w, r, model.NewErrPermission("access denied to board"))
		return
	}

	board, err := a.app.GetBoard(boardID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	// Try to generate presigned URL for direct S3 access
	backend := a.app.GetFilesBackend()
	a.logger.Debug("File backend type check",
		mlog.String("backendType", fmt.Sprintf("%T", backend)),
		mlog.String("filename", filename))
	linkGen, hasLinkGen := backend.(filestore.FileBackendWithLinkGenerator)
	if !hasLinkGen {
		a.logger.Debug("Backend does NOT support presigned URLs - falling back to proxy")
	}
	if hasLinkGen {
		a.logger.Debug("Backend supports presigned URLs")
		// First validate file ownership to prevent path traversal attacks
		if validErr := a.app.ValidateFileOwnership(board.TeamID, boardID, filename); validErr == nil {
			fileInfo, filePath, pathErr := a.app.GetFilePath(board.TeamID, boardID, filename)
			if pathErr == nil {
				// Skip presigned URLs for unsafe content types - they need security headers
				// that can only be applied via proxy mode
				isUnsafe := false
				if fileInfo != nil && fileInfo.MimeType != "" {
					for _, unsafeType := range UnsafeContentTypes {
						if strings.HasPrefix(fileInfo.MimeType, unsafeType) {
							isUnsafe = true
							break
						}
					}
				}

				if !isUnsafe {
					link, _, linkErr := linkGen.GeneratePublicLink(filePath)
					if linkErr == nil {
						auditRec := a.makeAuditRecord(r, "getFile", audit.Fail)
						defer a.audit.LogRecord(audit.LevelRead, auditRec)
						auditRec.AddMeta("boardID", boardID)
						auditRec.AddMeta("teamID", board.TeamID)
						auditRec.AddMeta("filename", filename)
						auditRec.Success()

						http.Redirect(w, r, link, http.StatusTemporaryRedirect)
						return
					}
					// Log the error but fall through to proxy mode
					a.logger.Debug("Failed to generate presigned URL, falling back to proxy",
						mlog.String("filePath", filePath),
						mlog.Err(linkErr))
				}
			}
		}
	}

	auditRec := a.makeAuditRecord(r, "getFile", audit.Fail)
	defer a.audit.LogRecord(audit.LevelRead, auditRec)
	auditRec.AddMeta("boardID", boardID)
	auditRec.AddMeta("teamID", board.TeamID)
	auditRec.AddMeta("filename", filename)

	fileInfo, fileReader, err := a.app.GetFile(board.TeamID, boardID, filename)
	if err != nil && !model.IsErrNotFound(err) {
		a.errorResponse(w, r, err)
		return
	}

	if errors.Is(err, app.ErrFileNotFound) && board.ChannelID != "" {
		// prior to moving from workspaces to teams, the filepath was constructed from
		// workspaceID, which is the channel ID in plugin mode.
		// If a file is not found from team ID as we tried above, try looking for it via
		// channel ID.
		fileReader, err = a.app.GetFileReader(board.ChannelID, boardID, filename)
		if err != nil {
			a.errorResponse(w, r, err)
			return
		}
		// move file to team location
		// nothing to do if there is an error
		_ = a.app.MoveFile(board.ChannelID, board.TeamID, boardID, filename)
	}

	if err != nil {
		// if err is still not nil then it is an error other than `not found` so we must
		// return the error to the requestor.  fileReader and Fileinfo are nil in this case.
		a.errorResponse(w, r, err)
	}

	defer fileReader.Close()

	mimeType := ""
	var fileSize int64
	if fileInfo != nil {
		mimeType = fileInfo.MimeType
		fileSize = fileInfo.Size
	}
	writeFileResponse(filename, mimeType, fileSize, time.Now(), fileReader, false, w, r)
	auditRec.Success()
}

func writeFileResponse(filename string, contentType string, contentSize int64,
	lastModification time.Time, fileReader io.ReadSeeker, forceDownload bool, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "private, no-cache")
	w.Header().Set("X-Content-Type-Options", "nosniff")

	if contentSize > 0 {
		w.Header().Set("Content-Length", strconv.Itoa(int(contentSize)))
	}

	if contentType == "" {
		contentType = "application/octet-stream"
	} else {
		for _, unsafeContentType := range UnsafeContentTypes {
			if strings.HasPrefix(contentType, unsafeContentType) {
				contentType = "text/plain"
				break
			}
		}
	}

	w.Header().Set("Content-Type", contentType)

	var toDownload bool
	if forceDownload {
		toDownload = true
	} else {
		isMediaType := false

		for _, mediaContentType := range MediaContentTypes {
			if strings.HasPrefix(contentType, mediaContentType) {
				isMediaType = true
				break
			}
		}

		toDownload = !isMediaType
	}

	filename = url.PathEscape(filename)

	if toDownload {
		w.Header().Set("Content-Disposition", "attachment;filename=\""+filename+"\"; filename*=UTF-8''"+filename)
	} else {
		w.Header().Set("Content-Disposition", "inline;filename=\""+filename+"\"; filename*=UTF-8''"+filename)
	}

	// prevent file links from being embedded in iframes
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Content-Security-Policy", "Frame-ancestors 'none'")

	http.ServeContent(w, r, filename, lastModification, fileReader)
}

func (a *API) getFileInfo(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /files/teams/{teamID}/{boardID}/{filename}/info getFile
	//
	// Returns the metadata of an uploaded file
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: teamID
	//   in: path
	//   description: Team ID
	//   required: true
	//   type: string
	// - name: boardID
	//   in: path
	//   description: Board ID
	//   required: true
	//   type: string
	// - name: filename
	//   in: path
	//   description: name of the file
	//   required: true
	//   type: string
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//   '404':
	//     description: file not found
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	vars := mux.Vars(r)
	boardID := vars["boardID"]
	teamID := vars["teamID"]
	filename := vars["filename"]
	userID := getUserID(r)

	hasValidReadToken := a.hasValidReadTokenForBoard(r, boardID)
	if userID == "" && !hasValidReadToken {
		a.errorResponse(w, r, model.NewErrUnauthorized("access denied to board"))
		return
	}

	if !hasValidReadToken && !a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionViewBoard) {
		a.errorResponse(w, r, model.NewErrPermission("access denied to board"))
		return
	}

	auditRec := a.makeAuditRecord(r, "getFile", audit.Fail)
	defer a.audit.LogRecord(audit.LevelRead, auditRec)
	auditRec.AddMeta("boardID", boardID)
	auditRec.AddMeta("teamID", teamID)
	auditRec.AddMeta("filename", filename)

	// Validate that the file belongs to the specified board and team
	if err := a.app.ValidateFileOwnership(teamID, boardID, filename); err != nil {
		a.errorResponse(w, r, model.NewErrPermission(fmt.Sprintf("access denied to file, error: %s", err)))
		return
	}

	fileInfo, err := a.app.GetFileInfo(filename)
	if err != nil && !model.IsErrNotFound(err) {
		a.errorResponse(w, r, err)
		return
	}

	data, err := json.Marshal(fileInfo)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
	auditRec.Success()
}

func (a *API) handleGetFileMetadata(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	boardID := vars["boardID"]
	teamID := vars["teamID"]
	filename := vars["filename"]

	userID := getUserID(r)

	hasValidReadToken := a.hasValidReadTokenForBoard(r, boardID)
	if userID == "" && !hasValidReadToken {
		a.errorResponse(w, r, model.NewErrUnauthorized("access denied to board"))
		return
	}

	if !hasValidReadToken && !a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionViewBoard) {
		a.errorResponse(w, r, model.NewErrPermission("access denied to board"))
		return
	}

	auditRec := a.makeAuditRecord(r, "getFileMetadata", audit.Fail)
	defer a.audit.LogRecord(audit.LevelRead, auditRec)
	auditRec.AddMeta("boardID", boardID)
	auditRec.AddMeta("teamID", teamID)
	auditRec.AddMeta("filename", filename)

	metadata, err := a.app.GetFileImageMetadata(teamID, boardID, filename)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	if metadata == nil {
		// Not an image or couldn't extract metadata
		jsonBytesResponse(w, http.StatusOK, []byte(`{}`))
		auditRec.Success()
		return
	}

	data, err := json.Marshal(metadata)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)
	auditRec.Success()
}

func (a *API) handleUploadFile(w http.ResponseWriter, r *http.Request) {
	// swagger:operation POST /teams/{teamID}/boards/{boardID}/files uploadFile
	//
	// Upload a binary file, attached to a root block
	//
	// ---
	// consumes:
	// - multipart/form-data
	// produces:
	// - application/json
	// parameters:
	// - name: teamID
	//   in: path
	//   description: ID of the team
	//   required: true
	//   type: string
	// - name: boardID
	//   in: path
	//   description: Board ID
	//   required: true
	//   type: string
	// - name: uploaded file
	//   in: formData
	//   type: file
	//   description: The file to upload
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       "$ref": "#/definitions/FileUploadResponse"
	//   '404':
	//     description: board not found
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	vars := mux.Vars(r)
	boardID := vars["boardID"]
	userID := getUserID(r)

	if !a.permissions.HasPermissionToBoard(userID, boardID, model.PermissionManageBoardCards) {
		a.errorResponse(w, r, model.NewErrPermission("access denied to make board changes"))
		return
	}

	board, err := a.app.GetBoard(boardID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	if a.app.GetConfig().MaxFileSize > 0 {
		r.Body = http.MaxBytesReader(w, r.Body, a.app.GetConfig().MaxFileSize)
	}

	file, handle, err := r.FormFile(UploadFormFileKey)
	if err != nil {
		if strings.HasSuffix(err.Error(), "http: request body too large") {
			a.errorResponse(w, r, model.ErrRequestEntityTooLarge)
			return
		}
		a.errorResponse(w, r, model.NewErrBadRequest(err.Error()))
		return
	}
	defer file.Close()

	auditRec := a.makeAuditRecord(r, "uploadFile", audit.Fail)
	defer a.audit.LogRecord(audit.LevelModify, auditRec)
	auditRec.AddMeta("boardID", boardID)
	auditRec.AddMeta("teamID", board.TeamID)
	auditRec.AddMeta("filename", handle.Filename)

	result, err := a.app.SaveFile(file, board.TeamID, boardID, handle.Filename, board.IsTemplate)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	a.logger.Debug("uploadFile",
		mlog.String("filename", handle.Filename),
		mlog.String("fileID", result.FileID),
	)

	response := FileUploadResponse{FileID: result.FileID}
	if result.Metadata != nil {
		response.Width = result.Metadata.Width
		response.Height = result.Metadata.Height
		response.MiniPreview = result.Metadata.MiniPreview
	}

	data, err := json.Marshal(response)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}

	jsonBytesResponse(w, http.StatusOK, data)

	auditRec.AddMeta("fileID", result.FileID)
	auditRec.Success()
}
