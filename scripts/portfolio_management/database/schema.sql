-- Portfolio Management Database Schema
-- PostgreSQL 15 + PostGIS 3.3

-- ====== 启用PostGIS扩展 ======
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- ====== 创建Schema ======
CREATE SCHEMA IF NOT EXISTS portfolio;

-- ====== 1. 保单表 (Policies) ======
CREATE TABLE portfolio.policies (
    -- 主键
    id SERIAL PRIMARY KEY,

    -- 保单基本信息（原始中文字段）
    保單號 VARCHAR(100) UNIQUE NOT NULL,
    巨災代碼 VARCHAR(50),
    巨災名稱 VARCHAR(200),
    業務類別 VARCHAR(100),
    保單起期 DATE,
    保單止期 DATE,
    險種名稱 VARCHAR(200),
    承保地區範圍名稱 VARCHAR(200),
    所處洲 VARCHAR(100),
    國家或地區 VARCHAR(100),
    分區 VARCHAR(100),
    保險處所 TEXT,
    建築等級 VARCHAR(100),
    佔用性質 VARCHAR(200),
    樓層數 VARCHAR(50),
    建造年份 VARCHAR(50),
    保單幣別 VARCHAR(10),
    共保前建築重置價值 NUMERIC(20,2),
    共保前室內財物價值 NUMERIC(20,2),
    共保前總保險金額 NUMERIC(20,2),
    承保份額 NUMERIC(5,4),
    公司保額 NUMERIC(20,2),
    免賠信息 TEXT,

    -- 标准化英文字段
    policy_id VARCHAR(100),
    event_code VARCHAR(50),
    event_name VARCHAR(200),
    business_type VARCHAR(100),
    policy_start DATE,
    policy_end DATE,
    coverage_name VARCHAR(200),
    coverage_area VARCHAR(200),
    continent VARCHAR(100),
    country VARCHAR(100),
    region VARCHAR(100),
    address TEXT,
    construction_class VARCHAR(100),
    occupancy VARCHAR(200),
    floors VARCHAR(50),
    year_built VARCHAR(50),
    currency VARCHAR(10),
    building_replacement_value NUMERIC(20,2),
    contents_value NUMERIC(20,2),
    total_sum_insured_gross NUMERIC(20,2),
    share_percentage NUMERIC(5,4),
    sum_insured NUMERIC(20,2),
    deductible_info TEXT,

    -- Geocoding结果
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    formatted_address TEXT,
    place_id VARCHAR(200),
    geocoding_provider VARCHAR(50),
    geocoding_timestamp TIMESTAMP,
    district_source VARCHAR(50),  -- 'original', 'geocoding_api', 'address_text'

    -- PostGIS地理坐标点
    geom GEOMETRY(Point, 4326),

    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_quality_score NUMERIC(3,2),  -- 数据质量评分 0-1

    -- 索引提示
    CONSTRAINT valid_coordinates CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

-- 创建索引
CREATE INDEX idx_policies_region ON portfolio.policies(region);
CREATE INDEX idx_policies_event ON portfolio.policies(event_name);
CREATE INDEX idx_policies_occupancy ON portfolio.policies(occupancy);
CREATE INDEX idx_policies_policy_date ON portfolio.policies(policy_start, policy_end);
CREATE INDEX idx_policies_sum_insured ON portfolio.policies(sum_insured);

-- PostGIS空间索引
CREATE INDEX idx_policies_geom ON portfolio.policies USING GIST(geom);

-- 全文搜索索引（地址）
CREATE INDEX idx_policies_address_fts ON portfolio.policies USING GIN(to_tsvector('english', address));

COMMENT ON TABLE portfolio.policies IS '保单主表 - 存储所有geocoded保单数据';


-- ====== 2. 分区累积表 (Zone Accumulations) ======
CREATE TABLE portfolio.zone_accumulations (
    id SERIAL PRIMARY KEY,

    -- 分区信息
    region VARCHAR(100) NOT NULL,
    region_en VARCHAR(100),

    -- 累积统计
    total_sum_insured NUMERIC(20,2) DEFAULT 0,
    total_sum_insured_gross NUMERIC(20,2) DEFAULT 0,
    policy_count INTEGER DEFAULT 0,
    avg_sum_insured NUMERIC(20,2),

    -- 按占用类型分布 (JSON格式)
    occupancy_breakdown JSONB,

    -- 按险种分布
    coverage_breakdown JSONB,

    -- 按建筑等级分布
    construction_breakdown JSONB,

    -- 时间范围
    earliest_policy_start DATE,
    latest_policy_end DATE,

    -- 风险指标
    max_single_risk NUMERIC(20,2),  -- 单一最大风险
    concentration_ratio NUMERIC(5,4),  -- 风险集中度

    -- 元数据
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculation_source VARCHAR(50) DEFAULT 'aggregation_script',

    CONSTRAINT uk_zone_region UNIQUE(region)
);

CREATE INDEX idx_zone_acc_region ON portfolio.zone_accumulations(region);

COMMENT ON TABLE portfolio.zone_accumulations IS '分区累积统计表 - 预计算的分区级别聚合数据';


-- ====== 3. 分区限额表 (Zone Limits) ======
CREATE TABLE portfolio.zone_limits (
    id SERIAL PRIMARY KEY,

    -- 分区
    region VARCHAR(100) NOT NULL,

    -- 限额设置
    capacity_limit NUMERIC(20,2) NOT NULL,
    event_limit NUMERIC(20,2),  -- 单次事故限额

    -- 预警阈值
    warning_threshold NUMERIC(3,2) DEFAULT 0.80,  -- 80%黄灯
    critical_threshold NUMERIC(3,2) DEFAULT 0.90,  -- 90%红灯

    -- 限额类型
    limit_type VARCHAR(50),  -- 'zone', 'event', 'aggregate'
    peril_covered VARCHAR(200),  -- 承保灾因

    -- 当前状态
    current_exposure NUMERIC(20,2),
    utilization NUMERIC(5,4),  -- 利用率
    alert_status VARCHAR(20),  -- 'safe', 'warning', 'critical'

    -- 生效时间
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,

    -- 备注
    notes TEXT,

    -- 元数据
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_zone_limit UNIQUE(region, limit_type)
);

CREATE INDEX idx_zone_limits_region ON portfolio.zone_limits(region);
CREATE INDEX idx_zone_limits_status ON portfolio.zone_limits(alert_status);

COMMENT ON TABLE portfolio.zone_limits IS '分区限额配置表 - 用户设置的容量限制和预警阈值';


-- ====== 4. 理赔数据表 (Claims) ======
CREATE TABLE portfolio.claims (
    id SERIAL PRIMARY KEY,

    -- 理赔基本信息
    巨災代碼 VARCHAR(50),
    巨災名稱 VARCHAR(200),
    保單號 VARCHAR(100),
    立案號 VARCHAR(100) UNIQUE,
    險種代碼 VARCHAR(50),
    險種名稱 VARCHAR(200),
    出險日期 DATE,
    結案日期 DATE,
    出險原因代碼 VARCHAR(50),
    出險原因描述 TEXT,
    水浸深度 NUMERIC(10,2),
    出險地點 TEXT,
    國家或地區 VARCHAR(100),
    分區 VARCHAR(100),
    業務類別 VARCHAR(100),
    賠付類目 VARCHAR(100),
    幣別 VARCHAR(10),
    已決賠款 NUMERIC(20,2),
    已決賠款HKD NUMERIC(20,2),
    末決賠款 NUMERIC(20,2),
    末決賠款HKD NUMERIC(20,2),

    -- Geocoding结果
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    geom GEOMETRY(Point, 4326),

    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键关联保单
    policy_id_fk INTEGER REFERENCES portfolio.policies(id)
);

CREATE INDEX idx_claims_region ON portfolio.claims(分區);
CREATE INDEX idx_claims_event ON portfolio.claims(巨災名稱);
CREATE INDEX idx_claims_date ON portfolio.claims(出險日期);
CREATE INDEX idx_claims_geom ON portfolio.claims USING GIST(geom);

COMMENT ON TABLE portfolio.claims IS '理赔数据表 - 历史理赔记录';


-- ====== 5. 事件表 (Events) ======
CREATE TABLE portfolio.events (
    id SERIAL PRIMARY KEY,

    -- 事件信息
    event_code VARCHAR(50) UNIQUE NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(50),  -- 'typhoon', 'flood', 'earthquake'

    -- 时间
    event_start_date DATE,
    event_end_date DATE,

    -- 影响区域
    affected_regions JSONB,

    -- 损失统计
    total_claims_count INTEGER,
    total_paid_claims NUMERIC(20,2),
    total_outstanding_claims NUMERIC(20,2),

    -- 暴露统计
    total_exposure NUMERIC(20,2),
    affected_policies_count INTEGER,

    -- 元数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_name ON portfolio.events(event_name);
CREATE INDEX idx_events_date ON portfolio.events(event_start_date, event_end_date);

COMMENT ON TABLE portfolio.events IS '巨灾事件表 - 历史巨灾事件统计';


-- ====== 6. 数据处理日志表 (Processing Logs) ======
CREATE TABLE portfolio.processing_logs (
    id SERIAL PRIMARY KEY,

    -- 处理信息
    process_type VARCHAR(50),  -- 'geocoding', 'aggregation', 'import'
    process_status VARCHAR(20),  -- 'started', 'completed', 'failed'

    -- 统计
    records_processed INTEGER,
    records_success INTEGER,
    records_failed INTEGER,

    -- 时间
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    -- 详情
    error_message TEXT,
    metadata JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_type ON portfolio.processing_logs(process_type);
CREATE INDEX idx_logs_status ON portfolio.processing_logs(process_status);

COMMENT ON TABLE portfolio.processing_logs IS '数据处理日志表 - 记录所有数据处理操作';


-- ====== 视图：当前限额监控 ======
CREATE OR REPLACE VIEW portfolio.v_limit_monitoring AS
SELECT
    zl.id,
    zl.region,
    zl.capacity_limit,
    za.total_sum_insured as current_exposure,
    za.policy_count,
    ROUND(za.total_sum_insured / NULLIF(zl.capacity_limit, 0), 4) as utilization,
    CASE
        WHEN za.total_sum_insured / NULLIF(zl.capacity_limit, 0) >= zl.critical_threshold THEN 'critical'
        WHEN za.total_sum_insured / NULLIF(zl.capacity_limit, 0) >= zl.warning_threshold THEN 'warning'
        ELSE 'safe'
    END as alert_status,
    zl.warning_threshold,
    zl.critical_threshold,
    za.last_calculated as last_updated
FROM portfolio.zone_limits zl
LEFT JOIN portfolio.zone_accumulations za ON zl.region = za.region;

COMMENT ON VIEW portfolio.v_limit_monitoring IS '限额监控视图 - 实时计算utilization和预警状态';


-- ====== 函数：更新聚合表 ======
CREATE OR REPLACE FUNCTION portfolio.refresh_zone_accumulations()
RETURNS void AS $$
BEGIN
    -- 删除旧数据
    TRUNCATE TABLE portfolio.zone_accumulations;

    -- 重新计算
    INSERT INTO portfolio.zone_accumulations (
        region,
        total_sum_insured,
        total_sum_insured_gross,
        policy_count,
        avg_sum_insured,
        occupancy_breakdown,
        earliest_policy_start,
        latest_policy_end,
        max_single_risk,
        last_calculated
    )
    SELECT
        region,
        SUM(sum_insured) as total_sum_insured,
        SUM(total_sum_insured_gross) as total_sum_insured_gross,
        COUNT(*) as policy_count,
        AVG(sum_insured) as avg_sum_insured,
        jsonb_object_agg(occupancy, occ_count) as occupancy_breakdown,
        MIN(policy_start) as earliest_policy_start,
        MAX(policy_end) as latest_policy_end,
        MAX(sum_insured) as max_single_risk,
        CURRENT_TIMESTAMP as last_calculated
    FROM (
        SELECT
            region,
            sum_insured,
            total_sum_insured_gross,
            policy_start,
            policy_end,
            occupancy,
            COUNT(*) OVER (PARTITION BY region, occupancy) as occ_count
        FROM portfolio.policies
        WHERE region IS NOT NULL
    ) sub
    GROUP BY region;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION portfolio.refresh_zone_accumulations IS '刷新分区累积统计表';


-- ====== 触发器：自动更新updated_at ======
CREATE OR REPLACE FUNCTION portfolio.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON portfolio.policies
    FOR EACH ROW EXECUTE FUNCTION portfolio.update_updated_at_column();

CREATE TRIGGER update_zone_limits_updated_at BEFORE UPDATE ON portfolio.zone_limits
    FOR EACH ROW EXECUTE FUNCTION portfolio.update_updated_at_column();


-- ====== 授权 ======
-- 创建应用用户（生产环境使用）
-- CREATE USER portfolio_app WITH PASSWORD 'secure_password_here';
-- GRANT USAGE ON SCHEMA portfolio TO portfolio_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA portfolio TO portfolio_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA portfolio TO portfolio_app;

-- ====== 完成 ======
SELECT 'Portfolio Management数据库Schema创建完成！' as status;
