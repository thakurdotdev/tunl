# syntax=docker/dockerfile:1
FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /tunneld ./cmd/tunneld

FROM alpine:3.20
RUN apk add --no-cache ca-certificates openssh-keygen
COPY --from=build /tunneld /usr/local/bin/tunneld
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 2222 8080 8443 9090
ENTRYPOINT ["docker-entrypoint.sh"]
