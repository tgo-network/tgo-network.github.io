# Deployment Templates

This directory contains portable deployment templates for the `apps/api` service.

Current files:

- `api.compose.yml`
  - generic Docker Compose deployment for the API container
- `api.env.example`
  - runtime environment variable template for staging or production API deploys

Recommended use:

1. publish the API image from `.github/workflows/publish-api-image.yml`
2. copy `deploy/api.env.example` to a private `deploy/api.env`
3. fill in real secrets and environment-specific values
4. run `docker compose --env-file deploy/api.env -f deploy/api.compose.yml up -d`

Optional validation:

- `API_ENV_FILE=./api.env.example docker compose -f deploy/api.compose.yml config`

Optional overrides:

- `API_IMAGE=ghcr.io/<owner>/<repo>-api:latest docker compose --env-file deploy/api.env -f deploy/api.compose.yml up -d`
- `API_PORT=8787 docker compose --env-file deploy/api.env -f deploy/api.compose.yml up -d`

Notes:

- this template assumes `PostgreSQL` and object storage are managed outside the compose file
- the API container still expects migrations to be run separately before or during deployment
- health checks target `GET /ready`
