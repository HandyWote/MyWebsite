package routes

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/config"
	"github.com/handywote/website/middleware"
	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/utils"
)

const (
	githubOAuthStateCookieName = "github_oauth_state"
	// githubOAuthRedirectCookieName carries the site-internal return path
	// picked up by the callback; not httpOnly (it is not a secret) and
	// re-validated on the way back.
	githubOAuthRedirectCookieName = "github_oauth_redirect"
	// githubOAuthStateCookieMaxAge keeps the state cookie alive across the
	// whole GitHub authorization round-trip (seconds).
	githubOAuthStateCookieMaxAge = 600
	// githubOAuthCodeTTL is the lifetime of the single-use code handed to the
	// frontend; it only needs to survive the POST to /api/auth/exchange.
	githubOAuthCodeTTL = 60 * time.Second
)

// GitHub endpoint URLs are package-level so tests can point them at mock
// servers (httptest) without touching the handlers.
var (
	githubOAuthAuthorizeEndpoint = "https://github.com/login/oauth/authorize"
	githubOAuthTokenEndpoint     = "https://github.com/login/oauth/access_token"
	githubAPIUserEndpoint        = "https://api.github.com/user"
)

var githubOAuthHTTPClient = &http.Client{Timeout: 10 * time.Second}

// oauthExchangePayload is the data carried by a one-time code: everything the
// exchange endpoint needs to mint a JWT and hand the frontend its return path.
type oauthExchangePayload struct {
	Username    string
	DisplayName string
	AvatarURL   string
	RedirectTo  string
}

type oneTimeCodeEntry struct {
	payload   oauthExchangePayload
	expiresAt time.Time
}

// oneTimeCodeStore is an in-memory store for single-use OAuth codes. Codes
// are cryptographically random 32-byte hex strings, expire after ttl, and are
// deleted on first consumption (successful or not).
//
// NOTE: single-instance assumption. Codes live in process memory only, so a
// multi-instance deployment would issue codes that a different instance
// cannot redeem; such deployments must back this store with the database.
type oneTimeCodeStore struct {
	mu    sync.Mutex
	codes map[string]oneTimeCodeEntry
	ttl   time.Duration
	now   func() time.Time // injectable clock for tests
}

func newOneTimeCodeStore(ttl time.Duration, now func() time.Time) *oneTimeCodeStore {
	return &oneTimeCodeStore{
		codes: make(map[string]oneTimeCodeEntry),
		ttl:   ttl,
		now:   now,
	}
}

// issue generates a fresh random code bound to payload.
func (s *oneTimeCodeStore) issue(payload oauthExchangePayload) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate oauth code: %w", err)
	}
	code := hex.EncodeToString(raw)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.purgeLocked()
	s.codes[code] = oneTimeCodeEntry{payload: payload, expiresAt: s.now().Add(s.ttl)}
	return code, nil
}

// consume atomically deletes and returns the entry for code. A missing,
// expired, or already-consumed code yields false (codes are single use).
func (s *oneTimeCodeStore) consume(code string) (oauthExchangePayload, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry, ok := s.codes[code]
	if !ok {
		return oauthExchangePayload{}, false
	}
	delete(s.codes, code)
	if s.now().After(entry.expiresAt) {
		return oauthExchangePayload{}, false
	}
	return entry.payload, true
}

// purgeLocked drops expired entries; callers must hold s.mu.
func (s *oneTimeCodeStore) purgeLocked() {
	now := s.now()
	for code, entry := range s.codes {
		if now.After(entry.expiresAt) {
			delete(s.codes, code)
		}
	}
}

// githubOAuthCodeStore is the process-wide default store.
var githubOAuthCodeStore = newOneTimeCodeStore(githubOAuthCodeTTL, time.Now)

// githubUserUpserter persists the authenticated GitHub identity. It defaults
// to the real user repository and is overridden in tests to avoid a DB
// dependency (see github_oauth_test.go).
var githubUserUpserter = func(ctx context.Context, providerID, username, displayName, avatarURL, email string) (*models.User, error) {
	return repositories.NewUserRepository().UpsertGitHubUser(ctx, providerID, username, displayName, avatarURL, email)
}

// randomHex returns byteLen random bytes hex-encoded.
func randomHex(byteLen int) (string, error) {
	raw := make([]byte, byteLen)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate random bytes: %w", err)
	}
	return hex.EncodeToString(raw), nil
}

// sanitizeRedirectTo returns path only when it is a safe site-internal path:
// starts with "/", is not protocol-relative ("//..."), and contains no
// backslashes (browsers normalize "\" to "/" for special URL schemes, which
// would turn "/\evil.com" into "//evil.com"). Anything else yields "".
func sanitizeRedirectTo(path string) string {
	if path == "" || !strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") || strings.Contains(path, "\\") {
		return ""
	}
	return path
}

// githubCallbackIsHTTPS reports whether the configured callback URI uses TLS;
// the state cookie's Secure flag follows it.
func githubCallbackIsHTTPS(redirectURI string) bool {
	u, err := url.Parse(redirectURI)
	return err == nil && u.Scheme == "https"
}

// githubFrontendCallbackURL derives the frontend /auth/callback address from
// the configured backend callback URI, e.g.
//
//	https://example.com/api/auth/github/callback -> https://example.com/auth/callback
//
// Returns "" when the URI cannot be mapped.
func githubFrontendCallbackURL(redirectURI string) string {
	u, err := url.Parse(redirectURI)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return ""
	}
	if !strings.HasSuffix(u.Path, "/api/auth/github/callback") {
		return ""
	}
	frontend := *u
	frontend.Path = strings.TrimSuffix(u.Path, "/api/auth/github/callback") + "/auth/callback"
	frontend.RawQuery = ""
	frontend.Fragment = ""
	return frontend.String()
}

// githubFrontendRedirect builds a redirect Location to the frontend callback
// page carrying the given query parameters.
func githubFrontendRedirect(frontendURL string, params url.Values) string {
	if encoded := params.Encode(); encoded != "" {
		return frontendURL + "?" + encoded
	}
	return frontendURL
}

func setGithubOAuthCookies(c *gin.Context, state, redirectTo string, secure bool) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(githubOAuthStateCookieName, state, githubOAuthStateCookieMaxAge, "/", "", secure, true)
	if redirectTo != "" {
		c.SetCookie(githubOAuthRedirectCookieName, redirectTo, githubOAuthStateCookieMaxAge, "/", "", secure, false)
	}
}

func clearGithubOAuthCookies(c *gin.Context, secure bool) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(githubOAuthStateCookieName, "", -1, "/", "", secure, true)
	c.SetCookie(githubOAuthRedirectCookieName, "", -1, "/", "", secure, false)
}

// githubExchangeToken trades the authorization code for an access token via
// GitHub's OAuth access_token endpoint.
func githubExchangeToken(ctx context.Context, cfg *config.Config, code string) (string, error) {
	form := url.Values{}
	form.Set("client_id", cfg.GithubOAuthClientID)
	form.Set("client_secret", cfg.GithubOAuthClientSecret)
	form.Set("code", code)
	form.Set("redirect_uri", cfg.GithubOAuthRedirectURI)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, githubOAuthTokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return "", fmt.Errorf("build token request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := githubOAuthHTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("github token endpoint: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("read token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github token endpoint returned %d", resp.StatusCode)
	}
	var payload struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", fmt.Errorf("decode token response: %w", err)
	}
	if payload.Error != "" {
		return "", fmt.Errorf("github token exchange failed: %s", payload.Error)
	}
	if payload.AccessToken == "" {
		return "", errors.New("github token exchange returned no access_token")
	}
	return payload.AccessToken, nil
}

// githubUserProfile is the subset of GET https://api.github.com/user that the
// application persists.
type githubUserProfile struct {
	ID        string
	Login     string
	Name      string
	AvatarURL string
	Email     string
}

// githubFetchUser loads the authenticated user's profile.
func githubFetchUser(ctx context.Context, accessToken string) (*githubUserProfile, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, githubAPIUserEndpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build user request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := githubOAuthHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("github user endpoint: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read user response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github user endpoint returned %d", resp.StatusCode)
	}
	var payload struct {
		ID        json.Number `json:"id"`
		Login     string      `json:"login"`
		Name      string      `json:"name"`
		AvatarURL string      `json:"avatar_url"`
		Email     string      `json:"email"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("decode user response: %w", err)
	}
	if payload.ID.String() == "" || payload.Login == "" {
		return nil, errors.New("github user response missing id/login")
	}
	return &githubUserProfile{
		ID:        payload.ID.String(),
		Login:     payload.Login,
		Name:      payload.Name,
		AvatarURL: payload.AvatarURL,
		Email:     payload.Email,
	}, nil
}

// GithubOAuthAuthorize starts the GitHub OAuth authorization-code flow: it
// stores a CSRF state in an httpOnly cookie and 302-redirects the browser to
// GitHub. Returns 400 when GitHub OAuth is not configured.
func GithubOAuthAuthorize(c *gin.Context) {
	cfg := config.LoadConfig()
	if cfg.GithubOAuthClientID == "" || cfg.GithubOAuthClientSecret == "" || cfg.GithubOAuthRedirectURI == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "github oauth not configured"})
		return
	}

	state, err := randomHex(32)
	if err != nil {
		utils.ErrorInternal(c, "Failed to generate oauth state")
		return
	}
	secure := githubCallbackIsHTTPS(cfg.GithubOAuthRedirectURI)
	redirectTo := sanitizeRedirectTo(c.Query("redirect_to"))
	setGithubOAuthCookies(c, state, redirectTo, secure)

	authorizeURL, err := url.Parse(githubOAuthAuthorizeEndpoint)
	if err != nil {
		utils.ErrorInternal(c, "Failed to build authorize url")
		return
	}
	q := authorizeURL.Query()
	q.Set("client_id", cfg.GithubOAuthClientID)
	q.Set("redirect_uri", cfg.GithubOAuthRedirectURI)
	q.Set("state", state)
	q.Set("scope", "read:user")
	authorizeURL.RawQuery = q.Encode()

	c.Redirect(http.StatusFound, authorizeURL.String())
}

// GithubOAuthCallback is GitHub's redirect target. It validates the CSRF
// state cookie, exchanges the authorization code for an access token, loads
// the GitHub user, upserts it, and 302-redirects to the frontend
// /auth/callback page with a single-use code (or an error).
func GithubOAuthCallback(c *gin.Context) {
	cfg := config.LoadConfig()
	if cfg.GithubOAuthClientID == "" || cfg.GithubOAuthClientSecret == "" || cfg.GithubOAuthRedirectURI == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "github oauth not configured"})
		return
	}
	frontendURL := githubFrontendCallbackURL(cfg.GithubOAuthRedirectURI)
	if frontendURL == "" {
		utils.ErrorInternal(c, "Failed to build frontend callback url")
		return
	}
	secure := githubCallbackIsHTTPS(cfg.GithubOAuthRedirectURI)

	// CSRF check: the query state must match the httpOnly cookie state.
	cookieState, err := c.Cookie(githubOAuthStateCookieName)
	if err != nil || cookieState == "" || c.Query("state") == "" || cookieState != c.Query("state") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid oauth state"})
		return
	}
	redirectTo := ""
	if cookieValue, cookieErr := c.Cookie(githubOAuthRedirectCookieName); cookieErr == nil {
		redirectTo = sanitizeRedirectTo(cookieValue)
	}
	clearGithubOAuthCookies(c, secure)

	redirectWithError := func(message string) {
		params := url.Values{}
		params.Set("error", message)
		if redirectTo != "" {
			params.Set("redirect_to", redirectTo)
		}
		c.Redirect(http.StatusFound, githubFrontendRedirect(frontendURL, params))
	}

	// GitHub redirects back with ?error=... on denials (e.g. access_denied).
	if githubError := c.Query("error"); githubError != "" {
		redirectWithError(githubError)
		return
	}

	accessToken, err := githubExchangeToken(c.Request.Context(), cfg, c.Query("code"))
	if err != nil {
		redirectWithError("github_error")
		return
	}
	profile, err := githubFetchUser(c.Request.Context(), accessToken)
	if err != nil {
		redirectWithError("github_error")
		return
	}
	user, err := githubUserUpserter(c.Request.Context(), profile.ID, profile.Login, profile.Name, profile.AvatarURL, profile.Email)
	if err != nil {
		redirectWithError("github_error")
		return
	}
	code, err := githubOAuthCodeStore.issue(oauthExchangePayload{
		Username:    user.Username,
		DisplayName: user.DisplayName,
		AvatarURL:   user.AvatarURL,
		RedirectTo:  redirectTo,
	})
	if err != nil {
		redirectWithError("github_error")
		return
	}
	params := url.Values{}
	params.Set("code", code)
	if redirectTo != "" {
		params.Set("redirect_to", redirectTo)
	}
	c.Redirect(http.StatusFound, githubFrontendRedirect(frontendURL, params))
}

// GithubOAuthExchange trades a single-use code for a JWT plus user info. The
// JWT is never placed in a URL: the code travels through the browser and the
// exchange happens over the API.
func GithubOAuthExchange(c *gin.Context) {
	var input struct {
		Code string `json:"code"`
	}
	if err := c.ShouldBindJSON(&input); err != nil || input.Code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}
	payload, ok := githubOAuthCodeStore.consume(input.Code)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired code"})
		return
	}

	cfg := config.LoadConfig()
	token, err := middleware.GenerateToken(payload.Username, "github", cfg.JWTSecretKey, cfg.JWTAccessTokenExpires)
	if err != nil {
		utils.ErrorInternal(c, "Failed to generate token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"username":     payload.Username,
			"provider":     "github",
			"avatar_url":   payload.AvatarURL,
			"display_name": payload.DisplayName,
		},
		"redirect_to": payload.RedirectTo,
	})
}
