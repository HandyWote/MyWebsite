package database

import (
	"github.com/stretchr/testify/assert"
	"os"
	"testing"
)

func TestDSN(t *testing.T) {
	os.Setenv("DB_HOST", "testhost")
	os.Setenv("DB_USER", "testuser")
	os.Setenv("DB_PASSWORD", "testpass")
	os.Setenv("DB_NAME", "testdb")
	os.Setenv("DB_PORT", "5433")

	dsn := DSN("testhost", 5433, "testuser", "testpass", "testdb", "public")
	assert.Equal(t, `host=testhost port=5433 user=testuser password=testpass dbname=testdb sslmode=disable search_path='"public"'`, dsn)
}

func TestDSNWithHyphenatedSchema(t *testing.T) {
	dsn := DSN("testhost", 5433, "testuser", "testpass", "testdb", "web-test")
	assert.Equal(t, `host=testhost port=5433 user=testuser password=testpass dbname=testdb sslmode=disable search_path='"web-test"'`, dsn)
}
