package services

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
)

type SiteBlockInput struct {
	Name    string
	Content interface{}
}

type SiteBlockPayload struct {
	ID      uint        `json:"id"`
	Name    string      `json:"name"`
	Content interface{} `json:"content"`
}

type SiteBlockService struct {
	repository *repositories.SiteBlockRepository
	now        func() time.Time
}

func NewSiteBlockService(repository ...*repositories.SiteBlockRepository) *SiteBlockService {
	repo := repositories.NewSiteBlockRepository()
	if len(repository) > 0 && repository[0] != nil {
		repo = repository[0]
	}
	return &SiteBlockService{repository: repo, now: time.Now}
}

func (s *SiteBlockService) List(ctx context.Context) ([]models.SiteBlock, error) {
	return s.repository.List(ctx)
}

func (s *SiteBlockService) Payloads(ctx context.Context, flatten bool) ([]map[string]interface{}, error) {
	blocks, err := s.repository.List(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]map[string]interface{}, 0, len(blocks))
	for _, block := range blocks {
		result = append(result, SiteBlockPayloadMap(block, flatten))
	}
	return result, nil
}

func SiteBlockPayloadMap(block models.SiteBlock, flatten bool) map[string]interface{} {
	payload := map[string]interface{}{"id": block.ID, "name": block.Name}
	var content interface{}
	if block.Content != "" && json.Unmarshal([]byte(block.Content), &content) == nil {
		payload["content"] = content
	} else {
		payload["content"] = block.Content
	}
	if flatten {
		if object, ok := content.(map[string]interface{}); ok {
			for key, value := range object {
				if key != "id" && key != "name" && key != "content" {
					payload[key] = value
				}
			}
		}
	}
	return payload
}

func (s *SiteBlockService) Create(ctx context.Context, name string, content interface{}) (models.SiteBlock, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return models.SiteBlock{}, errors.New("site block name is required")
	}
	encoded, err := encodeSiteBlockContent(content)
	if err != nil {
		return models.SiteBlock{}, err
	}
	block := models.SiteBlock{Name: name, Content: encoded}
	err = s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		if err := uow.SiteBlocks.Create(ctx, &block); err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "site-block", Action: "update", IDs: []uint{block.ID}}, s.now())
	})
	return block, err
}

func (s *SiteBlockService) UpsertMany(ctx context.Context, inputs []SiteBlockInput) ([]models.SiteBlock, error) {
	updated := make([]models.SiteBlock, 0, len(inputs))
	err := s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		ids := make([]uint, 0, len(inputs))
		for _, input := range inputs {
			name := strings.TrimSpace(input.Name)
			if name == "" {
				continue
			}
			encoded, err := encodeSiteBlockContent(input.Content)
			if err != nil {
				return err
			}
			block := models.SiteBlock{Name: name, Content: encoded}
			if err := uow.SiteBlocks.Upsert(ctx, &block); err != nil {
				return err
			}
			updated = append(updated, block)
			ids = append(ids, block.ID)
		}
		if len(ids) == 0 {
			return nil
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "site-block", Action: "update", IDs: ids}, s.now())
	})
	return updated, err
}

func (s *SiteBlockService) Delete(ctx context.Context, id uint) error {
	return s.repository.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		if err := uow.SiteBlocks.Delete(ctx, id); err != nil {
			return err
		}
		return enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "site-block", Action: "delete", IDs: []uint{id}}, s.now())
	})
}

func encodeSiteBlockContent(content interface{}) (string, error) {
	if value, ok := content.(string); ok {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			return "", nil
		}
		if json.Valid([]byte(trimmed)) {
			return trimmed, nil
		}
	}
	encoded, err := json.Marshal(content)
	return string(encoded), err
}
