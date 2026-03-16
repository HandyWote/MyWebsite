package config

import (
	"os"
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestLoadConfig(t *testing.T) {
	os.Setenv("DB_HOST", "testhost")
	os.Setenv("DB_PORT", "5433")

	config := LoadConfig()

	assert.Equal(t, "testhost", config.DBHost)
	assert.Equal(t, 5433, config.DBPort)
}
