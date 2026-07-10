# OASIS Multi-Peril Flood Template (HK / Macau / GBA)

Minimal CSV template set following the **OasisLMF/OasisPiWind** structure,
extended to a 4-peril compound flood model:

| peril_id | Name                      | Source                          |
|----------|---------------------------|---------------------------------|
| WSS      | Storm Surge               | Typhoon-driven coastal surge    |
| ORF      | River / Fluvial Flood     | Upstream river inflow (fluvial) |
| OSF      | Flash / Surface / Pluvial | Rainfall / urban drainage flood |
| XTC      | Tropical Cyclone (parent) | (Optional) used only as event tag |

Peril codes follow the OED `LocPerilsCovered` standard.

## Files

| File | Purpose |
|---|---|
| `events.csv`              | Master event catalogue (shared across perils) |
| `occurrence.csv`          | Event-to-period (year/day) mapping for 10,000-yr simulation |
| `footprint.csv`           | Per-event, per-areaperil, per-peril hazard intensity bins |
| `intensity_bin_dict.csv`  | Water-depth bin definitions (meters) |
| `areaperil_dict.csv`      | Grid cell × peril lookup (your 30 m raster cell ID) |
| `vulnerability.csv`       | Damage curves: depth bin → damage bin per occupancy |
| `damage_bin_dict.csv`     | Mean damage ratio bins (0..1) |
| `events_by_peril.csv`     | (Helper) peril sub-catalogue index — not consumed by ktools |

## Key design rules

1. **Shared `event_id` = correlated perils.**
   A typhoon that causes BOTH storm surge AND tropical rainfall is ONE
   event_id with TWO rows in `footprint.csv` (different `peril_id`).
   This is how OASIS expresses peril correlation — do NOT split it.

2. **Independent events = different `event_id`.**
   A monsoon pluvial flood unrelated to any typhoon gets its own event_id.

3. **Same `areaperil_id` across perils**
   Define `areaperil_id` from the grid cell only (not peril). The
   `peril_id` column in `footprint.csv` disambiguates. This keeps the
   exposure join simple.

4. **Intensity = inundation depth (m).**
   All 4 perils MUST report water depth on the same bin scale so
   vulnerability functions are reusable. Surge height should be
   converted to ground inundation depth before binning.

5. **10,000-year catalogue.**
   `occurrence.csv` lists `period_no` 1..10000. Multiple events per
   period are allowed (and expected for multi-peril years).

## Pipeline

```
events.bin + occurrence.bin + footprint.bin + vulnerability.bin
        │
        ▼
   eve | getmodel | gulcalc -S100 | fmcalc -p fm | leccalc -F full_uncertainty_aep
        │
        ▼
   All-perils EP curve, AAL, per-areaperil RP depth maps
```

The compound (all-perils) RP map is produced automatically by ktools'
Monte Carlo aggregation — no manual probability addition required.
