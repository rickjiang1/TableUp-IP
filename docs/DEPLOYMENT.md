# TableUp MVP Deployment

TableUp uses two environments for the MVP:

```text
dev  -> daily testing and active development
prod -> real user data and stable releases
```

## Branches

```text
develop -> dev backend
main    -> prod backend
```

Develop on feature branches, merge into `develop` for testing, then merge a tested release into `main`.

## Supabase

Create two Supabase projects:

```text
tableup-dev
tableup-prod
```

Each project needs its own values:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

Keep prod data separate from dev data. Do not point the dev Render service at the prod Supabase project.

## Render

The repo includes `render.yaml` with two services:

```text
foodmanagementapp-dev -> branch develop -> APP_ENV=dev
foodmanagementapp     -> branch main    -> APP_ENV=prod
```

Environment variables required in Render:

```text
APP_ENV
OPENAI_API_KEY
OPENAI_MODEL
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
ALLOWED_ORIGIN
```

The backend health endpoint returns the environment:

```text
GET /health
{ "ok": true, "env": "dev" }
```

## iOS Backend URLs

The iOS build uses Xcode build configuration:

```text
Debug   -> https://foodmanagementapp-dev.onrender.com/
Release -> https://foodmanagementapp.onrender.com/
```

The URL values are stored in the PantryPilot target build settings:

```text
BACKEND_BASE_URL_DEVICE
BACKEND_BASE_URL_SIMULATOR
TABLEUP_ENVIRONMENT
```

## GitHub Actions

`CI` runs on `develop`, `main`, and pull requests:

```text
backend syntax checks
iOS Debug build
iOS Release build
```

`Deploy Backend` expects these GitHub secrets:

```text
RENDER_DEPLOY_HOOK_DEV
RENDER_DEPLOY_HOOK_PROD
```

Recommended GitHub Environments:

```text
dev
production
```

Set required reviewers on the `production` environment so prod deploys need manual approval.

## Safe Release Flow

```text
feature branch
  -> pull request
  -> CI passes
  -> merge into develop
  -> dev deploy
  -> test on Debug app
  -> merge develop into main
  -> manually run prod deploy
  -> test Release app
```
