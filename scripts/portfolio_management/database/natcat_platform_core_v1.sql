-- Nat Cat Platform Core Schema v1
-- Shared database foundation for Risk Map, Portfolio Management, Cat Model,
-- and future rapid flood warning workflows.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ingestion;
CREATE SCHEMA IF NOT EXISTS geo;
CREATE SCHEMA IF NOT EXISTS exposure;
CREATE SCHEMA IF NOT EXISTS hazard;
CREATE SCHEMA IF NOT EXISTS model;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS core.tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_code TEXT NOT NULL UNIQUE,
    tenant_name TEXT NOT NULL,
    tenant_type TEXT NOT NULL DEFAULT 'internal',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core.cedants (
    cedant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(tenant_id),
    cedant_code TEXT NOT NULL UNIQUE,
    cedant_name TEXT NOT NULL,
    domicile_country_code CHAR(2),
    business_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core.brokers (
    broker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_code TEXT NOT NULL UNIQUE,
    broker_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core.programs (
    program_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(tenant_id),
    program_code TEXT NOT NULL UNIQUE,
    program_name TEXT NOT NULL,
    renewal_year INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core.perils (
    peril_code TEXT PRIMARY KEY,
    peril_group TEXT NOT NULL,
    peril_name TEXT NOT NULL,
    is_grouped BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS core.reporting_periods (
    reporting_period_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(tenant_id),
    period_code TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    reporting_basis TEXT NOT NULL DEFAULT 'quarterly',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_reporting_period UNIQUE (tenant_id, period_code),
    CONSTRAINT ck_reporting_period_dates CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS core.treaties (
    treaty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(tenant_id),
    cedant_id UUID NOT NULL REFERENCES core.cedants(cedant_id),
    broker_id UUID REFERENCES core.brokers(broker_id),
    program_id UUID REFERENCES core.programs(program_id),
    treaty_code TEXT NOT NULL UNIQUE,
    treaty_name TEXT NOT NULL,
    treaty_type TEXT NOT NULL,
    coverage_class TEXT,
    inception_date DATE,
    expiry_date DATE,
    contract_currency CHAR(3),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_treaty_dates CHECK (
        inception_date IS NULL OR expiry_date IS NULL OR expiry_date >= inception_date
    )
);

CREATE TABLE IF NOT EXISTS core.treaty_layers (
    layer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    treaty_id UUID NOT NULL REFERENCES core.treaties(treaty_id) ON DELETE CASCADE,
    layer_code TEXT NOT NULL,
    layer_name TEXT,
    layer_order INTEGER NOT NULL DEFAULT 1,
    attachment_point NUMERIC(20, 2),
    limit_amount NUMERIC(20, 2),
    signed_line NUMERIC(9, 6),
    placement_share NUMERIC(9, 6),
    reinstatement_terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_treaty_layer UNIQUE (treaty_id, layer_code)
);

CREATE TABLE IF NOT EXISTS ingestion.submission_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(tenant_id),
    cedant_id UUID NOT NULL REFERENCES core.cedants(cedant_id),
    reporting_period_id UUID NOT NULL REFERENCES core.reporting_periods(reporting_period_id),
    batch_code TEXT NOT NULL UNIQUE,
    source_system TEXT,
    batch_status TEXT NOT NULL DEFAULT 'received',
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    created_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingestion.source_files (
    source_file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES ingestion.submission_batches(batch_id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_checksum TEXT,
    file_type TEXT,
    storage_uri TEXT,
    row_count INTEGER,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (batch_id, file_name)
);

CREATE TABLE IF NOT EXISTS ingestion.field_mapping_templates (
    mapping_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES core.tenants(tenant_id),
    template_name TEXT NOT NULL,
    source_field_name TEXT NOT NULL,
    canonical_field_name TEXT NOT NULL,
    transform_rule JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingestion.validation_issues (
    validation_issue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES ingestion.submission_batches(batch_id) ON DELETE CASCADE,
    source_file_id UUID REFERENCES ingestion.source_files(source_file_id) ON DELETE SET NULL,
    source_row_number INTEGER,
    issue_code TEXT NOT NULL,
    issue_level TEXT NOT NULL,
    issue_message TEXT NOT NULL,
    issue_context JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geo.admin_areas (
    admin_area_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code TEXT NOT NULL,
    country_code CHAR(2) NOT NULL,
    area_level TEXT NOT NULL,
    area_code TEXT NOT NULL,
    area_name_en TEXT,
    area_name_local TEXT,
    parent_admin_area_id UUID REFERENCES geo.admin_areas(admin_area_id),
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_admin_area UNIQUE (country_code, area_level, area_code)
);

CREATE INDEX IF NOT EXISTS idx_admin_areas_geom ON geo.admin_areas USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_admin_areas_level ON geo.admin_areas (country_code, area_level);

CREATE TABLE IF NOT EXISTS geo.grid_cells (
    grid_cell_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grid_system_code TEXT NOT NULL,
    cell_code TEXT NOT NULL,
    country_code CHAR(2),
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_grid_cell UNIQUE (grid_system_code, cell_code)
);

CREATE INDEX IF NOT EXISTS idx_grid_cells_geom ON geo.grid_cells USING GIST (geom);

CREATE TABLE IF NOT EXISTS geo.geocode_cache (
    geocode_cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_address TEXT NOT NULL,
    normalized_address TEXT,
    provider_name TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    geom GEOMETRY(Point, 4326),
    confidence_score NUMERIC(5, 4),
    response_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_geocode_cache_geom ON geo.geocode_cache USING GIST (geom);

CREATE TABLE IF NOT EXISTS exposure.locations (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(tenant_id),
    batch_id UUID REFERENCES ingestion.submission_batches(batch_id),
    raw_address TEXT,
    normalized_address TEXT,
    country_code CHAR(2),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    geom GEOMETRY(Point, 4326),
    geocode_status TEXT NOT NULL DEFAULT 'pending',
    geocode_provider TEXT,
    geocode_confidence NUMERIC(5, 4),
    district_admin_area_id UUID REFERENCES geo.admin_areas(admin_area_id),
    tpu_admin_area_id UUID REFERENCES geo.admin_areas(admin_area_id),
    grid_cell_id UUID REFERENCES geo.grid_cells(grid_cell_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_location_coordinates CHECK (
        latitude IS NULL OR longitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
);

CREATE INDEX IF NOT EXISTS idx_locations_geom ON exposure.locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_locations_status ON exposure.locations (tenant_id, geocode_status);

CREATE TABLE IF NOT EXISTS exposure.policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(tenant_id),
    batch_id UUID NOT NULL REFERENCES ingestion.submission_batches(batch_id),
    reporting_period_id UUID NOT NULL REFERENCES core.reporting_periods(reporting_period_id),
    cedant_id UUID NOT NULL REFERENCES core.cedants(cedant_id),
    source_policy_number TEXT,
    policy_number TEXT NOT NULL,
    policy_version_no INTEGER NOT NULL DEFAULT 1,
    policy_inception_date DATE,
    policy_expiry_date DATE,
    underwriting_year INTEGER,
    business_type TEXT,
    coverage_class TEXT,
    original_currency CHAR(3),
    original_record JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_policy_version UNIQUE (tenant_id, policy_number, policy_version_no)
);

CREATE INDEX IF NOT EXISTS idx_policies_reporting ON exposure.policies (tenant_id, reporting_period_id, underwriting_year);
CREATE INDEX IF NOT EXISTS idx_policies_cedant ON exposure.policies (cedant_id, policy_inception_date);

CREATE TABLE IF NOT EXISTS exposure.risk_items (
    risk_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES exposure.policies(policy_id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES exposure.locations(location_id),
    risk_item_no TEXT,
    insured_name TEXT,
    occupancy_code TEXT,
    construction_code TEXT,
    number_of_storeys INTEGER,
    year_built INTEGER,
    floor_area NUMERIC(18, 4),
    floor_area_unit TEXT,
    basement_level_count INTEGER,
    first_floor_height NUMERIC(18, 4),
    first_floor_height_unit TEXT,
    vulnerability_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_risk_item_per_policy UNIQUE (policy_id, risk_item_no)
);

CREATE INDEX IF NOT EXISTS idx_risk_items_location ON exposure.risk_items (location_id);
CREATE INDEX IF NOT EXISTS idx_risk_items_vulnerability ON exposure.risk_items (vulnerability_id);

CREATE TABLE IF NOT EXISTS exposure.coverages (
    coverage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_item_id UUID NOT NULL REFERENCES exposure.risk_items(risk_item_id) ON DELETE CASCADE,
    peril_code TEXT REFERENCES core.perils(peril_code),
    coverage_type TEXT NOT NULL,
    gross_tiv NUMERIC(20, 2) NOT NULL DEFAULT 0,
    net_tiv NUMERIC(20, 2),
    building_tiv NUMERIC(20, 2),
    contents_tiv NUMERIC(20, 2),
    bi_tiv NUMERIC(20, 2),
    deductible_amount NUMERIC(20, 2),
    limit_amount NUMERIC(20, 2),
    attachment_amount NUMERIC(20, 2),
    coinsurance_share NUMERIC(9, 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coverages_peril ON exposure.coverages (peril_code, coverage_type);

CREATE TABLE IF NOT EXISTS exposure.reinsurance_participations (
    participation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coverage_id UUID NOT NULL REFERENCES exposure.coverages(coverage_id) ON DELETE CASCADE,
    layer_id UUID NOT NULL REFERENCES core.treaty_layers(layer_id),
    ceded_share NUMERIC(9, 6),
    signed_line NUMERIC(9, 6),
    gross_share_amount NUMERIC(20, 2),
    net_share_amount NUMERIC(20, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_coverage_layer UNIQUE (coverage_id, layer_id)
);

CREATE TABLE IF NOT EXISTS hazard.events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code TEXT NOT NULL UNIQUE,
    event_name TEXT NOT NULL,
    peril_code TEXT REFERENCES core.perils(peril_code),
    event_type TEXT NOT NULL,
    event_source TEXT,
    event_start_ts TIMESTAMPTZ,
    event_end_ts TIMESTAMPTZ,
    event_geom GEOMETRY(Geometry, 4326),
    event_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_geom ON hazard.events USING GIST (event_geom);
CREATE INDEX IF NOT EXISTS idx_events_peril ON hazard.events (peril_code, event_start_ts);

CREATE TABLE IF NOT EXISTS hazard.layer_catalog (
    layer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layer_code TEXT NOT NULL UNIQUE,
    layer_name TEXT NOT NULL,
    peril_code TEXT REFERENCES core.perils(peril_code),
    layer_type TEXT NOT NULL,
    source_system TEXT,
    storage_uri TEXT,
    geoserver_workspace TEXT,
    geoserver_layer_name TEXT,
    style_name TEXT,
    temporal_resolution TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hazard.footprints (
    footprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES hazard.events(event_id) ON DELETE CASCADE,
    layer_id UUID REFERENCES hazard.layer_catalog(layer_id),
    footprint_version TEXT,
    areaperil_set_code TEXT,
    storage_uri TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_footprint UNIQUE (event_id, layer_id, footprint_version)
);

CREATE TABLE IF NOT EXISTS exposure.claims (
    claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES core.tenants(tenant_id),
    cedant_id UUID REFERENCES core.cedants(cedant_id),
    policy_id UUID REFERENCES exposure.policies(policy_id),
    event_id UUID REFERENCES hazard.events(event_id),
    claim_number TEXT NOT NULL,
    claim_status TEXT,
    loss_date DATE,
    report_date DATE,
    paid_amount NUMERIC(20, 2) DEFAULT 0,
    outstanding_amount NUMERIC(20, 2) DEFAULT 0,
    claim_currency CHAR(3),
    cause_code TEXT,
    cause_description TEXT,
    location_id UUID REFERENCES exposure.locations(location_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_claim_number UNIQUE (tenant_id, claim_number)
);

CREATE TABLE IF NOT EXISTS model.model_versions (
    model_version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_code TEXT NOT NULL,
    model_version TEXT NOT NULL,
    vendor_name TEXT,
    peril_code TEXT REFERENCES core.perils(peril_code),
    model_scope TEXT,
    assumptions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_model_version UNIQUE (model_code, model_version)
);

CREATE TABLE IF NOT EXISTS model.scenarios (
    scenario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_code TEXT NOT NULL UNIQUE,
    scenario_name TEXT NOT NULL,
    peril_code TEXT REFERENCES core.perils(peril_code),
    event_id UUID REFERENCES hazard.events(event_id),
    scenario_type TEXT NOT NULL,
    scenario_definition JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS model.runs (
    model_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id UUID NOT NULL REFERENCES model.model_versions(model_version_id),
    scenario_id UUID REFERENCES model.scenarios(scenario_id),
    reporting_period_id UUID REFERENCES core.reporting_periods(reporting_period_id),
    run_status TEXT NOT NULL DEFAULT 'queued',
    requested_by TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    runtime_seconds NUMERIC(18, 2),
    run_parameters JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_runs_status ON model.runs (run_status, created_at);

CREATE TABLE IF NOT EXISTS model.loss_summary (
    loss_summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_run_id UUID NOT NULL REFERENCES model.runs(model_run_id) ON DELETE CASCADE,
    coverage_id UUID REFERENCES exposure.coverages(coverage_id),
    layer_id UUID REFERENCES core.treaty_layers(layer_id),
    admin_area_id UUID REFERENCES geo.admin_areas(admin_area_id),
    ground_up_loss NUMERIC(20, 2) DEFAULT 0,
    gross_loss NUMERIC(20, 2) DEFAULT 0,
    net_loss NUMERIC(20, 2) DEFAULT 0,
    loss_perspective TEXT NOT NULL DEFAULT 'event',
    result_currency CHAR(3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loss_summary_run ON model.loss_summary (model_run_id, loss_perspective);

CREATE TABLE IF NOT EXISTS analytics.exposure_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporting_period_id UUID NOT NULL REFERENCES core.reporting_periods(reporting_period_id),
    cedant_id UUID REFERENCES core.cedants(cedant_id),
    treaty_id UUID REFERENCES core.treaties(treaty_id),
    admin_area_id UUID REFERENCES geo.admin_areas(admin_area_id),
    peril_code TEXT REFERENCES core.perils(peril_code),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC(24, 4) NOT NULL,
    metric_currency CHAR(3),
    snapshot_dimension JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exposure_snapshots_lookup
    ON analytics.exposure_snapshots (reporting_period_id, cedant_id, treaty_id, peril_code);

CREATE OR REPLACE FUNCTION exposure.assign_spatial_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.geom IS NULL AND NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;

    IF NEW.geom IS NOT NULL THEN
        SELECT admin_area_id
        INTO NEW.district_admin_area_id
        FROM geo.admin_areas
        WHERE area_level = 'district'
          AND ST_Contains(geom, NEW.geom)
        ORDER BY effective_from DESC NULLS LAST
        LIMIT 1;

        SELECT admin_area_id
        INTO NEW.tpu_admin_area_id
        FROM geo.admin_areas
        WHERE area_level = 'tpu'
          AND ST_Contains(geom, NEW.geom)
        ORDER BY effective_from DESC NULLS LAST
        LIMIT 1;

        SELECT grid_cell_id
        INTO NEW.grid_cell_id
        FROM geo.grid_cells
        WHERE ST_Contains(geom, NEW.geom)
        LIMIT 1;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_locations_assign_spatial_context
BEFORE INSERT OR UPDATE OF latitude, longitude, geom
ON exposure.locations
FOR EACH ROW
EXECUTE FUNCTION exposure.assign_spatial_context();

CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON core.tenants
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_cedants_updated_at
BEFORE UPDATE ON core.cedants
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_brokers_updated_at
BEFORE UPDATE ON core.brokers
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_programs_updated_at
BEFORE UPDATE ON core.programs
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_reporting_periods_updated_at
BEFORE UPDATE ON core.reporting_periods
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_treaties_updated_at
BEFORE UPDATE ON core.treaties
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_treaty_layers_updated_at
BEFORE UPDATE ON core.treaty_layers
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_submission_batches_updated_at
BEFORE UPDATE ON ingestion.submission_batches
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_field_mapping_templates_updated_at
BEFORE UPDATE ON ingestion.field_mapping_templates
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_admin_areas_updated_at
BEFORE UPDATE ON geo.admin_areas
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_grid_cells_updated_at
BEFORE UPDATE ON geo.grid_cells
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_geocode_cache_updated_at
BEFORE UPDATE ON geo.geocode_cache
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_locations_updated_at
BEFORE UPDATE ON exposure.locations
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_policies_updated_at
BEFORE UPDATE ON exposure.policies
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_risk_items_updated_at
BEFORE UPDATE ON exposure.risk_items
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_coverages_updated_at
BEFORE UPDATE ON exposure.coverages
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_reinsurance_participations_updated_at
BEFORE UPDATE ON exposure.reinsurance_participations
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_claims_updated_at
BEFORE UPDATE ON exposure.claims
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON hazard.events
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_layer_catalog_updated_at
BEFORE UPDATE ON hazard.layer_catalog
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_footprints_updated_at
BEFORE UPDATE ON hazard.footprints
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_model_versions_updated_at
BEFORE UPDATE ON model.model_versions
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_scenarios_updated_at
BEFORE UPDATE ON model.scenarios
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_runs_updated_at
BEFORE UPDATE ON model.runs
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE TRIGGER trg_loss_summary_updated_at
BEFORE UPDATE ON model.loss_summary
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMENT ON SCHEMA core IS 'Master data for tenants, cedants, treaties, perils, and reporting periods';
COMMENT ON SCHEMA ingestion IS 'Inbound submissions, source files, field mappings, and validation issues';
COMMENT ON SCHEMA geo IS 'Spatial reference data including admin areas, grids, and geocode cache';
COMMENT ON SCHEMA exposure IS 'Standardized exposure facts shared by risk map, portfolio, and modeling';
COMMENT ON SCHEMA hazard IS 'Hazard events, layer catalog, and footprint references';
COMMENT ON SCHEMA model IS 'Catastrophe model versions, scenarios, runs, and loss outputs';
COMMENT ON SCHEMA analytics IS 'Aggregated snapshots and API-serving summary structures';