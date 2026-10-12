# Oasis Macau Flood Model Registration

## 1. Registration decision

Register two independent model packages and two independent event sets:

| Platform coverage peril | Model code | Event set | Oasis execution peril | Strategy |
| --- | --- | --- | --- | --- |
| `OSF` | `MO_NTRF` | `MO_NTRF_10K` | `OSF` | Native OED peril |
| `MCF` | `MO_TCF` | `MO_TCF_10K` | `OSF` | Compatibility mapping in a separate run |

`MCF` means Macau/typhoon compound flood in the Nat Cat Platform coverage and routing layer. It is not currently an official OED peril. The compound model output is final flood depth, so the compatibility execution uses the existing flood-depth vulnerability path under `OSF`. The platform must retain `MCF` in policy coverage, model selection, run metadata and reporting.

Do not use `WW1` or `OO1` in `footprint.csv`. Both are grouped OED coverage labels, while footprints require atomic model perils. `WW1` also does not include pluvial flood and `OO1` does not include storm surge.

## 2. Why two model packages

The compatibility mapping makes both execution packages use `OSF`. They therefore must be separated before Oasis key generation and loss calculation:

```text
Policy/location coverage OSF
        ↓ filter exposure
MO_NTRF 1.0.0 / MO_NTRF_10K
        ↓ run-specific LocPerilsCovered = OSF
Oasis execution peril OSF

Policy/location coverage MCF
        ↓ filter exposure
MO_TCF 1.0.0 / MO_TCF_10K
        ↓ run-specific LocPerilsCovered = OSF
Oasis execution peril OSF
        ↓ report labels restored from run metadata
Platform result peril MCF
```

Never send an exposure row covered only for `MCF` into the `MO_NTRF` run merely because both execution packages use `OSF`.

## 3. Platform database registration

Apply in order:

1. `natcat_platform_core_v1.sql`
2. `natcat_platform_model_registry_v1.sql`
3. `natcat_platform_model_registry_seed_v1.sql`

The registry adds:

- `model.event_sets`
- `model.peril_execution_mappings`
- `model.model_artifacts`

The seed adds:

- custom platform coverage peril `MCF`
- model version `MO_NTRF / 1.0.0`
- model version `MO_TCF / 1.0.0`
- event set `MO_NTRF_10K`
- event set `MO_TCF_10K`
- native `OSF → OSF` execution mapping
- compatibility `MCF → OSF` execution mapping

Both event sets remain `draft` until all Oasis validation and smoke tests pass. Activate them only by setting `registration_status = 'active'` after validation.

A model resolver should query:

```sql
SELECT
    mv.model_code,
    mv.model_version,
    es.event_set_code,
    pem.platform_peril_code,
    pem.oasis_peril_code,
    pem.mapping_strategy,
    pem.requires_separate_run,
    es.model_data_uri
FROM model.peril_execution_mappings pem
JOIN model.model_versions mv
  ON mv.model_version_id = pem.model_version_id
JOIN model.event_sets es
  ON es.event_set_id = pem.event_set_id
WHERE pem.region_code = 'MO'
  AND pem.platform_peril_code = :covered_peril
  AND es.registration_status = 'active';
```

## 4. Oasis package identities

Create two package roots:

```text
models/
├── mo_ntrf_1_0_0/
│   ├── oasislmf.json
│   ├── model_settings.json
│   ├── lookup.json
│   ├── analysis_settings.json
│   ├── model_data/
│   └── keys_data/
└── mo_tcf_1_0_0/
    ├── oasislmf.json
    ├── model_settings.json
    ├── lookup.json
    ├── analysis_settings.json
    ├── model_data/
    └── keys_data/
```

Use these identities in `oasislmf.json`:

| Field | NTRF package | TCF package |
| --- | --- | --- |
| `model_supplier_id` | `NatCatPlatform` | `NatCatPlatform` |
| `model_name_id` | `MO_NTRF` | `MO_TCF` |
| `model_version_id` | `1.0.0` | `1.0.0` |

The event-set code is platform metadata. The Oasis package may expose one default probabilistic event-set option per package, or multiple options later if the model data implementation supports selectable footprint/occurrence sets.

## 5. Peril configuration inside each Oasis package

For the current compatibility implementation, both `model_settings.json` files declare only the atomic execution peril:

```json
{
  "lookup_settings": {
    "supported_perils": [
      { "id": "OSF", "desc": "Flash / Surface / Pluvial Flood" }
    ]
  }
}
```

Adding `{ "id": "MCF" }` to `supported_perils` alone is not enough. OasisLMF 2.5 reads valid peril information from the OED specification, so a non-OED code may fail exposure validation even when the model settings list it.

## 6. Model data registration

Each package requires its own complete data set.

### `MO_NTRF_10K`

- `events.csv`: non-typhoon rainfall event IDs only
- `occurrence.csv`: 10,000-year occurrence mapping
- `footprint.csv` or binary footprint: non-typhoon rainfall flood depth, `peril_id = OSF`
- event ID reserved range: `10000001–19999999`

### `MO_TCF_10K`

- `events.csv`: typhoon compound-flood event IDs only
- `occurrence.csv`: 10,000-year occurrence mapping
- `footprint.csv` or binary footprint: final compound flood depth, execution `peril_id = OSF`
- event ID reserved range: `20000001–29999999`
- platform metadata: `coverage_peril = MCF`, `component_perils = [OSF, WSS]`

Do not write the same compound depth twice as separate `OSF` and `WSS` footprint rows. That would allow duplicate loss calculation from one physical compound result.

## 7. Keys server registration

The existing lookup template merges on:

```json
{
  "areaperil": {
    "columns": ["lon", "lat", "peril_id"]
  },
  "vulnerability": {
    "columns": ["occupancycode", "peril_id"]
  }
}
```

For each separate run:

1. Filter locations by the platform coverage peril.
2. Produce a run-specific OED location file.
3. Set `LocPerilsCovered = OSF` in that run-specific file.
4. Use `OSF` rows in `areaperil_dict.csv`.
5. Use `OSF` rows in `vulnerability_dict.csv`.
6. Preserve the original platform peril (`OSF` or `MCF`) in run metadata outside the OED execution file.

Example routing:

| Original platform coverage | Selected event set | Run-specific OED peril |
| --- | --- | --- |
| `OSF` | `MO_NTRF_10K` | `OSF` |
| `MCF` | `MO_TCF_10K` | `OSF` |
| `OSF;MCF` | two separate runs | `OSF` in each isolated run |

## 8. Vulnerability registration

Because both packages provide flood depth in metres, they may initially use the same flood-depth vulnerability set if engineering review confirms that equal water depth causes equal damage regardless of source.

Register separately if source-specific damage behavior is required:

- `MO_NTRF_FLOOD_VULN_V1`
- `MO_TCF_FLOOD_VULN_V1`

In either case, the compatibility package dictionary uses execution `peril_id = OSF`. The platform registry records which vulnerability artifact belongs to which model version and event set.

## 9. Oasis Platform/UI registration

After local MDK validation:

1. Package or mount each model data directory for the Oasis worker environment.
2. Register model supplier `NatCatPlatform` if it does not already exist.
3. Register model `MO_NTRF` and version `1.0.0`.
4. Register model `MO_TCF` and version `1.0.0`.
5. Associate each model version with its model data package and lookup configuration.
6. Run a small exposure smoke test through the platform API/UI.
7. Record the Oasis platform model/version identifiers in `model.model_artifacts.metadata` or `model.model_versions.assumptions`.

Exact admin screens/API endpoints vary by Oasis Platform release and deployment permissions. The stable identifiers above should remain constant even if deployment mechanics change.

## 10. Validation gates before activation

For each package verify:

- OED location/account files pass schema validation.
- Keys generation produces no unexpected `fail` rows.
- Every event ID exists in `events.csv` and occurrence data.
- Event ID ranges do not overlap.
- Every footprint `areaperil_id` exists in the areaperil dictionary.
- Every footprint intensity bin exists in the intensity-bin dictionary.
- Vulnerability probabilities sum correctly for every intensity bin.
- No `WW1` or `OO1` appears in footprint data.
- TCF footprints are not duplicated as both `OSF` and `WSS`.
- A one-location known-depth test produces the expected damage distribution.
- A policy covered only for `MCF` never enters the NTRF run.
- A policy covered only for `OSF` never enters the TCF run.
- A policy covered for both generates two separately traceable runs.
- AAL/OEP/AEP aggregation uses compatible occurrence-year semantics across both catalogs.

Only after these checks pass should the registry status change from `draft` to `active`.

## 11. Future native `MCF` option

Use native `peril_id = MCF` only if there is a business requirement to process `MCF` and `OSF` together in one Oasis execution with distinct financial terms. That requires an end-to-end custom extension:

- custom OED peril definition accepted by the execution environment
- exposure validation support
- Keys Server support
- areaperil and vulnerability dictionaries using `MCF`
- footprint data using `MCF`
- model settings support
- reporting and financial-module tests

This is a maintained fork/extension boundary, not a model-settings-only change. Until that work is justified, separate compatibility runs are safer and easier to audit.
