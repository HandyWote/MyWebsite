package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
)

var (
	ErrInvalidRevalidationEvent = errors.New("invalid revalidation event")
	ErrMissingRevalidationToken = errors.New("revalidation token is required")
)

const revalidationClaimLease = 30 * time.Second

type RevalidationEvent struct {
	Entity string `json:"entity"`
	Action string `json:"action"`
	IDs    []uint `json:"ids,omitempty"`
}

var allowedRevalidationActions = map[string]map[string]bool{
	"article":    {"create": true, "update": true, "delete": true, "batch": true, "import": true},
	"site-block": {"update": true, "delete": true},
	"avatar":     {"update": true, "delete": true},
}

func NewOutboxRecord(event RevalidationEvent, now time.Time) (models.RevalidationOutbox, error) {
	actions, ok := allowedRevalidationActions[event.Entity]
	if !ok || !actions[event.Action] {
		return models.RevalidationOutbox{}, ErrInvalidRevalidationEvent
	}
	ids, err := json.Marshal(event.IDs)
	if err != nil {
		return models.RevalidationOutbox{}, err
	}
	return models.RevalidationOutbox{
		Entity: event.Entity, Action: event.Action, IDsJSON: string(ids), NextAttemptAt: now,
	}, nil
}

func decodeOutboxEvent(record models.RevalidationOutbox) (RevalidationEvent, error) {
	event := RevalidationEvent{Entity: record.Entity, Action: record.Action}
	if err := json.Unmarshal([]byte(record.IDsJSON), &event.IDs); err != nil {
		return RevalidationEvent{}, err
	}
	_, err := NewOutboxRecord(event, time.Now())
	return event, err
}

type RevalidationWorker struct {
	repository *repositories.RevalidationOutboxRepository
	url        string
	token      string
	client     *http.Client
	now        func() time.Time
}

func NewRevalidationWorker(repository *repositories.RevalidationOutboxRepository, url, token string, client *http.Client) *RevalidationWorker {
	if repository == nil {
		repository = repositories.NewRevalidationOutboxRepository()
	}
	if client == nil {
		client = &http.Client{Timeout: 2 * time.Second}
	}
	return &RevalidationWorker{
		repository: repository,
		url:        strings.TrimRight(strings.TrimSpace(url), "/"),
		token:      strings.TrimSpace(token),
		client:     client,
		now:        time.Now,
	}
}

func (w *RevalidationWorker) Run(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		if err := w.RunOnce(ctx); err != nil && ctx.Err() != nil {
			return
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (w *RevalidationWorker) RunOnce(ctx context.Context) error {
	if w.token == "" {
		return ErrMissingRevalidationToken
	}
	if w.url == "" {
		return errors.New("revalidation URL is required")
	}
	now := w.now()
	events, err := w.repository.ClaimDue(ctx, now, 25, revalidationClaimLease)
	if err != nil {
		return err
	}
	for _, record := range events {
		if err := w.deliver(ctx, record); err != nil {
			attempts := record.Attempts + 1
			if markErr := w.repository.MarkFailed(ctx, record.ID, record.LeaseToken, attempts, w.now().Add(retryDelay(attempts)), redactSecret(err.Error(), w.token)); markErr != nil {
				return markErr
			}
			continue
		}
		if err := w.repository.MarkProcessed(ctx, record.ID, record.LeaseToken, w.now()); err != nil {
			return err
		}
	}
	return nil
}

func (w *RevalidationWorker) deliver(ctx context.Context, record models.RevalidationOutbox) error {
	event, err := decodeOutboxEvent(record)
	if err != nil {
		return err
	}
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	requestCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(requestCtx, http.MethodPost, w.url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+w.token)
	resp, err := w.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("revalidation returned %d: %s", resp.StatusCode, redactSecret(string(body), w.token))
	}
	return nil
}

func retryDelay(attempt int) time.Duration {
	switch attempt {
	case 1:
		return time.Minute
	case 2:
		return 5 * time.Minute
	case 3:
		return 15 * time.Minute
	default:
		return time.Hour
	}
}

func redactSecret(message, secret string) string {
	if secret == "" {
		return message
	}
	return strings.ReplaceAll(message, secret, "[REDACTED]")
}

type RevalidationAdminService struct {
	repository *repositories.RevalidationOutboxRepository
	token      string
}

func NewRevalidationAdminService(repository *repositories.RevalidationOutboxRepository, token string) *RevalidationAdminService {
	if repository == nil {
		repository = repositories.NewRevalidationOutboxRepository()
	}
	return &RevalidationAdminService{repository: repository, token: strings.TrimSpace(token)}
}

func (s *RevalidationAdminService) Retry(ctx context.Context, ids []uint) (int64, error) {
	if s.token == "" {
		return 0, ErrMissingRevalidationToken
	}
	return s.repository.Retry(ctx, ids, time.Now())
}

func (s *RevalidationAdminService) Pending(ctx context.Context) ([]models.RevalidationOutbox, error) {
	return s.repository.Pending(ctx, 100)
}
