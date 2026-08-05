FROM docker.1ms.run/golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go env -w GOPROXY=https://goproxy.cn,direct && go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM docker.1ms.run/alpine:latest

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories

WORKDIR /app

RUN apk --no-cache add ca-certificates curl && \
    addgroup -S app && \
    adduser -S -G app app

# 创建 uploads 目录（运行时通过 volume 挂载）
RUN mkdir -p uploads && chown -R app:app /app

COPY --from=builder --chown=app:app /app/server .

USER app

EXPOSE 5000

CMD ["./server"]
