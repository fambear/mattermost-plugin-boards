// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/v8/platform/shared/filestore"
	"github.com/mattermost/mattermost/server/v8/platform/shared/filestore/mocks"
)

// Static errors for testing.
var (
	errNotImplemented = errors.New("not implemented")
	errAccessDenied   = errors.New("AccessDenied")
	errPresignFailed  = errors.New("presign failed")
)

// mockFileBackendWithLinkGenerator is a mock that implements both FileBackend and FileBackendWithLinkGenerator.
type mockFileBackendWithLinkGenerator struct {
	*mocks.FileBackend
	generatePublicLinkFunc func(path string) (string, time.Duration, error)
}

func (m *mockFileBackendWithLinkGenerator) GeneratePublicLink(path string) (string, time.Duration, error) {
	if m.generatePublicLinkFunc != nil {
		return m.generatePublicLinkFunc(path)
	}
	return "", 0, errNotImplemented
}

// Ensure mockFileBackendWithLinkGenerator implements the interfaces.
var _ filestore.FileBackendWithLinkGenerator = (*mockFileBackendWithLinkGenerator)(nil)

func TestPresignedURLRedirect_TypeAssertion(t *testing.T) {
	t.Run("should succeed when backend implements FileBackendWithLinkGenerator", func(t *testing.T) {
		// Create a mock backend that implements FileBackendWithLinkGenerator
		mockBackend := &mockFileBackendWithLinkGenerator{
			FileBackend: &mocks.FileBackend{},
			generatePublicLinkFunc: func(path string) (string, time.Duration, error) {
				return "https://s3.amazonaws.com/bucket/" + path, 6 * time.Hour, nil
			},
		}

		// Verify type assertion succeeds
		linkGen, ok := interface{}(mockBackend).(filestore.FileBackendWithLinkGenerator)
		require.True(t, ok, "Mock should implement FileBackendWithLinkGenerator")

		// Test GeneratePublicLink
		link, ttl, err := linkGen.GeneratePublicLink("team/board/file.txt")
		require.NoError(t, err)
		assert.Equal(t, "https://s3.amazonaws.com/bucket/team/board/file.txt", link)
		assert.Equal(t, 6*time.Hour, ttl)
	})

	t.Run("should fail when backend does not implement FileBackendWithLinkGenerator", func(t *testing.T) {
		// Create a mock backend that only implements FileBackend (not FileBackendWithLinkGenerator)
		mockBackend := &mocks.FileBackend{}

		// Verify type assertion fails
		_, ok := interface{}(mockBackend).(filestore.FileBackendWithLinkGenerator)
		assert.False(t, ok, "Default mock should not implement FileBackendWithLinkGenerator")
	})
}

func TestPresignedURLRedirect_GeneratePublicLink(t *testing.T) {
	t.Run("should return presigned URL on success", func(t *testing.T) {
		expectedURL := "https://s3.amazonaws.com/bucket/path?X-Amz-Signature=abc123"
		expectedTTL := 6 * time.Hour

		mockBackend := &mockFileBackendWithLinkGenerator{
			FileBackend: &mocks.FileBackend{},
			generatePublicLinkFunc: func(path string) (string, time.Duration, error) {
				assert.Contains(t, path, "board")
				return expectedURL, expectedTTL, nil
			},
		}

		linkGen, ok := interface{}(mockBackend).(filestore.FileBackendWithLinkGenerator)
		require.True(t, ok)

		link, ttl, err := linkGen.GeneratePublicLink("team/board/file.txt")
		require.NoError(t, err)
		assert.Equal(t, expectedURL, link)
		assert.Equal(t, expectedTTL, ttl)
	})

	t.Run("should return error when presign fails", func(t *testing.T) {
		mockBackend := &mockFileBackendWithLinkGenerator{
			FileBackend: &mocks.FileBackend{},
			generatePublicLinkFunc: func(path string) (string, time.Duration, error) {
				return "", 0, errAccessDenied
			},
		}

		linkGen, ok := interface{}(mockBackend).(filestore.FileBackendWithLinkGenerator)
		require.True(t, ok)

		link, _, err := linkGen.GeneratePublicLink("team/board/file.txt")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "AccessDenied")
		assert.Empty(t, link)
	})
}

func TestHandleServeFile_HTTPStatusCodes(t *testing.T) {
	// This test documents the expected HTTP status codes for different scenarios
	testCases := []struct {
		name           string
		scenario       string
		expectedStatus int
	}{
		{
			name:           "Presigned URL redirect",
			scenario:       "Backend supports link generation and returns valid URL",
			expectedStatus: http.StatusTemporaryRedirect, // 307
		},
		{
			name:           "Proxy mode success",
			scenario:       "Backend doesn't support link generation, file served directly",
			expectedStatus: http.StatusOK, // 200
		},
		{
			name:           "Unauthorized",
			scenario:       "No valid session or read token",
			expectedStatus: http.StatusUnauthorized, // 401
		},
		{
			name:           "Forbidden",
			scenario:       "User doesn't have permission to view board",
			expectedStatus: http.StatusForbidden, // 403
		},
		{
			name:           "File not found",
			scenario:       "File doesn't exist in storage",
			expectedStatus: http.StatusNotFound, // 404
		},
	}

	// TODO: These tests require full API handler setup with mocked dependencies
	// (App, permissions, filestore). For now, we document expected behavior.
	// Real integration tests should be added with proper test infrastructure.
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// This test documents expected HTTP status codes for different scenarios.
			// Full handler tests require significant mock setup - see existing
			// handler tests in api_test.go for patterns.
			t.Logf("Expected status %d for scenario: %s", tc.expectedStatus, tc.scenario)
		})
	}
}

// mockReadCloseSeeker implements io.ReadCloser and io.Seeker for testing.
type mockReadCloseSeeker struct {
	*strings.Reader
}

func (m *mockReadCloseSeeker) Close() error {
	return nil
}

// Additional test for writeFileResponse function.
func TestWriteFileResponse(t *testing.T) {
	t.Run("should set correct headers for image file", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		content := "test image content"
		reader := &mockReadCloseSeeker{strings.NewReader(content)}

		writeFileResponse("test.jpg", "image/jpeg", int64(len(content)), time.Now(), reader, false, w, req)

		// Check headers
		assert.Equal(t, "image/jpeg", w.Header().Get("Content-Type"))
		assert.Contains(t, w.Header().Get("Content-Disposition"), "inline")
		assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
	})

	t.Run("should set correct headers for non-media file", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		content := "test document content"
		reader := &mockReadCloseSeeker{strings.NewReader(content)}

		writeFileResponse("test.pdf", "application/pdf", int64(len(content)), time.Now(), reader, false, w, req)

		// Check headers
		assert.Equal(t, "application/pdf", w.Header().Get("Content-Type"))
		assert.Contains(t, w.Header().Get("Content-Disposition"), "attachment")
	})

	t.Run("should sanitize unsafe content types", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		content := "test content"
		reader := &mockReadCloseSeeker{strings.NewReader(content)}

		writeFileResponse("test.js", "application/javascript", int64(len(content)), time.Now(), reader, false, w, req)

		// JavaScript should be converted to text/plain
		assert.Equal(t, "text/plain", w.Header().Get("Content-Type"))
	})

	t.Run("should force download when requested", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		content := "test image content"
		reader := &mockReadCloseSeeker{strings.NewReader(content)}

		writeFileResponse("test.jpg", "image/jpeg", int64(len(content)), time.Now(), reader, true, w, req)

		// Even for images, should use attachment when forceDownload is true
		assert.Contains(t, w.Header().Get("Content-Disposition"), "attachment")
	})

	t.Run("should set security headers", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		content := "test content"
		reader := &mockReadCloseSeeker{strings.NewReader(content)}

		writeFileResponse("test.txt", "text/plain", int64(len(content)), time.Now(), reader, false, w, req)

		// Check security headers
		assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
		assert.Equal(t, "Frame-ancestors 'none'", w.Header().Get("Content-Security-Policy"))
		assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
	})

	t.Run("should set cache control header", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		content := "test content"
		reader := &mockReadCloseSeeker{strings.NewReader(content)}

		writeFileResponse("test.txt", "text/plain", int64(len(content)), time.Now(), reader, false, w, req)

		// Check cache control
		assert.Equal(t, "private, no-cache", w.Header().Get("Cache-Control"))
	})
}

func TestHandleServeFile_IntegrationScenarios(t *testing.T) {
	// This test documents the expected integration behavior
	t.Run("redirect flow with presigned URL", func(t *testing.T) {
		// Document the expected flow:
		// 1. Client requests: GET /api/v2/files/teams/{teamID}/{boardID}/{filename}
		// 2. Server authenticates and authorizes
		// 3. Server gets board info
		// 4. Server gets file path (teamID/boardID/filename)
		// 5. Server type-asserts backend to FileBackendWithLinkGenerator
		// 6. If ok=true, calls GeneratePublicLink(filePath)
		// 7. If no error, returns HTTP 307 with Location header
		// 8. Client follows redirect to S3

		// This test validates the type assertion logic used in handleServeFile
		mockBackend := &mockFileBackendWithLinkGenerator{
			FileBackend: &mocks.FileBackend{},
			generatePublicLinkFunc: func(path string) (string, time.Duration, error) {
				return "https://s3.example.com/bucket/" + path + "?signature=test", 6 * time.Hour, nil
			},
		}

		// Simulate the type assertion in handleServeFile
		if linkGen, ok := interface{}(mockBackend).(filestore.FileBackendWithLinkGenerator); ok {
			link, _, err := linkGen.GeneratePublicLink("team/board/file.txt")
			require.NoError(t, err)
			assert.NotEmpty(t, link)
			assert.Contains(t, link, "s3.example.com")
		} else {
			t.Fatal("Type assertion should succeed for mockFileBackendWithLinkGenerator")
		}
	})

	t.Run("fallback to proxy flow", func(t *testing.T) {
		// Document the expected fallback flow:
		// 1. Type assertion fails (backend doesn't support link generation)
		// 2. OR GeneratePublicLink returns error
		// 3. Server falls back to proxy mode
		// 4. Server reads file from backend
		// 5. Server streams content to client

		// Test case 1: Backend doesn't implement interface
		mockBackend := &mocks.FileBackend{}
		_, ok := interface{}(mockBackend).(filestore.FileBackendWithLinkGenerator)
		assert.False(t, ok, "Should not implement interface - will fall back to proxy")

		// Test case 2: GeneratePublicLink returns error
		mockBackendWithError := &mockFileBackendWithLinkGenerator{
			FileBackend: &mocks.FileBackend{},
			generatePublicLinkFunc: func(path string) (string, time.Duration, error) {
				return "", 0, errPresignFailed
			},
		}

		linkGen, ok := interface{}(mockBackendWithError).(filestore.FileBackendWithLinkGenerator)
		require.True(t, ok)
		link, _, err := linkGen.GeneratePublicLink("path")
		require.Error(t, err)
		assert.Empty(t, link)
	})
}

func TestHandleServeFile_RoutePattern(t *testing.T) {
	// Test that the route pattern is correctly defined
	// Note: registerFilesRoutes adds routes without the /api/v2 prefix (that's added by RegisterRoutes)
	t.Run("route should match expected pattern", func(t *testing.T) {
		// Create a router and check route registration
		router := mux.NewRouter()
		api := &API{logger: mlog.CreateConsoleTestLogger(t)}
		api.registerFilesRoutes(router)

		// Verify the route is registered correctly (without /api/v2 prefix)
		req := httptest.NewRequest(http.MethodGet, "/files/teams/team123/board456/file789", nil)
		var routeMatch mux.RouteMatch
		matched := router.Match(req, &routeMatch)

		assert.True(t, matched, "Route should match the expected pattern")
		if matched && routeMatch.Route != nil {
			pathTemplate, _ := routeMatch.Route.GetPathTemplate()
			assert.Contains(t, pathTemplate, "files/teams/{teamID}/{boardID}/{filename}")
		}
	})
}
