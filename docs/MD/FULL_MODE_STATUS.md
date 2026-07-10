# Full (68K) Mode - 当前状态说明

**日期**: 2025年12月15日
**状态**: ⚠️ **临时使用样本数据**

---

## 问题说明

Direct Insurance的**Full (68K)模式**目前**暂时无法加载真实的68K数据**，原因如下：

### 1. 缺失的后端组件

Full模式需要Python后端脚本来从PostgreSQL数据库读取68,762条保单数据，但该脚本尚未创建：

**缺失文件**:
```
D:\Nat Cat Platform\scripts\portfolio_management\analytics\portfolio_analytics.py
```

**API路由**: `/api/portfolio/18-districts` (已创建但无法执行)
- 文件位置: [src/app/api/portfolio/18-districts/route.ts](../src/app/api/portfolio/18-districts/route.ts)
- Python路径: `C:\Users\sichen\AppData\Local\anaconda3\python.exe`

### 2. 当前临时方案

为了保证功能可用，Full模式**暂时也使用5K样本数据**：

**修改文件**: [src/hooks/usePortfolioData.ts](../src/hooks/usePortfolioData.ts#L316-L344)

```typescript
async function loadDirectFull(year?: number | null) {
  // TODO: Python analytics script not yet available, temporarily using sample data
  console.warn('⚠️ Full mode: Python analytics script not available, using sample data');

  // Temporarily fallback to sample data
  return await loadDirectSample();
}
```

**用户提示**:
- Sample模式: "✓ Showing 5,000 sample policies for fast rendering"
- Full模式: "⚠️ Full mode temporarily uses sample data (Python API pending)"

---

## 数据源对比

| 模式 | 数据来源 | 数据量 | 状态 | 说明 |
|------|---------|--------|------|------|
| **Sample (5K)** | 静态JSON文件 | 5,000条 | ✅ 可用 | `/data/tphk_portfolio_subset_5000.json` |
| **Full (68K)** | PostgreSQL数据库 | 68,762条 | ❌ 暂不可用 | 需要Python脚本 `portfolio_analytics.py` |
| **Analytics** | 数据库API | 全量数据 | ⚠️ 部分可用 | 部分组件调用数据库，部分使用样本 |

---

## 如何恢复Full模式的真实数据加载

### 步骤1: 创建Python分析脚本

**文件路径**: `D:\Nat Cat Platform\scripts\portfolio_management\analytics\portfolio_analytics.py`

**必需函数**:
```python
import psycopg2
from dotenv import load_dotenv
import os

def api_get_18_districts(year=None):
    """
    从PostgreSQL数据库获取18区的保单数据

    Args:
        year: 过滤年份（可选）

    Returns:
        list: 保单数据列表
    """
    load_dotenv()

    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'natcat_platform'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )

    cursor = conn.cursor()

    # SQL查询
    if year:
        query = """
            SELECT
                保單號 as id,
                風險地址 as address,
                分區 as region,
                公司保額 as sum_insured,
                經營性質 as occupancy,
                建築等級 as construction,
                建造年份 as year_built,
                經度 as lng,
                緯度 as lat
            FROM portfolio.policies
            WHERE EXTRACT(YEAR FROM 保單起期) = %s
        """
        cursor.execute(query, (year,))
    else:
        query = """
            SELECT
                保單號 as id,
                風險地址 as address,
                分區 as region,
                公司保額 as sum_insured,
                經營性質 as occupancy,
                建築等級 as construction,
                建造年份 as year_built,
                經度 as lng,
                緯度 as lat
            FROM portfolio.policies
        """
        cursor.execute(query)

    columns = [desc[0] for desc in cursor.description]
    results = []

    for row in cursor.fetchall():
        record = dict(zip(columns, row))
        # 添加location字段
        if record.get('lat') and record.get('lng'):
            record['location'] = {
                'lat': float(record['lat']),
                'lng': float(record['lng'])
            }
        results.append(record)

    cursor.close()
    conn.close()

    return results
```

### 步骤2: 修改数据加载函数

**文件**: [src/hooks/usePortfolioData.ts](../src/hooks/usePortfolioData.ts#L316-L344)

**修改**:
```typescript
async function loadDirectFull(year?: number | null) {
  // 取消注释API调用
  try {
    const url = year
      ? `/api/portfolio/18-districts?year=${year}`
      : '/api/portfolio/18-districts';

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load full data');

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error loading direct full data:', error);
    return [];
  }
}
```

### 步骤3: 更新UI提示

**文件**: [src/app/asset/page.tsx](../src/app/asset/page.tsx#L1003-L1007)

**修改**:
```typescript
<p className="text-[10px] text-gray-600 mt-2">
  {performanceMode === 'sample'
    ? '✓ Showing 5,000 sample policies for fast rendering'
    : '✓ Loading all 68,762 policies from database'}
</p>
```

---

## 数据库确认

PostgreSQL数据库中已有完整数据：

```sql
-- 确认数据总量
SELECT COUNT(*) FROM portfolio.policies;
-- 结果: 68,762

-- 确认唯一保单数
SELECT COUNT(DISTINCT 保單號) FROM portfolio.policies;
-- 结果: 68,762

-- 按年份统计
SELECT
    EXTRACT(YEAR FROM 保單起期) as year,
    COUNT(*) as policy_count
FROM portfolio.policies
WHERE 保單起期 IS NOT NULL
GROUP BY EXTRACT(YEAR FROM 保單起期)
ORDER BY year;
```

**数据库连接信息**:
- Host: localhost
- Port: 5432
- Database: natcat_platform
- Schema: portfolio
- Table: policies

---

## 当前工作状态

### ✅ 已完成
- Unified架构实现（2-tier: Data Source → View Mode）
- Sample (5K) 模式完全可用（含NaN修复）
- Analytics Dashboard集成
- UI控件和状态管理
- 临时fallback机制

### ⚠️ 待完成
- Python分析脚本 `portfolio_analytics.py`
- Full (68K) 真实数据加载
- 年份过滤功能（依赖Python脚本）

### 📋 建议优先级
1. **高优先级**: 创建Python分析脚本以支持Full模式
2. **中优先级**: 添加错误处理和重试机制
3. **低优先级**: 性能优化（如数据缓存、分页加载）

---

## 用户使用建议

### 当前推荐使用

1. **Sample (5K) 模式**:
   - ✅ 快速浏览和探索
   - ✅ 功能完全可用
   - ✅ 数据已修复（NaN → null）

2. **Analytics Dashboard**:
   - ✅ 概览统计
   - ✅ 地图可视化
   - ✅ 18区分析
   - ⚠️ 部分功能使用样本数据

### 避免使用

- ❌ **Full (68K) 模式**: 当前实际加载的仍是5K样本数据，不建议选择

---

## 技术支持

**相关文件**:
- 统一架构文档: [UNIFIED_ARCHITECTURE_IMPLEMENTATION.md](UNIFIED_ARCHITECTURE_IMPLEMENTATION.md)
- 完成报告: [UNIFIED_ARCHITECTURE_COMPLETION_REPORT.md](UNIFIED_ARCHITECTURE_COMPLETION_REPORT.md)

**开发者**: Claude Code Development Team
**更新日期**: 2025年12月15日
