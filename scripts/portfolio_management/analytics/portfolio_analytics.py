"""
Portfolio统计分析API
支持按任意Excel列字段进行筛选、聚合和统计分析
"""
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os
from pathlib import Path
from typing import Dict, List, Any, Optional

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'natcat_platform'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

class PortfolioAnalytics:
    """Portfolio analytics class for flexible querying"""

    def __init__(self):
        self.conn = None

    def connect(self):
        """Connect to database"""
        self.conn = psycopg2.connect(**DB_CONFIG)
        return self

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

    def __enter__(self):
        return self.connect()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    # =================================================================
    # 1. 基础统计查询
    # =================================================================

    def get_18_districts_exposure(self, year: Optional[int] = None) -> List[Dict]:
        """
        获取18区暴露度统计
        Args:
            year: 保单起期年份 (optional)
        Returns:
            List of districts with exposure statistics
        """
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        year_filter = ""
        params = []
        if year:
            year_filter = "AND EXTRACT(YEAR FROM policy_start) = %s"
            params.append(year)

        query = f"""
        SELECT
            分區 as district,
            COUNT(*) as policy_count,
            SUM(公司保額) as total_exposure,
            AVG(公司保額) as avg_exposure,
            MIN(公司保額) as min_exposure,
            MAX(公司保額) as max_exposure,
            COUNT(DISTINCT 巨災代碼) as event_count,
            COUNT(DISTINCT 業務類別) as business_type_count,
            保單幣別 as currency
        FROM portfolio.policies
        WHERE 分區 IS NOT NULL
            AND 公司保額 > 0
            {year_filter}
        GROUP BY 分區, 保單幣別
        ORDER BY total_exposure DESC;
        """

        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()

        return [dict(row) for row in results]

    def get_3_major_regions_exposure(self, year: Optional[int] = None) -> List[Dict]:
        """
        获取3大区暴露度统计 (香港岛/九龙/新界)
        Args:
            year: 保单起期年份 (optional)
        Returns:
            List of major regions with exposure statistics
        """
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        year_filter = ""
        params = []
        if year:
            year_filter = "AND EXTRACT(YEAR FROM p.policy_start) = %s"
            params.append(year)

        query = f"""
        SELECT
            d.region_group as major_region,
            COUNT(*) as policy_count,
            SUM(p.公司保額) as total_exposure,
            AVG(p.公司保額) as avg_exposure,
            COUNT(DISTINCT p.分區) as districts_count,
            COUNT(DISTINCT p.巨災代碼) as event_count,
            p.保單幣別 as currency
        FROM portfolio.policies p
        LEFT JOIN portfolio.hk_districts d ON p.分區 = d.district_name_zh
        WHERE p.公司保額 > 0
            {year_filter}
        GROUP BY d.region_group, p.保單幣別
        ORDER BY total_exposure DESC;
        """

        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()

        return [dict(row) for row in results]

    # =================================================================
    # 2. 按任意字段分组统计 (核心功能)
    # =================================================================

    def group_by_field(
        self,
        group_by: str,
        aggregations: Dict[str, str] = None,
        filters: Dict[str, Any] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        按任意Excel列字段进行分组统计

        Args:
            group_by: 分组字段 (e.g., '分區', '險種名稱', '佔用性質')
            aggregations: 聚合计算 {field: 'sum'|'avg'|'count'|'min'|'max'}
                         默认: {'公司保額': 'sum'}
            filters: 筛选条件 {field: value}
            limit: 返回结果数量限制

        Returns:
            List of grouped statistics

        Example:
            # 按险种名称统计保额
            group_by_field('險種名稱', {'公司保額': 'sum'})

            # 按占用性质统计，筛选特定区域
            group_by_field(
                '佔用性質',
                {'公司保額': 'sum', 'policy_id': 'count'},
                {'分區': '中西區'}
            )
        """
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        # Default aggregation
        if aggregations is None:
            aggregations = {'公司保額': 'sum'}

        # Build SELECT clause with aggregations
        agg_clauses = []
        for field, agg_func in aggregations.items():
            safe_field = field.replace("'", "''")  # Escape quotes
            agg_clauses.append(f"{agg_func}({safe_field}) as {agg_func}_{safe_field}")

        agg_select = ', '.join(agg_clauses)

        # Build WHERE clause from filters
        where_clauses = []
        params = []

        if filters:
            for field, value in filters.items():
                safe_field = field.replace("'", "''")
                if isinstance(value, list):
                    placeholders = ','.join(['%s'] * len(value))
                    where_clauses.append(f"{safe_field} IN ({placeholders})")
                    params.extend(value)
                else:
                    where_clauses.append(f"{safe_field} = %s")
                    params.append(value)

        where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        # Build query
        safe_group_by = group_by.replace("'", "''")
        query = f"""
        SELECT
            {safe_group_by} as group_value,
            COUNT(*) as record_count,
            {agg_select}
        FROM portfolio.policies
        {where_clause}
        GROUP BY {safe_group_by}
        ORDER BY record_count DESC
        LIMIT %s;
        """

        params.append(limit)

        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()

        return [dict(row) for row in results]

    # =================================================================
    # 3. 多维度交叉分析
    # =================================================================

    def cross_analysis(
        self,
        dimension1: str,
        dimension2: str,
        metric: str = '公司保額',
        agg_func: str = 'sum',
        filters: Dict[str, Any] = None
    ) -> List[Dict]:
        """
        双维度交叉分析 (类似Excel透视表)

        Args:
            dimension1: 第一个维度 (e.g., '分區')
            dimension2: 第二个维度 (e.g., '險種名稱')
            metric: 度量字段 (e.g., '公司保額')
            agg_func: 聚合函数 ('sum', 'avg', 'count', etc.)
            filters: 筛选条件

        Returns:
            List of cross-tabulated results

        Example:
            # 各区各险种的保额分布
            cross_analysis('分區', '險種名稱', '公司保額', 'sum')
        """
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        # Build WHERE clause
        where_clauses = []
        params = []

        if filters:
            for field, value in filters.items():
                safe_field = field.replace("'", "''")
                where_clauses.append(f"{safe_field} = %s")
                params.append(value)

        where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        # Build query
        safe_dim1 = dimension1.replace("'", "''")
        safe_dim2 = dimension2.replace("'", "''")
        safe_metric = metric.replace("'", "''")

        query = f"""
        SELECT
            {safe_dim1} as dim1_value,
            {safe_dim2} as dim2_value,
            {agg_func}({safe_metric}) as metric_value,
            COUNT(*) as record_count
        FROM portfolio.policies
        {where_clause}
        GROUP BY {safe_dim1}, {safe_dim2}
        ORDER BY metric_value DESC;
        """

        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()

        return [dict(row) for row in results]

    # =================================================================
    # 4. 时间序列分析
    # =================================================================

    def time_series_analysis(
        self,
        time_grain: str = 'month',  # 'year', 'month', 'quarter'
        metric: str = '公司保額',
        agg_func: str = 'sum',
        group_by: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """
        时间序列趋势分析

        Args:
            time_grain: 时间粒度 ('year', 'month', 'quarter')
            metric: 度量字段
            agg_func: 聚合函数
            group_by: 额外分组字段 (e.g., '分區')
            start_date: 开始日期 'YYYY-MM-DD'
            end_date: 结束日期 'YYYY-MM-DD'

        Returns:
            Time series data

        Example:
            # 月度保额趋势
            time_series_analysis('month', '公司保額', 'sum')

            # 各区月度趋势对比
            time_series_analysis('month', '公司保額', 'sum', group_by='分區')
        """
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        # Time truncation
        time_trunc_map = {
            'year': "DATE_TRUNC('year', 保單起期)",
            'month': "DATE_TRUNC('month', 保單起期)",
            'quarter': "DATE_TRUNC('quarter', 保單起期)"
        }
        time_trunc = time_trunc_map.get(time_grain, time_trunc_map['month'])

        # Build WHERE clause
        where_clauses = ["保單起期 IS NOT NULL"]
        params = []

        if start_date:
            where_clauses.append("保單起期 >= %s")
            params.append(start_date)

        if end_date:
            where_clauses.append("保單起期 <= %s")
            params.append(end_date)

        where_clause = "WHERE " + " AND ".join(where_clauses)

        # Build GROUP BY
        group_clause = f"{time_trunc}"
        select_group = f"{time_trunc} as time_period"

        if group_by:
            safe_group_by = group_by.replace("'", "''")
            group_clause += f", {safe_group_by}"
            select_group += f", {safe_group_by} as group_value"

        # Build query
        safe_metric = metric.replace("'", "''")

        query = f"""
        SELECT
            {select_group},
            {agg_func}({safe_metric}) as metric_value,
            COUNT(*) as record_count
        FROM portfolio.policies
        {where_clause}
        GROUP BY {group_clause}
        ORDER BY time_period, {group_by if group_by else 'time_period'};
        """

        cursor.execute(query, params)
        results = cursor.fetchall()
        cursor.close()

        # Convert datetime to string
        output = []
        for row in results:
            row_dict = dict(row)
            if row_dict.get('time_period'):
                row_dict['time_period'] = row_dict['time_period'].strftime('%Y-%m-%d')
            output.append(row_dict)

        return output

    # =================================================================
    # 5. 获取所有可用字段
    # =================================================================

    def get_available_fields(self) -> Dict[str, List[str]]:
        """
        获取所有可用于筛选和分组的字段

        Returns:
            Dict with field categories and field names
        """
        cursor = self.conn.cursor(cursor_factory=RealDictCursor)

        query = """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'portfolio'
            AND table_name = 'policies'
        ORDER BY ordinal_position;
        """

        cursor.execute(query)
        columns = cursor.fetchall()
        cursor.close()

        # Categorize fields
        chinese_fields = []
        english_fields = []
        numeric_fields = []
        date_fields = []
        geocoding_fields = []

        for col in columns:
            col_name = col['column_name']
            col_type = col['data_type']

            # Skip internal fields
            if col_name in ['id', 'created_at', 'updated_at', 'geom', 'data_quality_score']:
                continue

            # Categorize
            if col_name in ['latitude', 'longitude', 'formatted_address', 'place_id',
                           'geocoding_provider', 'geocoding_timestamp', 'district_source']:
                geocoding_fields.append(col_name)
            elif 'date' in col_name.lower() or col_type in ['date', 'timestamp', 'timestamp without time zone']:
                date_fields.append(col_name)
            elif col_type in ['numeric', 'integer', 'bigint', 'real', 'double precision']:
                numeric_fields.append(col_name)
            elif ord(col_name[0]) > 127:  # Chinese character
                chinese_fields.append(col_name)
            else:
                english_fields.append(col_name)

        return {
            'chinese_fields': chinese_fields,
            'english_fields': english_fields,
            'numeric_fields': numeric_fields,
            'date_fields': date_fields,
            'geocoding_fields': geocoding_fields,
            'all_fields': [col['column_name'] for col in columns]
        }

    # =================================================================
    # 6. 获取字段的唯一值列表 (用于前端筛选器)
    # =================================================================

    def get_field_values(self, field_name: str, limit: int = 1000) -> List[Any]:
        """
        获取某个字段的所有唯一值

        Args:
            field_name: 字段名
            limit: 限制返回数量

        Returns:
            List of unique values

        Example:
            get_field_values('分區') -> ['中西區', '灣仔區', ...]
        """
        cursor = self.conn.cursor()

        safe_field = field_name.replace("'", "''")

        query = f"""
        SELECT DISTINCT {safe_field}
        FROM portfolio.policies
        WHERE {safe_field} IS NOT NULL
        ORDER BY {safe_field}
        LIMIT %s;
        """

        cursor.execute(query, (limit,))
        results = cursor.fetchall()
        cursor.close()

        return [row[0] for row in results]


# =================================================================
# API端点函数 (供Flask/FastAPI使用)
# =================================================================

def api_get_18_districts(year: Optional[int] = None):
    """API: 获取18区统计"""
    with PortfolioAnalytics() as analytics:
        return analytics.get_18_districts_exposure(year)

def api_get_3_major_regions(year: Optional[int] = None):
    """API: 获取3大区统计"""
    with PortfolioAnalytics() as analytics:
        return analytics.get_3_major_regions_exposure(year)

def api_group_by(group_by: str, aggregations: Dict = None, filters: Dict = None):
    """API: 按任意字段分组"""
    with PortfolioAnalytics() as analytics:
        return analytics.group_by_field(group_by, aggregations, filters)

def api_cross_analysis(dim1: str, dim2: str, metric: str, agg_func: str = 'sum', filters: Dict = None):
    """API: 交叉分析"""
    with PortfolioAnalytics() as analytics:
        return analytics.cross_analysis(dim1, dim2, metric, agg_func, filters)

def api_time_series(time_grain: str, metric: str, agg_func: str = 'sum', group_by: str = None):
    """API: 时间序列分析"""
    with PortfolioAnalytics() as analytics:
        return analytics.time_series_analysis(time_grain, metric, agg_func, group_by)

def api_get_fields():
    """API: 获取所有可用字段"""
    with PortfolioAnalytics() as analytics:
        return analytics.get_available_fields()

def api_get_field_values(field_name: str):
    """API: 获取字段唯一值"""
    with PortfolioAnalytics() as analytics:
        return analytics.get_field_values(field_name)


if __name__ == '__main__':
    # 测试用例
    print("Testing Portfolio Analytics API...")
    print()

    with PortfolioAnalytics() as analytics:
        # Test 1: 18 districts
        print("1. 18 Districts Exposure (2024):")
        result = analytics.get_18_districts_exposure(2024)
        for row in result[:5]:
            print(f"   {row['district']}: HKD {row['total_exposure']:,.2f} ({row['policy_count']} policies)")
        print()

        # Test 2: Group by occupancy
        print("2. Group by Occupancy (Top 10):")
        result = analytics.group_by_field('佔用性質', {'公司保額': 'sum'}, limit=10)
        for row in result:
            print(f"   {row['group_value']}: {row['record_count']} policies")
        print()

        # Test 3: Available fields
        print("3. Available Fields:")
        fields = analytics.get_available_fields()
        print(f"   Chinese fields: {len(fields['chinese_fields'])}")
        print(f"   English fields: {len(fields['english_fields'])}")
        print(f"   Numeric fields: {len(fields['numeric_fields'])}")
        print()

        print("Tests completed successfully!")
