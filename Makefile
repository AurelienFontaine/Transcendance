COMPOSE_PATH=requirement/docker-compose.yml

all:
	docker compose -f $(COMPOSE_PATH) up -d --build
	@echo ""
	@echo "🌍 Adresse IP locale pour accéder au serveur :"
	@echo "http://$$(hostname -I | awk '{for(i=1;i<=NF;i++) if ($$i ~ /^192\.168\.|^10\.|^172\./) {print $$i; exit}}'):8080"

debug:
	docker compose -f $(COMPOSE_PATH) up --build --watch
	@echo ""
	@echo "Adresse IP locale pour accéder au serveur :"
	@echo "http://$$(hostname -I | awk '{for(i=1;i<=NF;i++) if ($$i ~ /^192\.168\.|^10\.|^172\./) {print $$i; exit}}'):8080"

start:
	docker compose -f $(COMPOSE_PATH) start

stop:
	docker compose -f $(COMPOSE_PATH) stop

clean:
	docker compose -f $(COMPOSE_PATH) down --rmi all --volumes --remove-orphans

fclean: clean

re:
	docker compose -f $(COMPOSE_PATH) up -d --force-recreate --build
	@echo ""
	@echo "Adresse IP locale pour accéder au serveur :"
	@echo "http://$$(hostname -I | awk '{for(i=1;i<=NF;i++) if ($$i ~ /^192\.168\.|^10\.|^172\./) {print $$i; exit}}'):8080"


destroy: clean
	docker container prune -f
	docker image prune -a -f
	docker volume prune -f
	docker system prune -a -f
	rm -f requirement/backend/data/data.db
	rm -f requirement/backend/data/imgs/avatar_*
	docker system df

log:
	docker compose -f $(COMPOSE_PATH) logs chat backend frontend

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

ip:
	@echo "Adresse IP locale pour accéder au serveur :"
	@echo "http://$$(hostname -I | awk '{for(i=1;i<=NF;i++) if ($$i ~ /^192\.168\.|^10\.|^172\./) {print $$i; exit}}'):8080"

.PHONY: all debug start stop clean fclean re destroy log ls tab