# 快速开始指南 - Portfolio Analysis 功能

## 当前状态

✅ **前端功能已完成**
- UI界面：地图图层选择器
- 交互功能：鼠标悬停、点击、高亮
- 统计面板：显示保单信息

⚠️ **数据库配置待完成**
- 需要添加TPU/PPU/SPU列到数据库
- 需要导入shapefile数据

## 立即测试（无需数据库配置）

1. **启动开发服务器**
   ```bash
   cd "d:\Nat Cat Platform\UI_system"
   npm run dev
   ```

2. **访问页面**
   - 打开浏览器：http://localhost:3000/cityinfo
   - 在左侧找到 "Portfolio Analysis" 卡片
   - 勾选 "TPU (292 Polygons)"

3. **测试交互**
   - ✅ 地图会显示TPU区域边界（蓝色多边形）
   - ✅ 鼠标悬停会高亮显示（黄色）
   - ✅ 会显示Tooltip "TPU: xxx"
   - ✅ 点击区域会显示统计面板
   - ⚠️ 统计面板会提示需要配置数据库

## 完整设置（启用保单统计查询）

### 选项 1：使用交互式脚本（推荐）

在PowerShell中运行：
```powershell
cd "d:\Nat Cat Platform\UI_system"
.\scripts\setup_planning_units_interactive.ps1
```

脚本会提示你输入PostgreSQL密码，然后自动配置数据库。

### 选项 2：手动运行SQL

```powershell
# 方法A：使用psql命令行
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d natcat_platform

# 进入psql后，运行：
\i UI_system/scripts/portfolio_management/database/add_planning_units.sql

# 方法B：使用pgAdmin
# 1. 打开pgAdmin
# 2. 连接到 natcat_platform 数据库
# 3. 打开Query Tool
# 4. 复制粘贴 add_planning_units.sql 的内容
# 5. 点击运行
```

### 选项 3：使用 Windows PowerShell 直接执行

如果你知道PostgreSQL密码，可以修改 `scripts/setup_planning_units.ps1` 中的密码，然后运行：

```powershell
cd "d:\Nat Cat Platform\UI_system"
powershell -ExecutionPolicy Bypass -File .\scripts\setup_planning_units.ps1
```

## 验证安装

运行以下SQL查询来验证列是否添加成功：

```sql
-- 检查新增的列
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'portfolio'
  AND table_name = 'policies'
  AND column_name IN ('TPU', 'PPU', 'SPU', 'SUBUNIT');

-- 应该返回4行结果
```

## 下一步：导入Shapefile数据

完成数据库列添加后，还需要：

1. **导入shapefile到PostGIS**（使用QGIS或shp2pgsql）
2. **运行空间关联**来填充TPU/PPU/SPU字段

详细步骤请参考：`docs/PORTFOLIO_ANALYSIS_SETUP.md`

## 故障排除

### 问题：psql 命令找不到

**解决方案**：
使用完整路径：`"C:\Program Files\PostgreSQL\18\bin\psql.exe"`

### 问题：密码认证失败

**解决方案**：
1. 使用交互式脚本输入正确密码
2. 或者在pgAdmin中手动运行SQL

### 问题：数据库不存在

**解决方案**：
先创建数据库：
```sql
CREATE DATABASE natcat_platform;
```

然后运行schema.sql创建表结构：
```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d natcat_platform -f "UI_system/scripts/portfolio_management/database/schema.sql"
```

## 测试建议

即使没有完成数据库配置，你也可以：

1. ✅ 测试地图显示功能
2. ✅ 测试交互效果（悬停、高亮）
3. ✅ 查看UI界面和布局
4. ✅ 验证API是否能正确返回提示信息

完成数据库配置后，你将能够：
5. ✅ 查询真实的保单统计数据
6. ✅ 看到每个区域的保单数量、总保额等信息

## 需要帮助？

查看详细文档：
- 完整设置指南：`docs/PORTFOLIO_ANALYSIS_SETUP.md`
- 数据库Schema：`UI_system/scripts/portfolio_management/database/schema.sql`
- API文档：`src/app/api/portfolio/region-stats/route.ts`
