-- Nat Cat Platform seed data v1
-- Safe to run multiple times.

INSERT INTO core.tenants (tenant_code, tenant_name, tenant_type)
SELECT 'TPRE_INTERNAL', 'Taiping Reinsurance Internal', 'internal'
WHERE NOT EXISTS (
    SELECT 1
    FROM core.tenants
    WHERE tenant_code = 'TPRE_INTERNAL'
);

UPDATE core.tenants
SET tenant_name = 'Taiping Reinsurance Internal',
    tenant_type = 'internal'
WHERE tenant_code = 'TPRE_INTERNAL';

INSERT INTO core.perils (peril_code, peril_group, peril_name, is_grouped)
SELECT seed.peril_code, seed.peril_group, seed.peril_name, seed.is_grouped
FROM (
    VALUES
        ('WTC', 'wind', 'Tropical Cyclone Wind', FALSE),
        ('WEC', 'wind', 'Extra-Tropical Cyclone Wind', FALSE),
        ('WSS', 'wind', 'Storm Surge', FALSE),
        ('ORF', 'flood', 'River / Fluvial Flood', FALSE),
        ('OSF', 'flood', 'Flash / Surface / Pluvial Flood', FALSE),
        ('WW2', 'wind', 'Windstorm Without Storm Surge', TRUE),
        ('WW1', 'wind', 'Windstorm With Storm Surge', TRUE),
        ('OO1', 'flood', 'Flood Without Storm Surge', TRUE)
) AS seed(peril_code, peril_group, peril_name, is_grouped)
WHERE NOT EXISTS (
    SELECT 1
    FROM core.perils
    WHERE core.perils.peril_code = seed.peril_code
);

UPDATE core.perils
SET peril_group = seed.peril_group,
    peril_name = seed.peril_name,
    is_grouped = seed.is_grouped
FROM (
    VALUES
        ('WTC', 'wind', 'Tropical Cyclone Wind', FALSE),
        ('WEC', 'wind', 'Extra-Tropical Cyclone Wind', FALSE),
        ('WSS', 'wind', 'Storm Surge', FALSE),
        ('ORF', 'flood', 'River / Fluvial Flood', FALSE),
        ('OSF', 'flood', 'Flash / Surface / Pluvial Flood', FALSE),
        ('WW2', 'wind', 'Windstorm Without Storm Surge', TRUE),
        ('WW1', 'wind', 'Windstorm With Storm Surge', TRUE),
        ('OO1', 'flood', 'Flood Without Storm Surge', TRUE)
) AS seed(peril_code, peril_group, peril_name, is_grouped)
WHERE core.perils.peril_code = seed.peril_code;

WITH internal_tenant AS (
    SELECT tenant_id
    FROM core.tenants
    WHERE tenant_code = 'TPRE_INTERNAL'
)
INSERT INTO core.reporting_periods (
    tenant_id,
    period_code,
    period_start,
    period_end,
    reporting_basis
)
SELECT tenant_id, '2024FY', DATE '2024-01-01', DATE '2024-12-31', 'annual'
FROM internal_tenant
WHERE NOT EXISTS (
        SELECT 1
        FROM core.reporting_periods rp
        WHERE rp.tenant_id = internal_tenant.tenant_id
            AND rp.period_code = '2024FY'
)
UNION ALL
SELECT tenant_id, '2025FY', DATE '2025-01-01', DATE '2025-12-31', 'annual'
FROM internal_tenant
WHERE NOT EXISTS (
        SELECT 1
        FROM core.reporting_periods rp
        WHERE rp.tenant_id = internal_tenant.tenant_id
            AND rp.period_code = '2025FY'
);

WITH internal_tenant AS (
        SELECT tenant_id
        FROM core.tenants
        WHERE tenant_code = 'TPRE_INTERNAL'
)
UPDATE core.reporting_periods
SET period_start = seed.period_start,
        period_end = seed.period_end,
        reporting_basis = seed.reporting_basis
FROM internal_tenant,
         (VALUES
                 ('2024FY', DATE '2024-01-01', DATE '2024-12-31', 'annual'),
                 ('2025FY', DATE '2025-01-01', DATE '2025-12-31', 'annual')
         ) AS seed(period_code, period_start, period_end, reporting_basis)
WHERE core.reporting_periods.tenant_id = internal_tenant.tenant_id
    AND core.reporting_periods.period_code = seed.period_code;