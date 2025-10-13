#!/bin/sh

# Récupérer l'IP du container
IP=$(hostname -i)

# Afficher l'URL d'accès
echo "Server running on https://{hostname -i}:8443/ or https://localhost:8443/"

# Lancer Nginx en foreground
nginx -g "daemon off;"
