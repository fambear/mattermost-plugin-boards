// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import "errors"

type ErrBadRequest struct {
	reason string
}

func (e *ErrBadRequest) Error() string {
	return e.reason
}

func NewErrBadRequest(reason string) *ErrBadRequest {
	return &ErrBadRequest{reason: reason}
}

func IsErrBadRequest(err error) bool {
	var badRequest *ErrBadRequest
	return errors.As(err, &badRequest)
}

type ErrUnauthorized struct {
	reason string
}

func (e *ErrUnauthorized) Error() string {
	return e.reason
}

func NewErrUnauthorized(reason string) *ErrUnauthorized {
	return &ErrUnauthorized{reason: reason}
}

func IsErrUnauthorized(err error) bool {
	var unauthorized *ErrUnauthorized
	return errors.As(err, &unauthorized)
}

type ErrNotFound struct {
	reason string
}

func (e *ErrNotFound) Error() string {
	return e.reason
}

func NewErrNotFound(reason string) *ErrNotFound {
	return &ErrNotFound{reason: reason}
}

func IsErrNotFound(err error) bool {
	var notFound *ErrNotFound
	return errors.As(err, &notFound)
}

type ErrorResponse struct {
	Error     string `json:"error"`
	ErrorCode int    `json:"error_code"`
}
