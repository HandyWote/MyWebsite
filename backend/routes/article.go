package routes

import (
	"errors"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

type articleListItem struct {
	ID          uint      `json:"id"`
	Title       string    `json:"title"`
	Category    string    `json:"category"`
	Tags        string    `json:"tags"`
	Cover       string    `json:"cover"`
	CoverURL    string    `json:"cover_url,omitempty"`
	Summary     string    `json:"summary"`
	ContentType string    `json:"content_type"`
	PDFFilename string    `json:"pdf_filename"`
	PDFURL      string    `json:"pdf_url,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func GetArticles(c *gin.Context) {
	page, pageSize := ParsePaginationParams(c)
	articles, total, err := articleService.ListPublic(c.Request.Context(), repositories.ArticleFilter{
		Search: c.Query("search"), Category: c.Query("category"), Tag: c.Query("tag"), Page: page, PageSize: pageSize,
	})
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch articles")
		return
	}
	items := make([]articleListItem, 0, len(articles))
	for _, article := range articles {
		items = append(items, articleListItem{
			ID: article.ID, Title: article.Title, Category: article.Category, Tags: article.Tags,
			Cover: article.Cover, CoverURL: mediaService.PublicURL(article.Cover), Summary: article.Summary,
			ContentType: article.ContentType, PDFFilename: article.PDFFilename,
			PDFURL: mediaService.PDFURL(c.Request.Context(), article.PDFFilename), CreatedAt: article.CreatedAt, UpdatedAt: article.UpdatedAt,
		})
	}
	utils.Success(c, gin.H{
		"articles": items, "pages": (total + int64(pageSize) - 1) / int64(pageSize), "total": total, "page": page,
	})
}

func GetArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}
	article, err := articleService.Get(c.Request.Context(), id)
	if errors.Is(err, services.ErrArticleNotFound) {
		utils.ErrorNotFound(c, "Article not found")
		return
	}
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch article")
		return
	}
	article.CoverURL = mediaService.PublicURL(article.Cover)
	article.PDFURL = mediaService.PDFURL(c.Request.Context(), article.PDFFilename)
	utils.Success(c, article)
}
