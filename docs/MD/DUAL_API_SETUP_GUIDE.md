# 双API配置完成指南 - Google Maps + 高德地图

## 🎉 恭喜！你现在有两个API密钥了

这是最佳配置：
- **Google Maps**: 主力（对香港英文地址精度最高）
- **高德地图**: 备用（免费额度大，30万次/天）

## ⚡ 快速配置（3步）

### 第1步：填入API密钥

打开文件：`D:\Nat Cat Platform\UI_system\.env`

填入你的两个密钥：

```bash
# Google Maps API Key (主要geocoding服务 - 精度最高)
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX

# 高德地图API Key (备用geocoding服务)
AMAP_API_KEY=你的高德密钥XXXXXXXXXXXXXXXX
```

**重要提示：**
- Google密钥通常以 `AIza` 开头
- 高德密钥是32位字符串
- 确保没有多余空格
- 保存文件

### 第2步：测试两个API

双击运行测试脚本：
```
D:\Nat Cat Platform\UI_system\scripts\test-all-apis.bat
```

或命令行运行：
```bash
cd "D:\Nat Cat Platform\UI_system\scripts"
python test-all-apis.py
```

**预期输出：**
```
╔==========================================================╗
║               Geocoding API 综合测试                      ║
╚==========================================================╝

============================================================
Google Maps API 测试
============================================================

✓ API密钥已配置: AIzaSyXXXXXXXXX...

测试地址: 8/F., HOPEWELL LOGISTICS CENTRE, NO.2-12 WING KEI ROAD...

发送请求到Google Maps API...
✓ API响应状态: OK

============================================================
✅ Google Maps 测试成功！
============================================================
原始地址: 8/F., HOPEWELL LOGISTICS CENTRE...
标准地址: Hopewell Logistics Centre, 8/F, 2-12 Wing Kei Rd, Kwai Chung, Hong Kong
纬度: 22.3612345
经度: 114.1234567
Place ID: ChIJXXXXXXXXXXXXXXXXXX

============================================================
高德地图API 测试
============================================================

✓ API密钥已配置: a1b2c3d4e5...

测试地址: 香港葵涌永基路2-12号合和实业中心8楼

发送请求到高德地图API...
✓ API响应状态: 1

============================================================
✅ 高德地图 测试成功！
============================================================
原始地址: 香港葵涌永基路2-12号合和实业中心8楼
标准地址: 香港特别行政区葵青区永基路2-12号
经度: 114.1234
纬度: 22.3612

============================================================
测试总结
============================================================
✅ Google Maps: 成功
✅ 高德地图: 成功

🎉 太好了！两个API都配置正确！

推荐策略:
- Google Maps 作为主要服务（精度高，适合香港英文地址）
- 高德地图作为备用服务（免费额度大）
============================================================

✅ 准备就绪！可以运行完整geocoding:

   测试命令:
   python scripts/geocode-tphk-portfolio.py --test

   完整处理:
   python scripts/geocode-tphk-portfolio.py
```

### 第3步：运行Geocoding

测试通过后，运行完整处理：

```bash
cd "D:\Nat Cat Platform\UI_system\scripts"
python geocode-tphk-portfolio.py
```

## 🔄 工作流程

系统会自动：

1. **首先尝试 Google Maps API**
   - 对香港英文地址识别率最高
   - 返回标准化的地址格式
   - 提供精确的经纬度坐标

2. **如果Google失败，自动切换到高德**
   - 作为备用方案
   - 对中文地址效果好
   - 免费额度更大

3. **缓存所有结果**
   - 避免重复调用API
   - 节省配额和成本
   - 加速后续运行

## 📊 API对比

### Google Maps API

| 特性 | 详情 |
|------|------|
| **优势** | 香港地址精度最高、英文地址识别好 |
| **免费额度** | $200/月（约28,500次） |
| **适合场景** | 香港英文商业地址 |
| **坐标系统** | WGS84（国际标准） |
| **需要** | 信用卡验证 |

### 高德地图API

| 特性 | 详情 |
|------|------|
| **优势** | 免费额度大、中文地址好 |
| **免费额度** | 30万次/天 |
| **适合场景** | 中国大陆地址 |
| **坐标系统** | GCJ-02（火星坐标） |
| **需要** | 仅需手机号注册 |

## 💰 成本估算

### 你的TPHK数据量估计
- 承保信息：约1,000-5,000个地址
- 理赔信息：约100-500个地址
- 去重后：约1,000-3,000个唯一地址

### 成本计算
```
首次运行:
- Google API调用：约1,000-3,000次
- 预计费用：$5-15（完全在$200免费额度内）
- 实际成本：$0

后续运行:
- 使用缓存，不调用API
- 成本：$0
```

## ⚠️ Google Maps API 常见问题

### 问题1：REQUEST_DENIED（访问被拒绝）

**原因：**
- 未启用 Geocoding API
- API密钥限制设置

**解决方法：**
1. 访问：https://console.cloud.google.com/google/maps-apis/
2. 确认 "Geocoding API" 已启用（绿色✓）
3. 检查API密钥设置：
   - 应用限制：无（或设为"无限制"）
   - API限制：可以限制为仅"Geocoding API"

### 问题2：OVER_QUERY_LIMIT（配额超限）

**原因：**
- 每秒请求数过多
- 每日配额用完

**解决方法：**
- 脚本已内置速率限制（10次/秒）
- 如果配额用完，等待24小时重置
- 或升级为付费版

### 问题3：ZERO_RESULTS（无结果）

**这是正常的！**
- 某些地址可能在数据库中不存在
- 系统会自动尝试高德API
- 两个都失败才标记为失败

## ⚠️ 高德地图API 常见问题

### 问题1：INVALID_USER_KEY (10001)

**原因：**
- API密钥错误或失效

**解决方法：**
1. 重新复制密钥，确保无空格
2. 检查密钥状态是否"正常"
3. 访问：https://console.amap.com/dev/key/app

### 问题2：USERKEY_PLAT_NOMATCH (10009)

**原因：**
- 密钥类型不匹配（最常见错误）

**解决方法：**
必须创建"Web服务"类型的密钥：
1. 登录高德控制台
2. 创建新密钥
3. **选择服务平台：Web服务**（不是JS API）
4. 获取新密钥并替换

### 问题3：DAILY_QUERY_OVER_LIMIT (10003)

**原因：**
- 今日30万次配额用完

**解决方法：**
- 等待第二天重置
- 或升级为付费版

## 🎯 最佳实践

### 1. 分批测试
```bash
# 先测试少量数据
python geocode-tphk-portfolio.py --test

# 确认无误后再全量处理
python geocode-tphk-portfolio.py
```

### 2. 监控进度
脚本会实时显示：
```
[1/1000] Geocoding: 8/F., HOPEWELL LOGISTICS...
[2/1000] Geocoding: HOUSE K35 MARINA COVE...
...
Progress: 100/1000 (10.0%)
Cache saved at 100 addresses
```

### 3. 查看日志
```bash
# 实时查看日志
tail -f tphk-geocoding.log

# 或Windows下
notepad tphk-geocoding.log
```

### 4. 检查结果
处理完成后查看：
```
public/data/TPHK_GEOCODING_REPORT.md
```

## 📁 输出文件

所有文件保存在 `D:\Nat Cat Platform\UI_system\public\data\`

| 文件名 | 用途 | 格式 |
|--------|------|------|
| `tphk-portfolio.geojson` | 前端地图可视化 | GeoJSON |
| `tphk-geocoded-portfolio.json` | 完整结果（含元数据） | JSON |
| `tphk-geocoding-cache.json` | 缓存（加速重跑） | JSON |
| `TPHK_GEOCODING_REPORT.md` | 统计报告 | Markdown |

## 📊 统计报告示例

```markdown
# TPHK Portfolio Geocoding Report

## Summary
- **Total Addresses**: 1,234
- **Successfully Geocoded**: 1,180 (95.6%)
- **Failed**: 54 (4.4%)

## Geocoding Providers
- **Google Maps**: 1,150 addresses (97.5%)
- **Amap**: 30 addresses (2.5%)

## Distribution by Region
- **葵青區**: 456 addresses
- **九龍城區**: 234 addresses
- **西貢區**: 123 addresses
...
```

## 🚀 下一步

1. ✅ 配置API密钥
2. ✅ 测试API连接
3. 🔄 运行geocoding处理
4. 📊 查看结果报告
5. 🗺️ 前端可视化集成
6. 🌪️ 与风险数据关联

## 📞 技术支持

### 获取帮助

**Google Maps:**
- 文档：https://developers.google.com/maps/documentation/geocoding/
- 控制台：https://console.cloud.google.com/

**高德地图:**
- 文档：https://lbs.amap.com/api/webservice/guide/api/georegeo
- 控制台：https://console.amap.com/

### 脚本文件

| 文件 | 用途 |
|------|------|
| `test-all-apis.bat` | 测试两个API |
| `test-amap.bat` | 只测试高德API |
| `test-geocoding.bat` | 快速测试（旧版） |
| `run-geocoding.bat` | 运行完整处理 |

---

**创建时间**: 2025-12-05
**状态**: 双API配置完成，等待用户填入密钥
**推荐**: 优先使用Google Maps，高德作为备用
