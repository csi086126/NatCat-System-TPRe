-- Add Planning Unit Columns to Portfolio Policies Table
-- This enables portfolio statistics by TPU, PPU, SPU, and Subunit

-- ====== 1. 添加Planning Unit列 ======
ALTER TABLE portfolio.policies
ADD COLUMN IF NOT EXISTS TPU INTEGER,
ADD COLUMN IF NOT EXISTS PPU INTEGER,
ADD COLUMN IF NOT EXISTS SPU INTEGER,
ADD COLUMN IF NOT EXISTS SUBUNIT INTEGER;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_policies_tpu ON portfolio.policies(TPU);
CREATE INDEX IF NOT EXISTS idx_policies_ppu ON portfolio.policies(PPU);
CREATE INDEX IF NOT EXISTS idx_policies_spu ON portfolio.policies(SPU);
CREATE INDEX IF NOT EXISTS idx_policies_subunit ON portfolio.policies(SUBUNIT);

COMMENT ON COLUMN portfolio.policies.TPU IS 'Tertiary Planning Unit (292 units) - Hong Kong planning zone';
COMMENT ON COLUMN portfolio.policies.PPU IS 'Primary Planning Unit (9 units)';
COMMENT ON COLUMN portfolio.policies.SPU IS 'Secondary Planning Unit (52 units)';
COMMENT ON COLUMN portfolio.policies.SUBUNIT IS 'Subunit (4,916 units) - Smallest planning unit';


-- ====== 2. 创建函数：通过空间关联更新Planning Unit ======
-- 注意：这个函数需要先将shapefile导入PostGIS表

CREATE OR REPLACE FUNCTION portfolio.update_planning_units_from_spatial()
RETURNS TABLE(
    updated_count INTEGER,
    message TEXT
) AS $$
DECLARE
    tpu_count INTEGER := 0;
    ppu_count INTEGER := 0;
    spu_count INTEGER := 0;
    subunit_count INTEGER := 0;
BEGIN
    -- Update TPU (需要先创建 planning.tpu_polygons 表)
    -- 假设你已经将 Hong_Kong_292_TPU.geojson 导入到 planning.tpu_polygons 表
    -- UPDATE portfolio.policies p
    -- SET TPU = t.tpu_id
    -- FROM planning.tpu_polygons t
    -- WHERE ST_Within(p.geom, t.geom);

    -- GET DIAGNOSTICS tpu_count = ROW_COUNT;

    RETURN QUERY SELECT
        tpu_count as updated_count,
        'Planning units updated. Import shapefiles to PostGIS first using: shp2pgsql or QGIS' as message;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION portfolio.update_planning_units_from_spatial IS '通过空间关联更新policies表的TPU/PPU/SPU/SUBUNIT字段';


-- ====== 3. 手动更新示例（如果已经导入shapefile）======
--
-- 步骤1: 导入shapefile到PostGIS
-- shp2pgsql -s 4326 Hong_Kong_292_TPU.shp planning.tpu_polygons | psql -d natcat_platform
--
-- 步骤2: 空间关联更新
-- UPDATE portfolio.policies p
-- SET
--     TPU = t."TPU",
--     PPU = t."PPU",
--     SPU = t."SPU",
--     SUBUNIT = t."NUM_SUBUNITS"
-- FROM planning.tpu_polygons t
-- WHERE ST_Within(p.geom, t.geom) AND p.geom IS NOT NULL;


-- ====== 4. 查询示例 ======
--
-- 按TPU统计保单
-- SELECT
--     TPU,
--     COUNT(*) as policy_count,
--     SUM(公司保額) as total_exposure,
--     AVG(公司保額) as avg_exposure
-- FROM portfolio.policies
-- WHERE TPU IS NOT NULL
-- GROUP BY TPU
-- ORDER BY total_exposure DESC;


SELECT
    'Planning Unit columns added successfully!' as status,
    'Next steps: Import shapefiles to PostGIS and run spatial join' as next_step;
