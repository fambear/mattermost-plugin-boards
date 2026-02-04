// Copyright (c) 2025 Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/mattermost/mattermost-plugin-aws-explorer/server/model"
)

// MockPlugin is a mock implementation of the plugin interface for testing
type MockPlugin struct {
	mock.Mock
}

func (m *MockPlugin) getConfiguration() *configuration {
	return &configuration{
		AWSAccessKeyID:     "test-key",
		AWSSecretAccessKey: "test-secret",
		AWSRegion:          "us-east-1",
	}
}

func (m *MockPlugin) GetAWSResources() ([]interface{}, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]interface{}), args.Error(1)
}

func (m *MockPlugin) GetAWSCosts() ([]interface{}, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]interface{}), args.Error(1)
}

type MockLogger struct {
	mock.Mock
}

func (m *MockLogger) Error(msg string, args ...interface{}) {
	m.Called(msg, args)
}

func (m *MockLogger) Warn(msg string, args ...interface{}) {
	m.Called(msg, args)
}

func (m *MockLogger) Debug(msg string, args ...interface{}) {
	m.Called(msg, args)
}

func TestErrorResponse(t *testing.T) {
	tests := []struct {
		name         string
		err          error
		expectedCode int
		expectedMsg  string
	}{
		{
			name:         "bad request error",
			err:          model.NewErrBadRequest("invalid input"),
			expectedCode: http.StatusBadRequest,
			expectedMsg:  "invalid input",
		},
		{
			name:         "unauthorized error",
			err:          model.NewErrUnauthorized("access denied"),
			expectedCode: http.StatusUnauthorized,
			expectedMsg:  "access denied",
		},
		{
			name:         "not found error",
			err:          model.NewErrNotFound("resource not found"),
			expectedCode: http.StatusNotFound,
			expectedMsg:  "resource not found",
		},
		{
			name:         "generic error",
			err:          assert.AnError,
			expectedCode: http.StatusInternalServerError,
			expectedMsg:  "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest("GET", "/test", nil)

			api := &API{}
			api.errorResponse(w, r, tt.err)

			assert.Equal(t, tt.expectedCode, w.Code)

			var resp model.ErrorResponse
			err := json.NewDecoder(w.Body).Decode(&resp)
			assert.NoError(t, err)
			assert.Equal(t, tt.expectedMsg, resp.Error)
			assert.Equal(t, tt.expectedCode, resp.ErrorCode)
		})
	}
}

func TestSetResponseHeader(t *testing.T) {
	t.Run("set header successfully", func(t *testing.T) {
		w := httptest.NewRecorder()
		setResponseHeader(w, "Content-Type", "application/json")

		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	})

	t.Run("set multiple headers", func(t *testing.T) {
		w := httptest.NewRecorder()
		setResponseHeader(w, "Content-Type", "application/json")
		setResponseHeader(w, "X-Custom-Header", "custom-value")

		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
		assert.Equal(t, "custom-value", w.Header().Get("X-Custom-Header"))
	})
}

func TestJSONBytesResponse(t *testing.T) {
	t.Run("successful JSON response", func(t *testing.T) {
		w := httptest.NewRecorder()
		data := []byte(`{"test":"value"}`)

		jsonBytesResponse(w, http.StatusOK, data)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
		assert.Equal(t, data, w.Body.Bytes())
	})

	t.Run("JSON response with different status code", func(t *testing.T) {
		w := httptest.NewRecorder()
		data := []byte(`{"error":"not found"}`)

		jsonBytesResponse(w, http.StatusNotFound, data)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))
	})
}

func TestRegisterRoutes(t *testing.T) {
	t.Run("routes are registered", func(t *testing.T) {
		router := mux.NewRouter()
		api := &API{}
		api.RegisterRoutes(router)

		// We can't easily test the actual route registration without
		// a full plugin instance, but we can verify the method doesn't panic
		assert.NotNil(t, router)
	})
}
