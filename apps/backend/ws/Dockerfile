FROM golang:1.23-alpine

RUN apk add --no-cache make

WORKDIR /app

COPY . /app

RUN make build-ws && chmod +x ./bin/ws

EXPOSE 8082

CMD ["./bin/ws"]
