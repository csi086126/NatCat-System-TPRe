# pgAdmin 4 图形界面操作指南

## 创建用户（Login/Group Role）

### 1. 定位到 Login/Group Roles
```
Object Explorer
└── Servers
    └── PostgreSQL 15 (或你的版本)
        ├── Login/Group Roles  ← 右键点击这里
        ├── Databases
        └── ...
```

### 2. 创建新用户
**右键 `Login/Group Roles` → `Create` → `Login/Group Role...`**

弹出对话框后，填写以下信息：

#### General 标签页
- **Name**: `natcat_admin` (或你喜欢的用户名)

#### Definition 标签页
- **Password**: 输入强密码（例如：`NatCat2024!Secure`）
- **Password expiration**: 可以留空

#### Privileges 标签页
勾选以下选项：
- ✅ **Can login?** (允许登录)
- ✅ **Create databases?** (允许创建数据库)
- ✅ **Create roles?** (可选，用于创建其他用户)

#### SQL 标签页
可以查看生成的 SQL 语句：
```sql
CREATE ROLE natcat_admin WITH
  LOGIN
  PASSWORD 'xxxxxx'
  CREATEDB;
```

点击 **Save** 完成创建。

---

## 创建数据库

### 1. 定位到 Databases
```
Object Explorer
└── Servers
    └── PostgreSQL 15
        └── Databases  ← 右键点击这里
```

### 2. 创建新数据库
**右键 `Databases` → `Create` → `Database...`**

#### General 标签页
- **Database**: `natcat_platform`
- **Owner**: 选择 `natcat_admin` (刚才创建的用户)
- **Comment**: `Nat Cat Platform - TPHK Portfolio Database`

#### SQL 标签页
查看生成的 SQL：
```sql
CREATE DATABASE natcat_platform
    WITH
    OWNER = natcat_admin
    ENCODING = 'UTF8'
    CONNECTION LIMIT = -1;
```

点击 **Save** 完成创建。

---

## 启用 PostGIS 扩展

### 1. 连接到新数据库
```
Object Explorer
└── Servers
    └── PostgreSQL 15
        └── Databases
            └── natcat_platform  ← 右键点击
```

选择 `Query Tool` 打开 SQL 查询窗口

### 2. 执行 SQL 命令
在查询窗口中输入：
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

点击 **Execute/Refresh** 按钮（或按 F5）执行

### 3. 验证 PostGIS
继续执行：
```sql
SELECT PostGIS_Version();
```

应该显示 PostGIS 版本号，例如：`3.3.2 USE_GEOS=1 USE_PROJ=1 ...`

---

## 配置完成后的验证

### 检查用户
```
Login/Group Roles
└── natcat_admin  ← 应该可以看到
```

### 检查数据库
```
Databases
├── postgres (默认数据库)
└── natcat_platform  ← 你的新数据库
    ├── Schemas
    │   └── public
    │       └── Extensions
    │           └── postgis  ← PostGIS 扩展
    └── ...
```

---

## 下一步：更新导入脚本配置

打开 `import-to-postgres.py`，修改数据库配置（第 36-42 行）：

```python
DB_CONFIG = {
    'host': 'localhost',
    'database': 'natcat_platform',
    'user': 'natcat_admin',        # 你创建的用户名
    'password': 'YourPassword',    # 你设置的密码
    'port': 5432
}
```

---

## 准备运行导入脚本

在 Anaconda Prompt 中：
```bash
# 1. 激活环境
conda activate geo_env

# 2. 安装依赖
pip install psycopg2-binary

# 3. 运行导入脚本
cd "D:\Nat Cat Platform\spyder_scripts"
python import-to-postgres.py
```

或在 Spyder 中：
1. 打开 `import-to-postgres.py`
2. 修改密码配置
3. 按 F5 运行
