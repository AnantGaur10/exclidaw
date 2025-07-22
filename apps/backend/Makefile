# Directories
HTTP_DIR := ./http
WS_DIR := ./ws
BIN_DIR := ./bin

# Output binaries
HTTP_BIN := $(BIN_DIR)/http
WS_BIN := $(BIN_DIR)/ws

# Create bin directory if it doesn't exist
$(BIN_DIR):
	mkdir -p $(BIN_DIR)

# Default build both
.PHONY: all
all: build-http build-ws

# Build HTTP service
.PHONY: build-http
build-http: $(BIN_DIR)
	GOOS=linux GOARCH=amd64 go build -o $(HTTP_BIN) $(HTTP_DIR)/main.go
# Build WebSocket service
.PHONY: build-ws
build-ws: $(BIN_DIR)
	GOOS=linux GOARCH=amd64 go build -o $(WS_BIN) $(WS_DIR)/main.go
# Clean binaries
.PHONY: clean
clean:
	rm -rf $(BIN_DIR)
