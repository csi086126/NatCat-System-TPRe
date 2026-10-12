-- Nat Cat Platform model registry v1
-- Registers business coverage perils separately from Oasis execution perils.
-- Prerequisite: natcat_platform_core_v1.sql

CREATE TABLE IF NOT EXISTS model.event_sets (
    event_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id UUID NOT NULL REFERENCES model.model_versions(model_version_id) ON DELETE CASCADE,
    event_set_code TEXT NOT NULL UNIQUE,
    event_set_name TEXT NOT NULL,
    region_code CHAR(2) NOT NULL,
    platform_peril_code TEXT NOT NULL REFERENCES core.perils(peril_code),
    oasis_peril_code TEXT NOT NULL,
    catalog_years INTEGER NOT NULL CHECK (catalog_years > 0),
    event_count INTEGER CHECK (event_count IS NULL OR event_count > 0),
    occurrence_set_code TEXT,
    event_id_min BIGINT,
    event_id_max BIGINT,
    model_data_uri TEXT,
    registration_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (registration_status IN ('draft', 'validating', 'active', 'retired', 'failed')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_event_id_range CHECK (
        event_id_min IS NULL OR event_id_max IS NULL OR event_id_max >= event_id_min
    )
);

CREATE INDEX IF NOT EXISTS idx_event_sets_lookup
    ON model.event_sets (region_code, platform_peril_code, registration_status);

CREATE TABLE IF NOT EXISTS model.peril_execution_mappings (
    peril_execution_mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code CHAR(2) NOT NULL,
    platform_peril_code TEXT NOT NULL REFERENCES core.perils(peril_code),
    oasis_peril_code TEXT NOT NULL,
    model_version_id UUID NOT NULL REFERENCES model.model_versions(model_version_id) ON DELETE CASCADE,
    event_set_id UUID NOT NULL REFERENCES model.event_sets(event_set_id) ON DELETE CASCADE,
    mapping_strategy TEXT NOT NULL
        CHECK (mapping_strategy IN ('native', 'compatibility', 'custom_oed_extension')),
    requires_separate_run BOOLEAN NOT NULL DEFAULT TRUE,
    requires_exposure_filter BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_peril_execution_mapping UNIQUE (
        region_code,
        platform_peril_code,
        model_version_id,
        event_set_id
    )
);

CREATE INDEX IF NOT EXISTS idx_peril_execution_mapping_lookup
    ON model.peril_execution_mappings (region_code, platform_peril_code);

CREATE TABLE IF NOT EXISTS model.model_artifacts (
    model_artifact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version_id UUID NOT NULL REFERENCES model.model_versions(model_version_id) ON DELETE CASCADE,
    event_set_id UUID REFERENCES model.event_sets(event_set_id) ON DELETE CASCADE,
    artifact_type TEXT NOT NULL,
    artifact_uri TEXT NOT NULL,
    checksum TEXT,
    artifact_version TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_model_artifact UNIQUE (
        model_version_id,
        event_set_id,
        artifact_type,
        artifact_uri
    )
);

DROP TRIGGER IF EXISTS trg_event_sets_updated_at ON model.event_sets;
CREATE TRIGGER trg_event_sets_updated_at
BEFORE UPDATE ON model.event_sets
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

DROP TRIGGER IF EXISTS trg_peril_execution_mappings_updated_at ON model.peril_execution_mappings;
CREATE TRIGGER trg_peril_execution_mappings_updated_at
BEFORE UPDATE ON model.peril_execution_mappings
FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMENT ON TABLE model.event_sets IS
    'Probabilistic event catalogues registered independently from policy coverage labels';
COMMENT ON COLUMN model.event_sets.platform_peril_code IS
    'Nat Cat Platform coverage/routing peril, including custom codes such as MCF';
COMMENT ON COLUMN model.event_sets.oasis_peril_code IS
    'Peril code written to the Oasis execution package; may differ under a documented compatibility mapping';
COMMENT ON TABLE model.peril_execution_mappings IS
    'Resolves region + policy coverage peril to a model version, event set and Oasis execution peril';
