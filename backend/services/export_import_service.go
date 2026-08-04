package services

import (
	"context"
	"time"

	"github.com/handywote/website/models"
	"github.com/handywote/website/repositories"
)

type ExportDataSet struct {
	Articles   []models.Article   `json:"articles"`
	SiteBlocks []models.SiteBlock `json:"siteBlocks"`
}

type Stats struct {
	Articles int64 `json:"articles"`
	Comments int64 `json:"comments"`
}

type ExportImportService struct {
	articles   *repositories.ArticleRepository
	comments   *repositories.CommentRepository
	siteBlocks *repositories.SiteBlockRepository
	now        func() time.Time
}

func NewExportImportService(articles *repositories.ArticleRepository, comments *repositories.CommentRepository, siteBlocks *repositories.SiteBlockRepository) *ExportImportService {
	if articles == nil {
		articles = repositories.NewArticleRepository()
	}
	if comments == nil {
		comments = repositories.NewCommentRepository()
	}
	if siteBlocks == nil {
		siteBlocks = repositories.NewSiteBlockRepository()
	}
	return &ExportImportService{articles: articles, comments: comments, siteBlocks: siteBlocks, now: time.Now}
}

func (s *ExportImportService) Export(ctx context.Context) (ExportDataSet, error) {
	articles, err := s.articles.All(ctx)
	if err != nil {
		return ExportDataSet{}, err
	}
	blocks, err := s.siteBlocks.List(ctx)
	if err != nil {
		return ExportDataSet{}, err
	}
	return ExportDataSet{Articles: articles, SiteBlocks: blocks}, nil
}

func (s *ExportImportService) Import(ctx context.Context, input ExportDataSet) error {
	return s.articles.Transaction(ctx, func(uow *repositories.UnitOfWork) error {
		articleIDs := make([]uint, 0, len(input.Articles))
		for _, article := range input.Articles {
			article.ID = 0
			article.CreatedAt = time.Time{}
			article.UpdatedAt = time.Time{}
			if err := uow.Articles.Create(ctx, &article); err != nil {
				return err
			}
			articleIDs = append(articleIDs, article.ID)
		}
		blockIDs := make([]uint, 0, len(input.SiteBlocks))
		for _, block := range input.SiteBlocks {
			block.ID = 0
			block.CreatedAt = time.Time{}
			block.UpdatedAt = time.Time{}
			if err := uow.SiteBlocks.Upsert(ctx, &block); err != nil {
				return err
			}
			blockIDs = append(blockIDs, block.ID)
		}
		if len(articleIDs) > 0 {
			if err := enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "article", Action: "import", IDs: articleIDs}, s.now()); err != nil {
				return err
			}
		}
		if len(blockIDs) > 0 {
			if err := enqueueOutbox(ctx, uow.Outbox, RevalidationEvent{Entity: "site-block", Action: "update", IDs: blockIDs}, s.now()); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *ExportImportService) Stats(ctx context.Context) (Stats, error) {
	articles, err := s.articles.Count(ctx)
	if err != nil {
		return Stats{}, err
	}
	comments, err := s.comments.Count(ctx)
	if err != nil {
		return Stats{}, err
	}
	return Stats{Articles: articles, Comments: comments}, nil
}
