FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates curl

# 创建 uploads 目录（运行时通过 volume 挂载）
RUN mkdir -p uploads

COPY --from=builder /app/server .

EXPOSE 5000

CMD ["./server"]
