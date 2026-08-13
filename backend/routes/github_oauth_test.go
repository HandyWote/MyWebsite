package routes

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// githubOAuthTestConfig sets a fully configured GitHub OAuth environment.
func githubOAuthTestConfig(t *testing.T) {
	t.Helper()
	t.Setenv("GITHUB_OAUTH_CLIENT_ID", "test-client-id")
	t.Setenv("GITHUB_OAUTH_CLIENT_SECRET", "test-client-secret")
	t.Setenv("GITHUB_OAUTH_REDIRECT_URI", "https://example.com/api/auth/github/callback")
	t.Setenv("JWT_SECRET_KEY", "test-jwt-secret")
}

// githubOAuthTestRouter mounts only the three handlers under test, without
// depending on SetupRoutes or a database.
func githubOAuthTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.GET("/api/auth/github/authorize", GithubOAuthAuthorize)
	r.GET("/api/auth/github/callback", GithubOAuthCallback)
	r.POST("/api/auth/exchange", GithubOAuthExchange)
	return r
}

func githubOAuthGet(t *testing.T, router http.Handler, path string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func githubOAuthPost(t *testing.T, router http.Handler, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/exchange", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

// githubOAuthStateFromAuthorize runs authorize and returns the state cookie
// (plus all cookies for replaying the round-trip).
func githubOAuthStateFromAuthorize(t *testing.T, router http.Handler, query string) (string, []*http.Cookie) {
	t.Helper()
	w := githubOAuthGet(t, router, "/api/auth/github/authorize"+query)
	require.Equal(t, http.StatusFound, w.Code)
	var state string
	for _, cookie := range w.Result().Cookies() {
		if cookie.Name == githubOAuthStateCookieName {
			state = cookie.Value
		}
	}
	require.NotEmpty(t, state, "authorize should set a state cookie")
	return state, w.Result().Cookies()
}

func TestGithubOAuthAuthorizeNotConfigured(t *testing.T) {
	t.Setenv("GITHUB_OAUTH_CLIENT_ID", "")
	t.Setenv("GITHUB_OAUTH_CLIENT_SECRET", "")
	t.Setenv("GITHUB_OAUTH_REDIRECT_URI", "")
	router := githubOAuthTestRouter()

	w := githubOAuthGet(t, router, "/api/auth/github/authorize")

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.JSONEq(t, `{"error":"github oauth not configured"}`, w.Body.String())
}

func TestGithubOAuthAuthorizeRedirect(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	w := githubOAuthGet(t, router, "/api/auth/github/authorize")

	require.Equal(t, http.StatusFound, w.Code)
	loc, err := url.Parse(w.Header().Get("Location"))
	require.NoError(t, err)
	assert.Equal(t, "github.com", loc.Host)
	assert.Equal(t, "/login/oauth/authorize", loc.Path)
	q := loc.Query()
	assert.Equal(t, "test-client-id", q.Get("client_id"))
	assert.Equal(t, "https://example.com/api/auth/github/callback", q.Get("redirect_uri"))
	assert.Equal(t, "read:user", q.Get("scope"))
	state := q.Get("state")
	assert.Len(t, state, 64, "state should be 32 random bytes hex-encoded")

	var stateCookie *http.Cookie
	for _, cookie := range w.Result().Cookies() {
		if cookie.Name == githubOAuthStateCookieName {
			stateCookie = cookie
		}
	}
	require.NotNil(t, stateCookie, "authorize should set the state cookie")
	assert.Equal(t, state, stateCookie.Value, "query state must match cookie state")
	assert.True(t, stateCookie.HttpOnly)
	assert.True(t, stateCookie.Secure, "Secure flag follows the https redirect URI")
	assert.Equal(t, http.SameSiteLaxMode, stateCookie.SameSite)
}

func TestGithubOAuthAuthorizeRedirectToValidation(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	for _, tc := range []struct {
		name       string
		redirectTo string
		wantStored bool
	}{
		{"valid site path is stored", "/articles/42", true},
		{"protocol-relative URL is ignored", "//evil.example.com", false},
		{"backslash path is ignored", `/\\evil.example.com`, false},
		{"absolute URL is ignored", "https://evil.example.com", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := githubOAuthGet(t, router, "/api/auth/github/authorize?redirect_to="+url.QueryEscape(tc.redirectTo))
			require.Equal(t, http.StatusFound, w.Code)

			var redirectCookie *http.Cookie
			for _, cookie := range w.Result().Cookies() {
				if cookie.Name == githubOAuthRedirectCookieName {
					redirectCookie = cookie
				}
			}
			if tc.wantStored {
				require.NotNil(t, redirectCookie, "valid redirect_to should be stored in a cookie")
				// gin percent-encodes cookie values on write (and decodes on read),
				// so compare against the decoded value.
				decoded, err := url.QueryUnescape(redirectCookie.Value)
				require.NoError(t, err)
				assert.Equal(t, tc.redirectTo, decoded)
			} else {
				assert.Nil(t, redirectCookie, "invalid redirect_to should be ignored")
			}
		})
	}
}

func TestGithubOAuthCallbackInvalidState(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	// No cookie at all.
	w := githubOAuthGet(t, router, "/api/auth/github/callback?state=abc&code=x")
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.JSONEq(t, `{"error":"invalid oauth state"}`, w.Body.String())

	// Cookie does not match the query state.
	w = githubOAuthGet(t, router, "/api/auth/github/callback?state=expected&code=x",
		&http.Cookie{Name: githubOAuthStateCookieName, Value: "something-else"})
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.JSONEq(t, `{"error":"invalid oauth state"}`, w.Body.String())

	// No state query param at all.
	state, cookies := githubOAuthStateFromAuthorize(t, router, "")
	w = githubOAuthGet(t, router, "/api/auth/github/callback?code=x", cookies...)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.NotEmpty(t, state)
}

func TestGithubOAuthCallbackGithubError(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	state, cookies := githubOAuthStateFromAuthorize(t, router, "?redirect_to=/games")
	w := githubOAuthGet(t, router, "/api/auth/github/callback?error=access_denied&state="+state, cookies...)
	require.Equal(t, http.StatusFound, w.Code)

	loc, err := url.Parse(w.Header().Get("Location"))
	require.NoError(t, err)
	assert.Equal(t, "example.com", loc.Host)
	assert.Equal(t, "/auth/callback", loc.Path)
	assert.Equal(t, "access_denied", loc.Query().Get("error"))
	assert.Equal(t, "/games", loc.Query().Get("redirect_to"), "redirect_to survives the error round-trip")
}

func TestGithubOAuthCallbackSuccessAndExchange(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	// Mock GitHub token endpoint.
	var tokenForm url.Values
	tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "application/json", r.Header.Get("Accept"))
		require.NoError(t, r.ParseForm())
		tokenForm = r.PostForm
		assert.Equal(t, "test-client-id", r.PostFormValue("client_id"))
		assert.Equal(t, "test-client-secret", r.PostFormValue("client_secret"))
		assert.Equal(t, "github-code-123", r.PostFormValue("code"))
		assert.Equal(t, "https://example.com/api/auth/github/callback", r.PostFormValue("redirect_uri"))
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"access_token":"gho_mock_token","token_type":"bearer"}`)
	}))
	defer tokenServer.Close()

	// Mock GitHub user endpoint.
	userServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "Bearer gho_mock_token", r.Header.Get("Authorization"))
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"id":12345678,"login":"octocat","name":"Octo Cat","avatar_url":"https://avatars.example.com/octocat.png","email":"octo@example.com"}`)
	}))
	defer userServer.Close()

	// Point the handlers at the mock servers.
	oldTokenURL, oldUserURL := githubOAuthTokenEndpoint, githubAPIUserEndpoint
	githubOAuthTokenEndpoint, githubAPIUserEndpoint = tokenServer.URL, userServer.URL
	defer func() { githubOAuthTokenEndpoint, githubAPIUserEndpoint = oldTokenURL, oldUserURL }()

	// Replace the repository dependency (no DB in unit tests).
	var upserted struct {
		providerID, username, displayName, avatarURL, email string
	}
	oldUpserter := githubUserUpserter
	githubUserUpserter = func(_ context.Context, providerID, username, displayName, avatarURL, email string) (*models.User, error) {
		upserted.providerID, upserted.username, upserted.displayName, upserted.avatarURL, upserted.email = providerID, username, displayName, avatarURL, email
		return &models.User{Username: username, DisplayName: displayName, AvatarURL: avatarURL}, nil
	}
	defer func() { githubUserUpserter = oldUpserter }()

	// Step 1: authorize, capturing the state cookie.
	_, cookies := githubOAuthStateFromAuthorize(t, router, "?redirect_to=/articles/42")

	t.Run("callback", func(t *testing.T) {
		state := ""
		for _, cookie := range cookies {
			if cookie.Name == githubOAuthStateCookieName {
				state = cookie.Value
			}
		}
		require.NotEmpty(t, state)

		w := githubOAuthGet(t, router, "/api/auth/github/callback?code=github-code-123&state="+state, cookies...)
		require.Equal(t, http.StatusFound, w.Code)

		loc, err := url.Parse(w.Header().Get("Location"))
		require.NoError(t, err)
		assert.Equal(t, "example.com", loc.Host)
		assert.Equal(t, "/auth/callback", loc.Path)
		oneTimeCode := loc.Query().Get("code")
		require.NotEmpty(t, oneTimeCode, "callback should issue a one-time code")
		assert.Equal(t, "/articles/42", loc.Query().Get("redirect_to"))

		// Upsert called with the GitHub profile.
		assert.Equal(t, "12345678", upserted.providerID)
		assert.Equal(t, "octocat", upserted.username)
		assert.Equal(t, "Octo Cat", upserted.displayName)
		assert.Equal(t, "https://avatars.example.com/octocat.png", upserted.avatarURL)
		assert.Equal(t, "octo@example.com", upserted.email)
		assert.Equal(t, "github-code-123", tokenForm.Get("code"))

		// State cookie cleared after the callback.
		var cleared bool
		for _, cookie := range w.Result().Cookies() {
			if cookie.Name == githubOAuthStateCookieName && cookie.Value == "" {
				cleared = true
			}
		}
		assert.True(t, cleared, "state cookie should be cleared after callback")

		// Step 3: exchange the one-time code for a JWT.
		ex := githubOAuthPost(t, router, fmt.Sprintf(`{"code":%q}`, oneTimeCode))
		require.Equal(t, http.StatusOK, ex.Code)

		var resp struct {
			Token      string `json:"token"`
			RedirectTo string `json:"redirect_to"`
			User       struct {
				Username    string `json:"username"`
				Provider    string `json:"provider"`
				AvatarURL   string `json:"avatar_url"`
				DisplayName string `json:"display_name"`
			} `json:"user"`
		}
		require.NoError(t, json.Unmarshal(ex.Body.Bytes(), &resp))
		assert.NotEmpty(t, resp.Token)
		assert.Equal(t, "/articles/42", resp.RedirectTo)
		assert.Equal(t, "octocat", resp.User.Username)
		assert.Equal(t, "github", resp.User.Provider)
		assert.Equal(t, "Octo Cat", resp.User.DisplayName)
		assert.Equal(t, "https://avatars.example.com/octocat.png", resp.User.AvatarURL)

		// JWT carries username + github provider.
		claims := &middleware.Claims{}
		_, err = jwt.ParseWithClaims(resp.Token, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte("test-jwt-secret"), nil
		})
		require.NoError(t, err)
		assert.Equal(t, "octocat", claims.Username)
		assert.Equal(t, "github", claims.Provider)
	})
}

func TestGithubOAuthCallbackAPIError(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	tokenServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer tokenServer.Close()
	oldTokenURL := githubOAuthTokenEndpoint
	githubOAuthTokenEndpoint = tokenServer.URL
	defer func() { githubOAuthTokenEndpoint = oldTokenURL }()

	_, cookies := githubOAuthStateFromAuthorize(t, router, "")
	state := ""
	for _, cookie := range cookies {
		if cookie.Name == githubOAuthStateCookieName {
			state = cookie.Value
		}
	}
	require.NotEmpty(t, state)
	w := githubOAuthGet(t, router, "/api/auth/github/callback?code=bad-code&state="+state, cookies...)
	require.Equal(t, http.StatusFound, w.Code)

	loc, err := url.Parse(w.Header().Get("Location"))
	require.NoError(t, err)
	assert.Equal(t, "/auth/callback", loc.Path)
	assert.Equal(t, "github_error", loc.Query().Get("error"))
}

func TestGithubOAuthExchangeMissingCode(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	w := githubOAuthPost(t, router, `{}`)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGithubOAuthExchangeSingleUse(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	code, err := githubOAuthCodeStore.issue(oauthExchangePayload{
		Username:    "octocat",
		DisplayName: "Octo Cat",
		AvatarURL:   "https://avatars.example.com/octocat.png",
		RedirectTo:  "/x",
	})
	require.NoError(t, err)

	first := githubOAuthPost(t, router, fmt.Sprintf(`{"code":%q}`, code))
	assert.Equal(t, http.StatusOK, first.Code)

	second := githubOAuthPost(t, router, fmt.Sprintf(`{"code":%q}`, code))
	assert.Equal(t, http.StatusUnauthorized, second.Code)
	assert.JSONEq(t, `{"error":"invalid or expired code"}`, second.Body.String())
}

func TestGithubOAuthExchangeExpiredCode(t *testing.T) {
	githubOAuthTestConfig(t)
	router := githubOAuthTestRouter()

	// Injectable clock: issue under the real 60s TTL, then advance past it.
	now := time.Now()
	store := newOneTimeCodeStore(60*time.Second, func() time.Time { return now })
	oldStore := githubOAuthCodeStore
	githubOAuthCodeStore = store
	defer func() { githubOAuthCodeStore = oldStore }()

	code, err := store.issue(oauthExchangePayload{Username: "octocat"})
	require.NoError(t, err)

	now = now.Add(61 * time.Second)

	w := githubOAuthPost(t, router, fmt.Sprintf(`{"code":%q}`, code))
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.JSONEq(t, `{"error":"invalid or expired code"}`, w.Body.String())

	// The expired code is gone for good.
	_, ok := store.consume(code)
	assert.False(t, ok)
}
