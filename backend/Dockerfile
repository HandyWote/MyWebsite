FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:3.22

WORKDIR /app

# hadolint ignore=DL3018
RUN apk --no-cache add ca-certificates curl su-exec && \
    addgroup -S app && \
    adduser -S -G app app

# 创建 uploads 目录（运行时通过 volume 挂载）
RUN mkdir -p uploads && chown -R app:app /app

COPY --from=builder --chown=app:app /app/server .
COPY --chown=app:app docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]

EXPOSE 5000

CMD ["./server"]
