# 后端 API 快速测试脚本

本文档提供了测试后端 API 的快速命令。

## 前提条件

确保开发服务器正在运行：
```bash
npm run dev
```

## Windows PowerShell 测试命令

### 1. 测试获取所有事件
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method Get | ConvertTo-Json -Depth 5
```

### 2. 测试创建历史事件
```powershell
$event = @{
    event = @{
        id = "Typhoon-2024-001"
        name = "Test Typhoon Hato"
        type = "typhoon"
        date = "2024-08-23"
        severity = "high"
        impactArea = @{
            level1 = "Hong Kong"
            level2 = "Hong Kong Island"
            level3 = "Central and Western"
        }
        coordinates = @(22.3193, 114.1694)
    }
    category = "historical"
}

$json = $event | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method Post -Body $json -ContentType "application/json" | ConvertTo-Json -Depth 5
```

### 3. 测试创建随机事件
```powershell
$event = @{
    event = @{
        id = "Stoch-0001"
        name = "Test Stochastic Event"
        type = "flood"
        year = 2025
        returnPeriod = 100
        impactArea = @{
            level1 = "Hong Kong"
        }
        coordinates = @(22.3, 114.2)
    }
    category = "stochastic"
}

$json = $event | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method Post -Body $json -ContentType "application/json" | ConvertTo-Json -Depth 5
```

### 4. 测试更新事件
```powershell
$event = @{
    event = @{
        id = "Typhoon-2024-001"
        name = "Updated Typhoon Hato"
        type = "typhoon"
        date = "2024-08-23"
        severity = "critical"
        impactArea = @{
            level1 = "Hong Kong"
            level2 = "Hong Kong Island"
            level3 = "Central and Western"
        }
        coordinates = @(22.3193, 114.1694)
    }
    category = "historical"
}

$json = $event | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method Put -Body $json -ContentType "application/json" | ConvertTo-Json -Depth 5
```

### 5. 测试删除事件
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events?id=Typhoon-2024-001&category=historical" -Method Delete | ConvertTo-Json
```

### 6. 测试获取历史事件
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events?category=historical" -Method Get | ConvertTo-Json -Depth 5
```

### 7. 测试获取随机事件
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/events?category=stochastic" -Method Get | ConvertTo-Json -Depth 5
```

## 文件上传测试

### 准备测试文件
首先创建一些测试文件：

#### 创建测试 JSON 文件
```powershell
$testEvent = @{
    id = "Test-2024-001"
    name = "Test Rainstorm Event"
    type = "rainstorm"
    date = "2024-09-15"
    severity = "medium"
    impactArea = @{
        level1 = "Macau"
        level2 = "Macau Peninsula"
    }
    coordinates = @(22.1987, 113.5439)
    category = "historical"
}

$testEvent | ConvertTo-Json -Depth 5 | Out-File -FilePath "test-event.json" -Encoding UTF8
Write-Host "Test JSON file created: test-event.json"
```

### 测试文件上传（需要实际文件）
```powershell
# 注意：文件上传需要使用 multipart/form-data
# PowerShell 的 Invoke-RestMethod 可以这样做：

$filePath = "path\to\your\file.shp"
$eventId = "Typhoon-2024-001"
$fileType = "shapefile"

# 这需要实际的文件，暂时跳过自动化测试
Write-Host "File upload testing requires actual files. Please use the web interface to test file uploads."
```

## 一键测试所有 API

运行完整的测试套件：

```powershell
# 保存为 test-api.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Flood Insurance Backend API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 测试获取事件
Write-Host "1. Testing GET /api/events..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method Get
    Write-Host "✓ Success: Found $($result.data.historical.Count) historical and $($result.data.stochastic.Count) stochastic events" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}
Write-Host ""

# 2. 测试创建事件
Write-Host "2. Testing POST /api/events (Create)..." -ForegroundColor Yellow
try {
    $event = @{
        event = @{
            id = "API-Test-001"
            name = "API Test Event"
            type = "flood"
            date = "2024-10-16"
            severity = "low"
        }
        category = "historical"
    }
    $json = $event | ConvertTo-Json -Depth 5
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method Post -Body $json -ContentType "application/json"
    Write-Host "✓ Success: Event created - $($result.data.id)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}
Write-Host ""

# 3. 测试更新事件
Write-Host "3. Testing PUT /api/events (Update)..." -ForegroundColor Yellow
try {
    $event = @{
        event = @{
            id = "API-Test-001"
            name = "API Test Event (Updated)"
            type = "flood"
            date = "2024-10-16"
            severity = "medium"
        }
        category = "historical"
    }
    $json = $event | ConvertTo-Json -Depth 5
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/events" -Method Put -Body $json -ContentType "application/json"
    Write-Host "✓ Success: Event updated - $($result.data.name)" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}
Write-Host ""

# 4. 测试获取特定类别
Write-Host "4. Testing GET /api/events?category=historical..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/events?category=historical" -Method Get
    Write-Host "✓ Success: Found $($result.data.historical.Count) historical events" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}
Write-Host ""

# 5. 测试删除事件
Write-Host "5. Testing DELETE /api/events..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:3000/api/events?id=API-Test-001&category=historical" -Method Delete
    Write-Host "✓ Success: Event deleted" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "API Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
```

## 运行测试脚本

### 方式 1: 直接复制粘贴
将上面的测试脚本复制到 PowerShell 中执行。

### 方式 2: 保存为文件执行
```powershell
# 将脚本保存为 test-api.ps1
# 然后执行：
.\test-api.ps1
```

### 方式 3: 使用快捷命令
```powershell
# 添加到你的 PowerShell profile
function Test-FloodAPI {
    Write-Host "Testing API..." -ForegroundColor Cyan
    Invoke-RestMethod -Uri "http://localhost:3000/api/events" | ConvertTo-Json -Depth 5
}

# 使用：
Test-FloodAPI
```

## 查看生成的数据文件

### 查看历史事件数据
```powershell
Get-Content "public\data\historical-events.json" | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

### 查看随机事件数据
```powershell
Get-Content "public\data\stochastic-events-index.json" | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

### 查看上传的文件
```powershell
Get-ChildItem "public\uploads\" -Recurse
```

## 清理测试数据

### 删除所有测试事件
```powershell
# 重置历史事件文件
$mockHistorical = @(
    @{
        id = "Typhoon-2017-001"
        name = "Typhoon Hato"
        type = "typhoon"
        date = "2017-08-23"
        severity = "high"
    },
    @{
        id = "Rainstorm-2023-002"
        name = "Black Rainstorm May 2023"
        type = "rainstorm"
        date = "2023-05-08"
        severity = "critical"
    }
)

$mockHistorical | ConvertTo-Json -Depth 5 | Out-File -FilePath "public\data\historical-events.json" -Encoding UTF8
Write-Host "Historical events reset to mock data"
```

### 删除上传的文件
```powershell
if (Test-Path "public\uploads") {
    Remove-Item -Path "public\uploads\*" -Recurse -Force
    Write-Host "Uploaded files cleaned"
}
```

## 使用 curl 测试（如果安装了）

### GET 请求
```bash
curl http://localhost:3000/api/events
```

### POST 请求
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d "{\"event\":{\"id\":\"Test-001\",\"name\":\"Test Event\",\"type\":\"flood\"},\"category\":\"historical\"}"
```

## 下一步

1. ✅ 测试所有 API 端点
2. ✅ 验证数据持久化
3. ✅ 测试文件上传
4. → 集成到前端界面
5. → 添加错误处理
6. → 实现数据验证
