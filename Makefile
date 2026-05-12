v1-up:
	docker compose -f docker-compose.yml up -d --build

v1-down:
	docker compose -f docker-compose.yml down

v2-up:
	COMPOSE_PARALLEL_LIMIT=1 docker compose -f docker-compose.v2.yml --env-file .env up -d --build

v2-build:
	COMPOSE_PARALLEL_LIMIT=1 docker compose -f docker-compose.v2.yml --env-file .env build

v2-down:
	docker compose -f docker-compose.v2.yml down

v2-destroy:
	docker compose -f docker-compose.v2.yml down -v

v2-logs:
	docker compose -f docker-compose.v2.yml logs -f

v2-images:
	docker images | grep e-grievance-v2

docker-build:
	COMPOSE_PARALLEL_LIMIT=1 docker compose -f docker-compose.v2.yml --env-file .env build

docker-up:
	COMPOSE_PARALLEL_LIMIT=1 docker compose -f docker-compose.v2.yml --env-file .env up -d --build

docker-down:
	docker compose -f docker-compose.v2.yml --env-file .env down

docker-destroy:
	docker compose -f docker-compose.v2.yml --env-file .env down -v

docker-logs:
	docker compose -f docker-compose.v2.yml --env-file .env logs -f

docker-status:
	docker compose -f docker-compose.v2.yml --env-file .env ps

docker-reset-passwords:
	docker compose -f docker-compose.v2.yml --env-file .env run --rm -e DEV_LOGIN_PASSWORD="$${DEV_LOGIN_PASSWORD:-Password@123}" v2-backend npm run reset:dev-passwords

docker-reset-accounts:
	docker compose -f docker-compose.v2.yml --env-file .env run --rm v2-backend npm run reset:accounts
