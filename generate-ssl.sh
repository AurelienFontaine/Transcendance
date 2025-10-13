#!/bin/bash

# Generate SSL certificate for current server IP
# Usage: ./generate-ssl.sh [optional-ip]

# Get server IP automatically or use provided IP
if [ -n "$1" ]; then
    SERVER_IP="$1"
else
    # Try to detect server IP automatically
    SERVER_IP=$(hostname -I | awk '{print $1}')
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")
    fi
fi

echo "🔧 Generating SSL certificate for IP: $SERVER_IP"

# Create certs directory if it doesn't exist
mkdir -p requirement/frontend/certs
mkdir -p requirement/backend/certs

# Generate certificate with multiple hostnames/IPs
openssl req -x509 -newkey rsa:4096 \
    -keyout requirement/frontend/certs/key.pem \
    -out requirement/frontend/certs/cert.pem \
    -days 365 -nodes \
    -subj "/C=FR/ST=France/L=Paris/O=42Paris/OU=42/CN=$SERVER_IP" \
    -addext "subjectAltName=DNS:localhost,DNS:$SERVER_IP,IP:$SERVER_IP,IP:127.0.0.1"

echo "✅ SSL certificate generated for:"
echo "   - localhost"
echo "   - $SERVER_IP"
echo "   - 127.0.0.1"
echo ""
echo "🚀 Now run: make re"
