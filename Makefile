COMPOSE_PATH=requirement/docker-compose.yml

all:
	docker compose -f $(COMPOSE_PATH) up -d --build

debug:
	docker compose -f $(COMPOSE_PATH) up --build --watch

start:
	docker compose -f $(COMPOSE_PATH) start

stop:
	docker compose -f $(COMPOSE_PATH) stop

clean:
	docker compose -f $(COMPOSE_PATH) down --rmi all --volumes

fclean: clean

re:
	docker compose -f $(COMPOSE_PATH) up -d --force-recreate --build

destroy: clean
	docker container prune -f
	docker image prune -a -f
	docker volume prune -f
	docker system prune -a -f
	rm -rf requirement/backend/data/data.db

log:
	docker compose logs -f chat
	docker compose logs backend
	docker compose logs frontend

.PHONY: all debug start stop clean fclean re destroy