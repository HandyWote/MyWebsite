package routes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestBuildCommentLimiterIdentity(t *testing.T) {
	assert.Equal(t, "a@b.com", buildCommentLimiterIdentity("a@b.com", "1.2.3.4"))
	assert.Equal(t, "1.2.3.4", buildCommentLimiterIdentity("", "1.2.3.4"))
	assert.Equal(t, "anonymous", buildCommentLimiterIdentity("", ""))
}
