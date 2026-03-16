package models

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestArticleTableName(t *testing.T) {
	article := Article{}
	assert.Equal(t, "article", article.TableName())
}

func TestCommentTableName(t *testing.T) {
	comment := Comment{}
	assert.Equal(t, "comments", comment.TableName())
}
