# Macau Flood Risk Map Scenarios

## 1. Current production platform scope

Risk Map currently exposes two eleven-layer series:

| Risk Map family | Current source pattern | Count | Current role |
| --- | --- | ---: | --- |
| Non-typhoon rainfall flood | `MO_Flood_NONTC_R{RP}` | 11 | 10,000-year catalog return-period series |
| Typhoon compound flood | `MO_Flood_Compound_R{RP}` | 11 | 10,000-year joint compound-catalog return-period series |
| Current platform total |  | 22 | Two series with matching key return periods |

Return periods are 2, 5, 10, 20, 25, 50, 100, 200, 250, 500 and 1000 years.

The former 121 `Whole_T{T_RP}R{R_RP}` combinations are no longer part of the Risk Map catalog, query API, selector, charts, summaries or reports.

## 2. Annual event-catalog metrics

Each family also publishes exact metrics calculated from annual maxima over simulation years 2025–12024:

- annual probability that maximum water depth exceeds 0.15 m;
- annualized excess depth above 0.15 m;
- mean excess depth conditional on exceeding 0.15 m, calculated as annualized excess depth divided by annual exceedance probability;
- mean flood depth conditional on exceeding 0.15 m, calculated as the 0.15 m threshold plus conditional mean excess depth;
- 10,000-year flooded-year count retained locally for audit only.

## 3. Published catalog

The Risk Map catalog contains two families and 22 RP layers:

| Final family | Final source | Count |
| --- | --- | ---: |
| Non-typhoon rainfall flood | Existing key-return-period rainfall maps | 11 |
| Typhoon compound flood | Key-return-period depth maps statistically derived from the 10,000-year joint compound event set | 11 |

The 10,000-year compound catalog models the correlation and joint probability distribution between typhoon rainfall and storm surge. Its annual maxima provide the published key-return-period depths.

## 4. GeoServer naming

Examples:

- `natcat_platform:MO_Flood_NONTC_R100`
- `natcat_platform:MO_Flood_Compound_R100`
- `natcat_platform:MO_Flood_NONTC_AnnualProbability_GT015m`
- `natcat_platform:MO_Flood_Compound_AnnualizedExcessDepth_GT015m`

The layer catalog retains event-set version, simulated years, statistic type, return period, depth unit, NoData rule, defense assumptions, generation time and source model version.

## 5. Building-coordinate query

For each layer, Risk Map:

1. geocodes an address or accepts coordinates;
2. requests a raw GeoTIFF window through GeoServer WCS;
3. evaluates valid cells in a configurable 20 m circular neighborhood;
4. excludes NoData cells outside the published Macau mask;
5. reports the maximum valid external street-flood depth;
6. compares that value with the default 0.15 m inundation threshold.

Configuration:

- `FLOOD_SAMPLING_RADIUS_METERS=20`
- `FLOOD_INUNDATION_THRESHOLD_METERS=0.15`

The neighborhood maximum is a conservative external flooding proxy, not indoor water depth. Building ingress assessment additionally requires entrance elevation, first-floor height, basement access, flood barriers and vulnerability information.

## 6. Query results and charts

When no map layer is selected, Risk Map queries both eleven-layer series and shows:

- inundation-frequency susceptibility from the first tested return period exceeding the threshold;
- annual probability of depth above 0.15 m and annualized excess depth from the event catalog;
- R50 (2% AEP) and R1000 (0.1% AEP) depth severity for each family;
- one depth-versus-return-period curve for each family.

Frequency susceptibility and scenario severity are separate dimensions. An R2 onset means the location can flood frequently; it does not mean the R2 event is more severe than R1000. R1000 is rarer but normally has greater depth and extent.

Depth severity uses the displayed depth bins: below 0.15 m is below the screening threshold, 0.15–0.5 m is shallow, 0.5–1 m is moderate, 1–2 m is deep, 2–3 m is very deep, and above 3 m is extreme depth. These labels describe scenario intensity, not annual loss risk.

Risk Map does not currently calculate one total flood score from the two families. A defensible total flood return-period curve requires combining the two 10,000-year event families using aligned annual maxima or exceedance rates. Family scores must not be added, averaged, or maximized and called total risk.

When one layer is selected, Risk Map queries only that scenario and reports its 20 m neighborhood maximum.

The compound maps use a genuine single compound-flood return-period axis derived from the joint typhoon rainfall and storm-surge event catalog.

## 7. Separation from catastrophe-model execution

The 11 key-return-period maps are Risk Map statistical products for location screening and visualization. Oasis loss calculations continue to use event-level footprints and occurrence data from the original 10,000-year catalogs. Key-return-period maps are not substitutes for stochastic event footprints.
