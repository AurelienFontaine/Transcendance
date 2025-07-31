#!/bin/bash
# generer la key JWT a chaque redemarrage de docker
export JWT_KEY=$(openssl rand -base64 32)
echo "JWT_KEY : $JWT_KEY"
exec node /app/index.js