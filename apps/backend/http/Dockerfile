FROM golang:1.23-alpine

# Install make and other build tools
RUN apk add --no-cache make

# Set working directory
WORKDIR /app

# Copy the whole backend monorepo (to access lib and Makefile)
COPY . /app

# Build the http binary inside container
RUN make build-http && chmod +x ./bin/http

# Expose HTTP port
EXPOSE 8081

# Run the binary
CMD ["./bin/http"]
