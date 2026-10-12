-- Nat Cat Platform Macau flood model registry seed v1
-- Safe to run multiple times after natcat_platform_model_registry_v1.sql.

INSERT INTO core.perils (peril_code, peril_group, peril_name, is_grouped)
VALUES ('MCF', 'flood', 'Typhoon Compound Flood (platform custom coverage peril)', FALSE)
ON CONFLICT (peril_code) DO UPDATE
SET peril_group = EXCLUDED.peril_group,
    peril_name = EXCLUDED.peril_name,
    is_grouped = EXCLUDED.is_grouped;

INSERT INTO model.model_versions (
    model_code,
    model_version,
    vendor_name,
    peril_code,
    model_scope,
    assumptions
)
VALUES
    (
        'MO_NTRF',
        '1.0.0',
        'NatCatPlatform',
        'OSF',
        'Macau non-typhoon rainfall flood',
        jsonb_build_object(
            'catalog_years', 10000,
            'hazard_measure', 'maximum_flood_depth_m',
            'oasis_execution_peril', 'OSF',
            'coverage_peril', 'OSF'
        )
    ),
    (
        'MO_TCF',
        '1.0.0',
        'NatCatPlatform',
        'MCF',
        'Macau typhoon rainfall and storm-surge compound flood',
        jsonb_build_object(
            'catalog_years', 10000,
            'hazard_measure', 'maximum_compound_flood_depth_m',
            'component_perils', jsonb_build_array('OSF', 'WSS'),
            'oasis_execution_peril', 'OSF',
            'coverage_peril', 'MCF',
            'mapping_strategy', 'compatibility',
            'requires_separate_run', true
        )
    )
ON CONFLICT (model_code, model_version) DO UPDATE
SET vendor_name = EXCLUDED.vendor_name,
    peril_code = EXCLUDED.peril_code,
    model_scope = EXCLUDED.model_scope,
    assumptions = EXCLUDED.assumptions;

INSERT INTO model.event_sets (
    model_version_id,
    event_set_code,
    event_set_name,
    region_code,
    platform_peril_code,
    oasis_peril_code,
    catalog_years,
    occurrence_set_code,
    event_id_min,
    event_id_max,
    model_data_uri,
    registration_status,
    metadata
)
SELECT
    model_version_id,
    'MO_NTRF_10K',
    'Macau Non-Typhoon Rainfall Flood 10,000-Year Event Set',
    'MO',
    'OSF',
    'OSF',
    10000,
    'MO_NTRF_LT_10K',
    10000001,
    19999999,
    'models://macau-flood/mo_ntrf/1.0.0/model_data',
    'draft',
    jsonb_build_object(
        'event_family', 'non_typhoon_rainfall_flood',
        'component_perils', jsonb_build_array('OSF'),
        'oed_compatible', true
    )
FROM model.model_versions
WHERE model_code = 'MO_NTRF' AND model_version = '1.0.0'
ON CONFLICT (event_set_code) DO UPDATE
SET model_version_id = EXCLUDED.model_version_id,
    event_set_name = EXCLUDED.event_set_name,
    platform_peril_code = EXCLUDED.platform_peril_code,
    oasis_peril_code = EXCLUDED.oasis_peril_code,
    catalog_years = EXCLUDED.catalog_years,
    occurrence_set_code = EXCLUDED.occurrence_set_code,
    event_id_min = EXCLUDED.event_id_min,
    event_id_max = EXCLUDED.event_id_max,
    model_data_uri = EXCLUDED.model_data_uri,
    metadata = EXCLUDED.metadata;

INSERT INTO model.event_sets (
    model_version_id,
    event_set_code,
    event_set_name,
    region_code,
    platform_peril_code,
    oasis_peril_code,
    catalog_years,
    occurrence_set_code,
    event_id_min,
    event_id_max,
    model_data_uri,
    registration_status,
    metadata
)
SELECT
    model_version_id,
    'MO_TCF_10K',
    'Macau Typhoon Compound Flood 10,000-Year Event Set',
    'MO',
    'MCF',
    'OSF',
    10000,
    'MO_TCF_LT_10K',
    20000001,
    29999999,
    'models://macau-flood/mo_tcf/1.0.0/model_data',
    'draft',
    jsonb_build_object(
        'event_family', 'typhoon_compound_flood',
        'component_perils', jsonb_build_array('OSF', 'WSS'),
        'oed_compatible', true,
        'execution_note', 'Final compound flood depth is executed as OSF in a separate run; platform coverage remains MCF'
    )
FROM model.model_versions
WHERE model_code = 'MO_TCF' AND model_version = '1.0.0'
ON CONFLICT (event_set_code) DO UPDATE
SET model_version_id = EXCLUDED.model_version_id,
    event_set_name = EXCLUDED.event_set_name,
    platform_peril_code = EXCLUDED.platform_peril_code,
    oasis_peril_code = EXCLUDED.oasis_peril_code,
    catalog_years = EXCLUDED.catalog_years,
    occurrence_set_code = EXCLUDED.occurrence_set_code,
    event_id_min = EXCLUDED.event_id_min,
    event_id_max = EXCLUDED.event_id_max,
    model_data_uri = EXCLUDED.model_data_uri,
    metadata = EXCLUDED.metadata;

INSERT INTO model.peril_execution_mappings (
    region_code,
    platform_peril_code,
    oasis_peril_code,
    model_version_id,
    event_set_id,
    mapping_strategy,
    requires_separate_run,
    requires_exposure_filter,
    notes
)
SELECT
    es.region_code,
    es.platform_peril_code,
    es.oasis_peril_code,
    es.model_version_id,
    es.event_set_id,
    CASE WHEN es.platform_peril_code = es.oasis_peril_code THEN 'native' ELSE 'compatibility' END,
    TRUE,
    TRUE,
    CASE
        WHEN es.event_set_code = 'MO_TCF_10K'
        THEN 'Select MCF-covered exposure, then write OSF to the run-specific OED/keys input. Do not combine with the NTRF event set in the same compatibility run.'
        ELSE 'Select OSF-covered exposure and execute natively as OSF.'
    END
FROM model.event_sets es
WHERE es.event_set_code IN ('MO_NTRF_10K', 'MO_TCF_10K')
ON CONFLICT (region_code, platform_peril_code, model_version_id, event_set_id) DO UPDATE
SET oasis_peril_code = EXCLUDED.oasis_peril_code,
    mapping_strategy = EXCLUDED.mapping_strategy,
    requires_separate_run = EXCLUDED.requires_separate_run,
    requires_exposure_filter = EXCLUDED.requires_exposure_filter,
    notes = EXCLUDED.notes;
