package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// CORS allows only explicitly configured browser origins. Requests without an
// Origin header are same-origin/server-side and need no CORS response header.
func CORS(allowedOrigins ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origin = strings.TrimRight(strings.TrimSpace(origin), "/")
		if origin != "" && len(origin) > 1 {
			allowed[origin] = struct{}{}
		}
	}
	return func(c *gin.Context) {
		origin := strings.TrimRight(c.GetHeader("Origin"), "/")
		if _, ok := allowed[origin]; ok && origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type,Content-Length,Accept-Encoding,X-Requested-With,Authorization")
			c.Header("Access-Control-Expose-Headers", "Content-Length")
			c.Header("Access-Control-Max-Age", "86400")
		}

		if c.Request.Method == "OPTIONS" {
			if origin != "" {
				if _, ok := allowed[origin]; !ok {
					c.AbortWithStatus(403)
					return
				}
			}
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
