# Native OasisUI integration

The native OasisUI migrated from `NatCatPlatform-TPRe-with-Dashboard` is
available at `/oasisui`. The existing `/oasislmf` Shiny entry and the custom
`/oasis` workflow are unchanged.

## Runtime architecture

```text
Browser → Next.js /api/oasis/* → Oasis API v2
       → Next.js /api/oasis-ui/* → FastAPI → PostgreSQL
```

The browser uses the platform `natcat_session` HttpOnly cookie. Oasis JWTs
are obtained with the server-side service account configured by
`OASIS_API_USERNAME` and `OASIS_API_PASSWORD`; they are never returned to the
browser. Descriptions, model metadata and the 30-second Portfolio/Analysis
cache are stored in the `oasis_ui` PostgreSQL schema.

## Local development

Set these values in the root `.env`:

```dotenv
NEXT_PUBLIC_AUTH_BYPASS=false
PORTFOLIO_API_URL=http://localhost:8765
OASIS_API_INTERNAL_URL=http://localhost:8000
OASIS_API_VERSION=v2
OASIS_API_USERNAME=admin
OASIS_API_PASSWORD=<Oasis service-account password>
```

Start the FastAPI service from `scripts/portfolio_management` on port 8765,
start the Oasis API on port 8000, then run:

```bash
npm run dev
```

The Catastrophe Model module and `/oasisui` route use the migrated UI. Log in
through the platform login page; do not put Oasis credentials in browser
storage or `NEXT_PUBLIC_*` variables.

## Production container

`Dockerfile` builds a Next standalone image on port 3000. Configure the
container environment with internal service names, for example:

```dotenv
PORTFOLIO_API_URL=http://portfolio-api:8765
OASIS_API_INTERNAL_URL=http://server:8000
```

The frontend container must be on the same Docker network as the FastAPI and
Oasis services. PostgreSQL schema creation is idempotent and occurs when the
FastAPI service starts.

## Importing existing old-platform UI state

The old platform's SQLite state can be imported once after the target admin
account and PostgreSQL schema are available:

```bash
cd scripts/portfolio_management
PYTHONPATH=. python database/migrate_oasis_ui_sqlite.py \
  --sqlite-dir /home/floodmodel/taipingproj/NatCatPlatform-TPRe-with-Dashboard/data \
  --email admin@natcat.local
```

The import maps the old `admin` owner to the target platform user, and imports
Portfolio/Analysis descriptions, model metadata and the short-lived list
cache. The application itself does not read SQLite afterward.
