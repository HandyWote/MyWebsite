package routes

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/handywote/website/repositories"
	"github.com/handywote/website/services"
	"github.com/handywote/website/utils"
)

func AdminGetArticles(c *gin.Context) {
	page, pageSize := ParsePaginationParams(c)
	articles, total, err := articleService.ListAdmin(c.Request.Context(), repositories.ArticleFilter{
		Search: strings.TrimSpace(c.Query("search")), Page: page, PageSize: pageSize,
	})
	if err != nil {
		utils.ErrorInternal(c, "Failed to fetch articles")
		return
	}
	utils.Success(c, gin.H{"articles": articles, "total": total, "page": page})
}

func AdminGetArticle(c *gin.Context) {
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
	utils.Success(c, article)
}

func AdminCreateArticle(c *gin.Context) {
	var input services.ArticleWriteInput
	if err := c.ShouldBindJSON(&input); err != nil || input.Title == nil || input.Content == nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}
	article, err := articleService.Create(c.Request.Context(), input)
	if err != nil {
		utils.ErrorInternal(c, "Failed to create article")
		return
	}
	utils.Success(c, article)
}

func AdminUpdateArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}
	var input services.ArticleWriteInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ErrorBadRequest(c, "Invalid request body")
		return
	}
	article, err := articleService.Update(c.Request.Context(), id, input)
	if errors.Is(err, services.ErrArticleNotFound) {
		utils.ErrorNotFound(c, "Article not found")
		return
	}
	if err != nil {
		utils.ErrorInternal(c, "Failed to update article")
		return
	}
	utils.Success(c, article)
}

func AdminDeleteArticle(c *gin.Context) {
	id, valid := ParseUintParam(c, "id")
	if !valid {
		return
	}
	if err := articleService.Delete(c.Request.Context(), id); err != nil {
		if errors.Is(err, services.ErrArticleNotFound) {
			utils.ErrorNotFound(c, "Article not found")
		} else {
			utils.ErrorInternal(c, "Failed to delete article")
		}
		return
	}
	utils.Success(c, gin.H{"message": "Article deleted"})
}
