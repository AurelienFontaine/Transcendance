COMPOSE_PATH=requirement/docker-compose.yml
MAKEFLAGS += --no-print-directory

all:
	@echo "🔧 Generating SSL certificate for current server IP..."
	@./generate-ssl.sh
	cp requirement/frontend/certs/*.pem requirement/backend/certs/
	docker compose -f ${COMPOSE_PATH} build --no-cache
	docker compose -f $(COMPOSE_PATH) up -d
	@echo ""
	@echo "🌍 Adresse IP locale pour accéder au serveur :"
	@echo "https://$$(hostname -I | awk '{for(i=1;i<=NF;i++) if ($$i ~ /^192\.168\.|^10\.|^172\./) {print $$i; exit}}'):8443"

debug:
	docker compose -f $(COMPOSE_PATH) up --build --watch

start:
	docker compose -f $(COMPOSE_PATH) start

stop:
	docker compose -f $(COMPOSE_PATH) stop

clean:
	docker compose -f $(COMPOSE_PATH) down --rmi all --volumes --remove-orphans

fclean: clean

re:
	@echo "🔧 Generating SSL certificate for current server IP..."
	@./generate-ssl.sh
	docker compose -f $(COMPOSE_PATH) up -d --force-recreate --build
	@echo ""
	@echo "Adresse IP locale pour accéder au serveur :"
	@echo "https://$$(hostname -I | awk '{for(i=1;i<=NF;i++) if ($$i ~ /^192\.168\.|^10\.|^172\./) {print $$i; exit}}'):8443"

destroy: clean
	rm -f requirement/backend/data/data.db
	rm -f requirement/backend/data/imgs/avatar_*
	rm -rf requirement/frontend/dist/*
	rm -rf requirement/frontend/certs/*.pem
	rm -rf requirement/backend/certs/*.pem
	docker container prune -f
	docker image prune -a -f
	docker volume prune -f
	docker system prune -a -f
	docker system df

log:
	docker compose -f $(COMPOSE_PATH) logs backend frontend

ls:
	@echo "📦 Containers :"
	@docker ps -a
	@echo ""
	@echo "📸 Images :"
	@docker images
	@echo ""
	@echo "🧱 Volumes :"
	@docker volume ls
	@echo ""
	@echo "🔗 Networks :"
	@docker network ls

tab:
	@docker exec -it backend_container sh -c "sqlite3 data/data.db '.tables'"
	@docker exec -it backend_container sh -c "sqlite3 data/data.db '.mode box' '.headers on' 'SELECT * FROM users;'"
	@docker exec -it backend_container sh -c "sqlite3 data/data.db '.mode box' '.headers on' 'SELECT * FROM friends;'"
	@docker exec -it backend_container sh -c "sqlite3 data/data.db '.mode box' '.headers on' 'SELECT * FROM games;'"
	@docker exec -it backend_container sh -c "sqlite3 data/data.db '.mode box' '.headers on' 'SELECT * FROM server;'"
	@docker exec -it backend_container sh -c "sqlite3 data/data.db '.mode box' '.headers on' 'SELECT * FROM recovery_codes;'"
	@docker exec -it backend_container sh -c "sqlite3 data/data.db '.mode box' '.headers on' 'SELECT * FROM auth_logs;'"

dev:
	cd ./requirement/frontend && npm install
	cd ./requirement/frontend && npm run dev
	docker compose -f $(COMPOSE_PATH) up -d

ip:
	@echo "Adresse IP locale pour accéder au serveur :"
	@echo "https://$$(hostname -I | awk '{for(i=1;i<=NF;i++) if ($$i ~ /^192\.168\.|^10\.|^172\./) {print $$i; exit}}'):8443"

ssl:
	@echo "🔧 Regenerating SSL certificate for current server IP..."
	@./generate-ssl.sh

ssl-ip:
	@echo "🔧 Generating SSL certificate for specific IP..."
	@read -p "Enter IP address: " ip; ./generate-ssl.sh $$ip

.PHONY: all debug start stop clean fclean re destroy log ls tab dev frontend-build frontend-up frontend-stop frontend-a11y audit rating failed_audit axe_report
