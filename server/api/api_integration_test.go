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

// MockPluginForIntegration is a more comprehensive mock for integration tests
type MockPluginForIntegration struct {
	mock.Mock
	config *configuration
}

func (m *MockPluginForIntegration) getConfiguration() *configuration {
	if m.config != nil {
		return m.config
	}
	return &configuration{
		AWSAccessKeyID:     "test-key",
		AWSSecretAccessKey: "test-secret",
		AWSRegion:          "us-east-1",
	}
}

func (m *MockPluginForIntegration) setConfig(config *configuration) {
	m.config = config
}

func (m *MockPluginForIntegration) GetAWSResources() ([]interface{}, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]interface{}), args.Error(1)
}

func (m *MockPluginForIntegration) GetAWSCosts() ([]interface{}, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]interface{}), args.Error(1)
}

func setupTestRouter(api *API) *mux.Router {
	router := mux.NewRouter()
	api.RegisterRoutes(router)
	return router
}

func TestHandleGetAWSResourcesIntegration(t *testing.T) {
	tests := []struct {
		name               string
		userID             string
		config             *configuration
		mockResources      []interface{}
		mockError          error
		expectedStatusCode int
		expectJSONData     bool
	}{
		{
			name:   "successful resource retrieval",
			userID: "test-user-id",
			config: &configuration{
				AWSAccessKeyID:     "test-key",
				AWSSecretAccessKey: "test-secret",
				AWSRegion:          "us-east-1",
			},
			mockResources: []interface{}{
				map[string]interface{}{
					"service": "EC2",
					"count":   2,
					"resources": []map[string]interface{}{
						{"id": "i-123", "type": "t2.micro", "state": "running"},
						{"id": "i-456", "type": "t3.small", "state": "stopped"},
					},
				},
			},
			mockError:          nil,
			expectedStatusCode: http.StatusOK,
			expectJSONData:     true,
		},
		{
			name:   "unauthorized - no user ID",
			userID: "",
			config: &configuration{
				AWSAccessKeyID:     "test-key",
				AWSSecretAccessKey: "test-secret",
				AWSRegion:          "us-east-1",
			},
			mockResources:      nil,
			mockError:          nil,
			expectedStatusCode: http.StatusUnauthorized,
			expectJSONData:     false,
		},
		{
			name:   "bad request - no credentials",
			userID: "test-user-id",
			config: &configuration{
				AWSAccessKeyID:     "",
				AWSSecretAccessKey: "",
				AWSRegion:          "us-east-1",
			},
			mockResources:      nil,
			mockError:          nil,
			expectedStatusCode: http.StatusBadRequest,
			expectJSONData:     false,
		},
		{
			name:   "internal server error - AWS API failure",
			userID: "test-user-id",
			config: &configuration{
				AWSAccessKeyID:     "test-key",
				AWSSecretAccessKey: "test-secret",
				AWSRegion:          "us-east-1",
			},
			mockResources:      nil,
			mockError:          assert.AnError,
			expectedStatusCode: http.StatusInternalServerError,
			expectJSONData:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockPlugin := new(MockPluginForIntegration)
			mockPlugin.setConfig(tt.config)

			if tt.mockResources != nil || tt.mockError != nil {
				mockPlugin.On("GetAWSResources").Return(tt.mockResources, tt.mockError)
			}

			api := &API{plugin: mockPlugin}
			router := setupTestRouter(api)

			req := httptest.NewRequest("GET", "/aws/resources", nil)
			if tt.userID != "" {
				req.Header.Set("Mattermost-User-ID", tt.userID)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code)

			if tt.expectJSONData {
				var data []interface{}
				err := json.NewDecoder(w.Body).Decode(&data)
				assert.NoError(t, err)
				assert.NotEmpty(t, data)
			} else {
				var errorResp model.ErrorResponse
				err := json.NewDecoder(w.Body).Decode(&errorResp)
				assert.NoError(t, err)
				assert.NotEmpty(t, errorResp.Error)
			}

			mockPlugin.AssertExpectations(t)
		})
	}
}

func TestHandleGetAWSCostsIntegration(t *testing.T) {
	tests := []struct {
		name               string
		userID             string
		config             *configuration
		mockCosts          []interface{}
		mockError          error
		expectedStatusCode int
		expectJSONData     bool
	}{
		{
			name:   "successful cost retrieval",
			userID: "test-user-id",
			config: &configuration{
				AWSAccessKeyID:     "test-key",
				AWSSecretAccessKey: "test-secret",
				AWSRegion:          "us-east-1",
			},
			mockCosts: []interface{}{
				map[string]interface{}{
					"service":   "EC2",
					"amount":    150.50,
					"delta":     25.5,
					"deltaType": "increase",
				},
				map[string]interface{}{
					"service":   "S3",
					"amount":    80.25,
					"delta":     15.3,
					"deltaType": "decrease",
				},
			},
			mockError:          nil,
			expectedStatusCode: http.StatusOK,
			expectJSONData:     true,
		},
		{
			name:   "successful cost retrieval with empty data",
			userID: "test-user-id",
			config: &configuration{
				AWSAccessKeyID:     "test-key",
				AWSSecretAccessKey: "test-secret",
				AWSRegion:          "us-east-1",
			},
			mockCosts:          []interface{}{},
			mockError:          nil,
			expectedStatusCode: http.StatusOK,
			expectJSONData:     true,
		},
		{
			name:   "bad request - missing credentials",
			userID: "test-user-id",
			config: &configuration{
				AWSAccessKeyID:     "",
				AWSSecretAccessKey: "",
				AWSRegion:          "us-east-1",
			},
			mockCosts:          nil,
			mockError:          nil,
			expectedStatusCode: http.StatusBadRequest,
			expectJSONData:     false,
		},
		{
			name:   "unauthorized - no user ID",
			userID: "",
			config: &configuration{
				AWSAccessKeyID:     "test-key",
				AWSSecretAccessKey: "test-secret",
				AWSRegion:          "us-east-1",
			},
			mockCosts:          nil,
			mockError:          nil,
			expectedStatusCode: http.StatusUnauthorized,
			expectJSONData:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockPlugin := new(MockPluginForIntegration)
			mockPlugin.setConfig(tt.config)

			if tt.mockCosts != nil || tt.mockError != nil {
				mockPlugin.On("GetAWSCosts").Return(tt.mockCosts, tt.mockError)
			}

			api := &API{plugin: mockPlugin}
			router := setupTestRouter(api)

			req := httptest.NewRequest("GET", "/aws/costs", nil)
			if tt.userID != "" {
				req.Header.Set("Mattermost-User-ID", tt.userID)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatusCode, w.Code)

			if tt.expectJSONData {
				var data []interface{}
				err := json.NewDecoder(w.Body).Decode(&data)
				assert.NoError(t, err)
			} else {
				var errorResp model.ErrorResponse
				err := json.NewDecoder(w.Body).Decode(&errorResp)
				assert.NoError(t, err)
				assert.NotEmpty(t, errorResp.Error)
			}

			mockPlugin.AssertExpectations(t)
		})
	}
}

func TestAPIRouting(t *testing.T) {
	t.Run("routes are properly registered", func(t *testing.T) {
		mockPlugin := new(MockPluginForIntegration)
		mockPlugin.setConfig(&configuration{
			AWSAccessKeyID:     "test-key",
			AWSSecretAccessKey: "test-secret",
			AWSRegion:          "us-east-1",
		})

		api := &API{plugin: mockPlugin}
		router := setupTestRouter(api)

		// Test that routes exist (will get 401/400 but route is registered)
		req1 := httptest.NewRequest("GET", "/aws/resources", nil)
		w1 := httptest.NewRecorder()
		router.ServeHTTP(w1, req1)
		assert.NotEqual(t, http.StatusNotFound, w1.Code)

		req2 := httptest.NewRequest("GET", "/aws/costs", nil)
		w2 := httptest.NewRecorder()
		router.ServeHTTP(w2, req2)
		assert.NotEqual(t, http.StatusNotFound, w2.Code)
	})

	t.Run("invalid route returns 404", func(t *testing.T) {
		mockPlugin := new(MockPluginForIntegration)
		api := &API{plugin: mockPlugin}
		router := setupTestRouter(api)

		req := httptest.NewRequest("GET", "/aws/invalid", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("incorrect HTTP method returns 405 or 404", func(t *testing.T) {
		mockPlugin := new(MockPluginForIntegration)
		api := &API{plugin: mockPlugin}
		router := setupTestRouter(api)

		req := httptest.NewRequest("POST", "/aws/resources", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Gorilla Mux returns 405 for method mismatch, or 404 if not found
		assert.True(t, w.Code == http.StatusMethodNotAllowed || w.Code == http.StatusNotFound)
	})
}
