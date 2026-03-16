package database

import (
	"testing"
	"os"
	"github.com/stretchr/testify/assert"
)

func TestDSN(t *testing.T) {
	os.Setenv("DB_HOST", "testhost")
	os.Setenv("DB_USER", "testuser")
	os.Setenv("DB_PASSWORD", "testpass")
	os.Setenv("DB_NAME", "testdb")
	os.Setenv("DB_PORT", "5433")

	dsn := DSN("testhost", 5433, "testuser", "testpass", "testdb")
	assert.Equal(t, "host=testhost port=5433 user=testuser password=testpass dbname=testdb sslmode=disable", dsn)
}
