package routes

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRouteAlignment_AdminCompatibilityEndpointsExist(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	cfg := &config.Config{JWTSecretKey: "test-secret", UploadFolder: "uploads"}
	require.NoError(t, SetupRoutes(r, cfg))

	cases := []struct {
		name   string
		method string
		path   string
		body   []byte
	}{
		{name: "ai analyze", method: http.MethodPost, path: "/api/admin/articles/ai-analyze", body: []byte(`{}`)},
		{name: "comments export", method: http.MethodGet, path: "/api/admin/comments/export"},
		{name: "comments limits", method: http.MethodGet, path: "/api/admin/comments/limits"},
		{name: "admin logout", method: http.MethodPost, path: "/api/admin/logout"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, bytes.NewReader(tc.body))
			if tc.body != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			assert.NotEqual(t, http.StatusNotFound, w.Code, "route should exist")
		})
	}
}

func TestSetupRoutesPropagatesDependencyErrorsWithoutReplacingInjectedServices(t *testing.T) {
	r := gin.New()
	previousConfig := runtimeConfig
	previousMedia := mediaService
	previousAvatar := avatarService
	previousRevalidation := revalidationAdmin

	err := SetupRoutes(r, &config.Config{StorageDriver: "unsupported"})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "configure route services")
	assert.Contains(t, err.Error(), "unsupported storage driver")
	assert.Same(t, previousConfig, runtimeConfig)
	assert.Same(t, previousMedia, mediaService)
	assert.Same(t, previousAvatar, avatarService)
	assert.Same(t, previousRevalidation, revalidationAdmin)
	assert.Empty(t, r.Routes())
}

func TestRouteAlignment_LegacySkillsAndContactsRoutesRemoved(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	cfg := &config.Config{JWTSecretKey: "test-secret", UploadFolder: "uploads"}
	require.NoError(t, SetupRoutes(r, cfg))

	cases := []struct {
		name   string
		method string
		path   string
	}{
		{name: "public skills", method: http.MethodGet, path: "/api/skills"},
		{name: "public contacts", method: http.MethodGet, path: "/api/contacts"},
		{name: "admin skills list", method: http.MethodGet, path: "/api/admin/skills"},
		{name: "admin contacts list", method: http.MethodGet, path: "/api/admin/contacts"},
		{name: "admin skills delete", method: http.MethodDelete, path: "/api/admin/skills/1"},
		{name: "admin contacts delete", method: http.MethodDelete, path: "/api/admin/contacts/1"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			assert.Equal(t, http.StatusNotFound, w.Code)
		})
	}
}
