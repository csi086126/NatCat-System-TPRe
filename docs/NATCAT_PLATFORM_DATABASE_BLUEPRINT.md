# Nat Cat Platform Database Blueprint

## 1. Design Goal

Nat Cat Platform should not be split into isolated databases by frontend module. The correct design is:

- one shared core risk data platform
- multiple module-specific read models
- one common geospatial and catastrophe modeling backbone

This allows Risk Map, Portfolio Management, Catastrophe Model, and future flood early warning to use the same exposure truth set while serving different workflows.

## 2. Core Principles

1. Shared core data, separate read views
   Risk Map and Portfolio Management must read the same exposure, contract, and location facts.

2. Separate transaction schema and analytics schema
   Operational writes should not be mixed with heavy map aggregation and model output queries.

3. Treat exposure as the core product
   For a reinsurer, the most important shared layer is not a single policy table, but a standardized exposure model.

4. Keep hazard and model results decoupled from source business facts
   Model outputs should be versioned and reproducible.

5. Design for internal and client-facing access from day one
   The same platform must support internal accumulation analysis and cedant-facing reporting with different permissions.

## 3. Recommended Schema Layout

| Schema | Purpose |
| --- | --- |
| `core` | Master data such as tenants, cedants, treaties, perils, reporting periods |
| `ingestion` | File intake, mapping templates, validation issues, ETL audit trail |
| `geo` | Administrative areas, grid cells, geocode cache, spatial reference data |
| `exposure` | Standardized exposure facts: policy, location, risk item, coverage, participation, claims |
| `hazard` | Hazard catalog, event metadata, footprint references, raster/vector layer catalog |
| `model` | Model versioning, scenario definitions, runs, loss outputs |
| `analytics` | Aggregated snapshots, materialized views, API-serving summary tables |

## 4. Module-to-Data Mapping

### Risk Map
- Reads from `exposure.locations`, `exposure.coverages`, `geo.admin_areas`, `hazard.events`, `hazard.layer_catalog`
- Uses area, grid, and peril summaries from `analytics`

### Portfolio Management
- Reads from `core.cedants`, `core.treaties`, `core.treaty_layers`, `exposure.policies`, `exposure.reinsurance_participations`, `exposure.claims`
- Uses contract and accumulation summaries from `analytics`

### Catastrophe Model
- Reads standardized exposure from `exposure`
- Reads event/footprint metadata from `hazard`
- Writes versioned outputs to `model`

### Future Rapid Flood Warning
- Reads live or forecast hazard layers from `hazard`
- Overlays active exposure from `exposure`
- Writes event-specific quick estimates to `model` or `analytics`

## 5. Shared Core Database Answer

Risk Map and Portfolio Management should share the same insurance business core database.

What they should share:

- tenant and cedant master data
- reporting period
- treaty and layer structure
- policy, location, and risk item facts
- exposure values and participation shares
- peril and region dictionaries
- spatial enrichment results

What they should not share directly:

- identical API query models
- identical cache tables
- identical UI-specific summary tables

The rule is: shared facts, separate read models.

## 6. Recommended Entity Model

```mermaid
erDiagram
    TENANTS ||--o{ CEDANTS : owns
    TENANTS ||--o{ REPORTING_PERIODS : governs
    CEDANTS ||--o{ PROGRAMS : has
    CEDANTS ||--o{ TREATIES : signs
    BROKERS ||--o{ TREATIES : places
    PROGRAMS ||--o{ TREATIES : groups
    TREATIES ||--o{ TREATY_LAYERS : contains
    REPORTING_PERIODS ||--o{ SUBMISSION_BATCHES : receives
    CEDANTS ||--o{ SUBMISSION_BATCHES : submits
    SUBMISSION_BATCHES ||--o{ SOURCE_FILES : includes
    SUBMISSION_BATCHES ||--o{ POLICIES : loads
    POLICIES ||--o{ RISK_ITEMS : contains
    LOCATIONS ||--o{ RISK_ITEMS : locates
    RISK_ITEMS ||--o{ COVERAGES : covers
    TREATY_LAYERS ||--o{ REINSURANCE_PARTICIPATIONS : allocates
    COVERAGES ||--o{ REINSURANCE_PARTICIPATIONS : participates
    POLICIES ||--o{ CLAIMS : incurs
    EVENTS ||--o{ CLAIMS : triggers
    PERILS ||--o{ EVENTS : classifies
    PERILS ||--o{ COVERAGES : protects
    ADMIN_AREAS ||--o{ LOCATIONS : contains
    GRID_CELLS ||--o{ LOCATIONS : indexes
    MODEL_VERSIONS ||--o{ MODEL_RUNS : executes
    SCENARIOS ||--o{ MODEL_RUNS : drives
    MODEL_RUNS ||--o{ LOSS_SUMMARY : produces
    COVERAGES ||--o{ LOSS_SUMMARY : loses

    TENANTS {
      uuid tenant_id PK
      text tenant_code
      text tenant_name
    }
    CEDANTS {
      uuid cedant_id PK
      uuid tenant_id FK
      text cedant_code
      text cedant_name
    }
    TREATIES {
      uuid treaty_id PK
      uuid cedant_id FK
      text treaty_code
      text treaty_type
    }
    TREATY_LAYERS {
      uuid layer_id PK
      uuid treaty_id FK
      numeric attachment_point
      numeric limit_amount
    }
    REPORTING_PERIODS {
      uuid reporting_period_id PK
      uuid tenant_id FK
      date period_start
      date period_end
    }
    SUBMISSION_BATCHES {
      uuid batch_id PK
      uuid cedant_id FK
      uuid reporting_period_id FK
      text batch_status
    }
    POLICIES {
      uuid policy_id PK
      uuid batch_id FK
      text policy_number
      text source_policy_number
    }
    LOCATIONS {
      uuid location_id PK
      text raw_address
      geometry geom
      text geocode_status
    }
    RISK_ITEMS {
      uuid risk_item_id PK
      uuid policy_id FK
      uuid location_id FK
      text occupancy_code
      text construction_code
    }
    COVERAGES {
      uuid coverage_id PK
      uuid risk_item_id FK
      text peril_code
      numeric gross_tiv
      numeric net_tiv
    }
    REINSURANCE_PARTICIPATIONS {
      uuid participation_id PK
      uuid coverage_id FK
      uuid layer_id FK
      numeric ceded_share
      numeric signed_line
    }
    CLAIMS {
      uuid claim_id PK
      uuid policy_id FK
      uuid event_id FK
      numeric paid_amount
      numeric outstanding_amount
    }
    EVENTS {
      uuid event_id PK
      text event_code
      text peril_code
      timestamptz event_start_ts
    }
    MODEL_RUNS {
      uuid model_run_id PK
      uuid model_version_id FK
      uuid scenario_id FK
      text run_status
    }
    LOSS_SUMMARY {
      uuid loss_summary_id PK
      uuid model_run_id FK
      uuid coverage_id FK
      numeric ground_up_loss
      numeric net_loss
    }
```

## 7. Table Responsibilities

### `core`
- `tenants`: supports internal and external data isolation
- `cedants`: direct insurance company master
- `brokers`: optional intermediary master
- `programs`: renewal/program grouping
- `treaties`: treaty header
- `treaty_layers`: attachment, limit, reinstatement, share
- `perils`: canonical peril dictionary
- `reporting_periods`: quarter, half-year, annual, ad hoc cut

### `ingestion`
- `submission_batches`: one cedant submission at one reporting cut
- `source_files`: uploaded file inventory and checksum tracking
- `field_mapping_templates`: source-to-canonical mapping rules
- `validation_issues`: audit trail for bad addresses, missing TIV, invalid peril, and mapping errors

### `geo`
- `admin_areas`: district, TPU, parish, statistical area, future regional hierarchy
- `grid_cells`: model or aggregation grid system
- `geocode_cache`: reusable standardized address lookup store

### `exposure`
- `locations`: one geocoded place with spatial enrichment
- `policies`: source business contract or reported policy header
- `risk_items`: the true exposure grain for map and model usage
- `coverages`: peril-specific insured values and attributes
- `reinsurance_participations`: how risk is allocated to treaty layers
- `claims`: historical loss records for validation and portfolio experience

### `hazard`
- `events`: historical and scenario hazard events
- `layer_catalog`: catalog of raster/vector layers published via GeoServer or file storage
- `footprints`: event-to-layer or event-to-grid references

### `model`
- `model_versions`: versioned model package and assumptions
- `scenarios`: deterministic scenario definition
- `runs`: execution log with audit information
- `loss_summary`: aggregated loss output by run and exposure grain

### `analytics`
- pre-aggregated by area, peril, cedant, treaty, and time slice
- materialized views can be refreshed independently from source tables

## 8. Recommended Grain Decisions

These grain choices are the most important design decisions:

- `submission_batches`: one cedant + one reporting period + one load cycle
- `policies`: one policy header from source data
- `locations`: one unique place after geocoding and standardization
- `risk_items`: one insurable object at one location
- `coverages`: one risk item + one peril or coverage slice
- `reinsurance_participations`: one coverage slice allocated to one treaty layer
- `loss_summary`: one model run + one exposure grain + one loss perspective

## 9. Internal vs Client-Facing Data Access

Use one platform, not separate databases.

Internal users may access:
- cross-cedant accumulation
- model calibration metadata
- internal benchmark layers
- full validation and ingestion audit trail

Client-facing users may access:
- their own cedant submissions
- their own treaty or program scope
- pre-approved analytics and event reports

Enforce this through:
- `tenant_id`
- `cedant_id`
- row-level security or API-layer tenant filtering
- separate service accounts for admin, write, and read-only workloads

## 10. Delivery Advice

Phase 1 should focus on these objects first:

1. `core.cedants`
2. `core.treaties`
3. `core.treaty_layers`
4. `core.reporting_periods`
5. `ingestion.submission_batches`
6. `exposure.locations`
7. `exposure.policies`
8. `exposure.risk_items`
9. `exposure.coverages`
10. `geo.admin_areas`

Once that backbone is live, Risk Map and Portfolio Management can be built on top of the same truth set without diverging.