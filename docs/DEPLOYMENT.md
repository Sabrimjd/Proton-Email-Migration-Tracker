# Deployment Guide

This document complements the README with practical deployment patterns.

## Option A: Standard Docker Compose

```bash
cp docker-compose.example.yml docker-compose.yml
cp .env.docker.example .env
docker compose up -d
```

Default app URL: <http://localhost:3200>

## Option B: Compose with bind-mounted data directory

If you prefer host-visible DB files, switch from named volume to bind mount in compose:

```yaml
volumes:
  - ./data:/app/data
```

If permissions fail, set ownership for container user:

```bash
sudo chown -R 1001:1001 ./data
```

## Option C: Pull from GHCR and run directly

```bash
docker pull ghcr.io/sabrimjd/proton-email-migration-tracker:latest
docker run -d --name email-migration-tracker -p 3200:3200 ghcr.io/sabrimjd/proton-email-migration-tracker:latest
```

## Option D: Existing homelab stack integration

Use image:

```text
ghcr.io/sabrimjd/proton-email-migration-tracker:latest
```

Then adapt your own networking, reverse proxy, and secrets management.

## First-Run Behavior

- Onboarding wizard opens automatically until required fields are configured.
- Setup is written to `config.local.yml`.
- Optional "Seed mock data" can prefill a demo dataset.

## CI/CD Notes

- Docker publishing workflow targets GHCR only.
- Multi-arch image build: `linux/amd64`, `linux/arm64`.
- Release tags `v*` publish semver image tags.
