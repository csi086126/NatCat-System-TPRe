# OASIS 2.5.x Input Examples — Multi-Peril Flood (HK / Macau / GBA)

Target: **oasislmf 2.5.4**, **pytools kernel**, **OED Spec >= 3.1.0**.

This folder mirrors the older `oasis-flood-template/` set but applies every
2.5.x-relevant change so the files validate and run on the new line.

## What changed vs 2.4.x (and why these files look the way they do)

| Change (PR) | Effect on inputs | How it's handled here |
|---|---|---|
| Dates -> `YYYY-MM-DD` (#1830, 2.5.0) | Any date string column must be ISO | `occurrence.csv` uses split int columns (date-agnostic); OED uses ISO dates |
| OED Spec >= 3.1.0 (#1844, 2.5.0) | Old OED schema errors out | `location.csv` / `account.csv` use OED 3.1.0 field names + `OEDVersion` column |
| `--ktools-*` -> `--kernel-*` (#1836) | CLI/config only, not data | see `oasislmf.json` example |
| pytools is the only kernel (#1836) | No raw `eve\|getmodel\|gulcalc` C++ pipeline | run via `oasislmf model run` |
| vuln bin checks relaxed (#1947, 2.5.4) | bin ids need not be contiguous, but YOU must keep them right | bins kept clean here anyway |
| peril info read from OEDSpec (#1935, 2.5.3) | peril codes must be valid OED peril codes | WSS / ORF / OSF / QLF used |

## Peril codes (OED 3.1.0 valid)

| peril_id | Name | Flood source |
|---|---|---|
| WSS | Storm Surge | Typhoon coastal surge |
| ORF | River / Fluvial Flood | Upstream river inflow (fluvial) |
| OSF | Flash / Surface / Pluvial Flood | Rainfall / urban + typhoon rainfall (pluvial) |

Peril group for "all flood" in OED is **OO1** (covers ORF + OSF, i.e. flood
WITHOUT storm surge). WSS (storm surge) is NOT in OO1 — it sits under the
windstorm group WW1. To cover all flood + surge, list `OO1;WSS` or `WSS;ORF;OSF`.

## Model data files (structure unchanged from 2.4.x — still valid)

| File | Notes for 2.5.x |
|---|---|
| `footprint.csv`         | unchanged columns; `peril_id` must be OED-valid |
| `vulnerability.csv`     | bin contiguity no longer enforced, keep clean anyway |
| `events.csv`            | unchanged |
| `occurrence.csv`        | `period_no <= no_of_periods` now validated (no_date_alg path) |
| `intensity_bin_dict.csv`| unchanged |
| `damage_bin_dict.csv`   | unchanged |

## Exposure files (THIS is where 2.5.x bites) — OED 3.1.0

| File | Notes |
|---|---|
| `location.csv` | OED 3.1.0 loc schema; includes `OEDVersion`, `LocPerilsCovered`, ISO dates |
| `account.csv`  | OED 3.1.0 acc schema; policy terms |

## Config / run

| File | Notes |
|---|---|
| `model_settings.json`    | declares perils, event/footprint ids, number of periods |
| `analysis_settings.json` | RP set, outputs (AAL, AEP/OEP), uses `kernel-*` not `ktools-*` |
| `oasislmf.json`          | MDK config; `kernel_alloc_rule_il` (renamed) |

## Run (2.5.x, pytools)

```bash
source ~/oasis-env-25/bin/activate     # your new venv with 2.5.4
oasislmf model run \
  -C oasislmf.json \
  --oed-location-csv location.csv \
  --oed-accounts-csv account.csv \
  -r runs/flood_2_5
```

ktools C++ binaries are gone — everything runs through pytools automatically.
