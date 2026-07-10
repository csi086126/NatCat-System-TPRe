# 测试二进制数据文件生成脚本

## Python脚本生成测试.bin文件

```python
import struct
import random

# 创建测试二进制文件
# 格式：每条记录20字节（经度float, 纬度float, 深度float, 速度float, 时间戳uint）

def generate_test_binary():
    """生成测试用的二进制洪水模拟数据"""
    
    filename = 'test-flood-simulation.bin'
    num_points = 100  # 生成100个数据点
    
    with open(filename, 'wb') as f:
        for i in range(num_points):
            # 香港区域坐标范围
            longitude = 113.8 + random.random() * 0.5  # 113.8 - 114.3
            latitude = 22.2 + random.random() * 0.4    # 22.2 - 22.6
            
            # 洪水深度 (0-5米)
            flood_depth = random.random() * 5.0
            
            # 水流速度 (0-3 m/s)
            water_velocity = random.random() * 3.0
            
            # 时间戳 (Unix timestamp)
            timestamp = 1695168000 + i * 3600  # 2023-09-20开始，每小时一个点
            
            # 打包为二进制 (小端序)
            data = struct.pack('<ffffI', 
                longitude, 
                latitude, 
                flood_depth, 
                water_velocity, 
                timestamp
            )
            
            f.write(data)
    
    print(f"Generated {filename} with {num_points} records")
    print(f"File size: {num_points * 20} bytes")

if __name__ == '__main__':
    generate_test_binary()
```

## 使用说明

### 1. 运行Python脚本
```bash
python generate_test_binary.py
```

### 2. 生成的文件
```
test-flood-simulation.bin
大小: 2000 bytes (100条记录 × 20字节)
```

### 3. 数据结构
```
每条记录20字节：
Offset | Type    | Size | Description
-------|---------|------|------------------
0      | float32 | 4    | 经度 (Longitude)
4      | float32 | 4    | 纬度 (Latitude)
8      | float32 | 4    | 洪水深度 (Flood Depth, 米)
12     | float32 | 4    | 水流速度 (Water Velocity, m/s)
16     | uint32  | 4    | 时间戳 (Unix Timestamp)
```

### 4. 解析代码（JavaScript）
```javascript
function parseFloodSimulation(arrayBuffer) {
  const dataView = new DataView(arrayBuffer);
  const recordSize = 20;
  const numRecords = arrayBuffer.byteLength / recordSize;
  const results = [];
  
  for (let i = 0; i < numRecords; i++) {
    const offset = i * recordSize;
    results.push({
      longitude: dataView.getFloat32(offset, true),
      latitude: dataView.getFloat32(offset + 4, true),
      floodDepth: dataView.getFloat32(offset + 8, true),
      waterVelocity: dataView.getFloat32(offset + 12, true),
      timestamp: dataView.getUint32(offset + 16, true),
      // 转换时间戳为日期
      date: new Date(dataView.getUint32(offset + 16, true) * 1000).toISOString()
    });
  }
  
  return results;
}

// 使用示例
const data = parseFloodSimulation(uploadedArrayBuffer);
console.log(`Parsed ${data.length} flood simulation points`);

// 找出最深的洪水点
const maxDepthPoint = data.reduce((max, point) => 
  point.floodDepth > max.floodDepth ? point : max
);
console.log('Maximum flood depth:', maxDepthPoint);
```

### 5. 可视化
```javascript
// 在Leaflet地图上显示
data.forEach(point => {
  const color = point.floodDepth > 2 ? 'red' : 
                point.floodDepth > 1 ? 'orange' : 
                'yellow';
  
  L.circleMarker([point.latitude, point.longitude], {
    radius: 5,
    color: color,
    fillOpacity: 0.7
  }).addTo(map)
    .bindPopup(`Depth: ${point.floodDepth.toFixed(2)}m<br>
                Velocity: ${point.waterVelocity.toFixed(2)}m/s<br>
                Time: ${point.date}`);
});
```

## Node.js版本

```javascript
const fs = require('fs');

function generateTestBinary() {
  const numPoints = 100;
  const buffer = Buffer.alloc(numPoints * 20);
  
  for (let i = 0; i < numPoints; i++) {
    const offset = i * 20;
    
    // 香港区域坐标
    const longitude = 113.8 + Math.random() * 0.5;
    const latitude = 22.2 + Math.random() * 0.4;
    const floodDepth = Math.random() * 5.0;
    const waterVelocity = Math.random() * 3.0;
    const timestamp = 1695168000 + i * 3600;
    
    buffer.writeFloatLE(longitude, offset);
    buffer.writeFloatLE(latitude, offset + 4);
    buffer.writeFloatLE(floodDepth, offset + 8);
    buffer.writeFloatLE(waterVelocity, offset + 12);
    buffer.writeUInt32LE(timestamp, offset + 16);
  }
  
  fs.writeFileSync('test-flood-simulation.bin', buffer);
  console.log('Binary file generated successfully!');
}

generateTestBinary();
```

## 在线生成器（浏览器）

```html
<!DOCTYPE html>
<html>
<head>
  <title>Binary Test File Generator</title>
</head>
<body>
  <button onclick="generateAndDownload()">Generate Test Binary File</button>
  
  <script>
    function generateAndDownload() {
      const numPoints = 100;
      const buffer = new ArrayBuffer(numPoints * 20);
      const view = new DataView(buffer);
      
      for (let i = 0; i < numPoints; i++) {
        const offset = i * 20;
        
        const longitude = 113.8 + Math.random() * 0.5;
        const latitude = 22.2 + Math.random() * 0.4;
        const floodDepth = Math.random() * 5.0;
        const waterVelocity = Math.random() * 3.0;
        const timestamp = 1695168000 + i * 3600;
        
        view.setFloat32(offset, longitude, true);
        view.setFloat32(offset + 4, latitude, true);
        view.setFloat32(offset + 8, floodDepth, true);
        view.setFloat32(offset + 12, waterVelocity, true);
        view.setUint32(offset + 16, timestamp, true);
      }
      
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-flood-simulation.bin';
      link.click();
      URL.revokeObjectURL(url);
      
      alert('Binary file generated and downloaded!');
    }
  </script>
</body>
</html>
```

## 测试步骤

1. **生成二进制文件**
   ```bash
   # 使用Python
   python generate_test_binary.py
   
   # 或使用Node.js
   node generate_test_binary.js
   
   # 或在浏览器中打开HTML文件
   ```

2. **上传到系统**
   ```
   - 打开 Disaster Repository 页面
   - 点击 Event Upload
   - 选择生成的 .bin 文件
   ```

3. **验证上传**
   ```
   - 检查是否创建了新事件
   - Event ID 应该是 BIN-{timestamp}
   - 查看浏览器控制台日志
   ```

4. **解析数据**
   ```javascript
   // 在浏览器控制台中
   const event = selectedEvent;
   if (event.dataFormat === 'BIN') {
     const data = parseFloodSimulation(event.binaryData.buffer);
     console.table(data);
   }
   ```

---

**注意**: 由于实际的.bin文件是二进制数据，无法直接在文本编辑器中查看。需要使用上述脚本生成测试文件。
