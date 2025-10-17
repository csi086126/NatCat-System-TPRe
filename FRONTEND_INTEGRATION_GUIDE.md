# 前端集成后端 API - 修改指南

本文档说明如何修改 `disasterinfo/page.tsx` 以集成后端 API。

## 步骤1: 导入 API 工具函数

在文件顶部添加导入：

```typescript
// 在现有导入后添加
import { 
  getEvents, 
  createEvent, 
  updateEvent, 
  deleteEvent,
  uploadEventFiles,
  createEventWithFiles,
  type DisasterEvent
} from '@/lib/api/events';
```

## 步骤2: 添加加载状态

在组件状态部分添加：

```typescript
// 在现有 useState 后添加
const [isLoading, setIsLoading] = useState(true);
const [apiError, setApiError] = useState<string | null>(null);
```

## 步骤3: 页面加载时从后端获取数据

添加 useEffect 来加载数据：

```typescript
// 在组件内添加（在其他 useEffect 之前）
useEffect(() => {
  const loadEventsFromBackend = async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      
      const result = await getEvents();
      
      if (result.success && result.data) {
        // 更新历史事件
        if (result.data.historical && result.data.historical.length > 0) {
          setHistoricalEvents(result.data.historical);
        }
        
        // 更新随机事件
        if (result.data.stochastic && result.data.stochastic.length > 0) {
          setStochasticEvents(result.data.stochastic);
        }
        
        console.log('Events loaded from backend:', {
          historical: result.data.historical?.length || 0,
          stochastic: result.data.stochastic?.length || 0
        });
      } else {
        console.warn('Failed to load events from backend, using mock data');
        setApiError('Failed to load events from backend');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setApiError('Error loading events from backend');
    } finally {
      setIsLoading(false);
    }
  };

  loadEventsFromBackend();
}, []); // 只在组件挂载时执行一次
```

## 步骤4: 修改 handleJSONUpload 函数

将现有的 `handleJSONUpload` 函数修改为：

```typescript
const handleJSONUpload = (file: File) => {
  const reader = new FileReader();
  
  reader.onload = async (event: ProgressEvent<FileReader>) => {
    try {
      const jsonText = event.target?.result as string;
      const uploadedEvent = JSON.parse(jsonText);

      // 验证必需字段
      if (!uploadedEvent.id || !uploadedEvent.name || !uploadedEvent.type) {
        alert('Invalid event file: Missing required fields (id, name, type).');
        return;
      }

      // 确定事件类别
      const category = uploadedEvent.category || 'historical';

      // ========== 新增：保存到后端 ==========
      const result = await createEvent(uploadedEvent, category);
      
      if (!result.success) {
        alert(`Failed to save event to backend: ${result.error}`);
        return;
      }
      // =====================================

      // 更新前端状态
      if (category === 'historical') {
        setHistoricalEvents(prev => {
          const existing = prev.find(e => e.id === uploadedEvent.id);
          if (existing) {
            return prev.map(e => e.id === uploadedEvent.id ? uploadedEvent : e);
          }
          return [...prev, uploadedEvent];
        });
      } else {
        setStochasticEvents(prev => {
          const existing = prev.find(e => e.id === uploadedEvent.id);
          if (existing) {
            return prev.map(e => e.id === uploadedEvent.id ? uploadedEvent : e);
          }
          return [...prev, uploadedEvent];
        });
      }

      // 自动选中上传的事件
      setActiveEventCategory(category);
      setSelectedEvent(uploadedEvent);

      alert(
        `Event "${uploadedEvent.name}" uploaded and saved successfully!\n\n` +
        `Format: JSON\n` +
        `Category: ${category}\n` +
        `Event ID: ${uploadedEvent.id}\n` +
        `Status: Saved to backend ✓`
      );

    } catch (error) {
      console.error('Error parsing JSON:', error);
      alert('Failed to parse JSON file. Please ensure it is a valid event metadata file.');
    }
  };

  reader.readAsText(file);
};
```

## 步骤5: 修改 handleShapefileUpload 函数

将现有的 `handleShapefileUpload` 函数修改为：

```typescript
const handleShapefileUpload = async (files: File[]) => {
  // 查找必需的文件
  const shpFile = files.find(f => f.name.toLowerCase().endsWith('.shp'));
  const shxFile = files.find(f => f.name.toLowerCase().endsWith('.shx'));
  const dbfFile = files.find(f => f.name.toLowerCase().endsWith('.dbf'));
  const prjFile = files.find(f => f.name.toLowerCase().endsWith('.prj'));

  if (!shpFile || !shxFile || !dbfFile) {
    alert(
      'Incomplete shapefile set.\n\n' +
      'Required files:\n' +
      `- .shp: ${shpFile ? '✓' : '✗'}\n` +
      `- .shx: ${shxFile ? '✓' : '✗'}\n` +
      `- .dbf: ${dbfFile ? '✓' : '✗'}\n` +
      `- .prj: ${prjFile ? '✓' : '(optional)'}\n\n` +
      'Please select all required files together.'
    );
    return;
  }

  // ========== 新增：询问事件ID并上传到后端 ==========
  const eventId = prompt(
    'Enter Event ID for this shapefile:\n\n' +
    'Format: Type-Year-Number\n' +
    'Example: Typhoon-2024-001'
  );
  
  if (!eventId) {
    alert('Event ID is required to upload shapefile.');
    return;
  }

  try {
    // 上传文件到后端
    const result = await uploadEventFiles(files, eventId, 'shapefile');
    
    if (!result.success) {
      alert(`Failed to upload shapefile: ${result.error}`);
      return;
    }

    // 显示成功信息
    const fileList = result.data?.files?.map(f => 
      `- ${f.name} (${(f.size / 1024).toFixed(2)} KB)`
    ).join('\n') || '';

    alert(
      'Shapefile uploaded successfully!\n\n' +
      `Event ID: ${eventId}\n` +
      `Files uploaded:\n${fileList}\n\n` +
      `Storage location: /uploads/${eventId}/\n\n` +
      'Note: To fully use the shapefile data, please also upload a JSON metadata file ' +
      'for this event with the same Event ID.'
    );

  } catch (error) {
    console.error('Error uploading shapefile:', error);
    alert('Failed to upload shapefile. Please try again.');
  }
  // =====================================================
};
```

## 步骤6: 添加删除事件功能（可选）

如果需要删除功能，可以添加：

```typescript
const handleDeleteEvent = async (eventId: string, category: 'historical' | 'stochastic') => {
  const confirmDelete = confirm(
    `Are you sure you want to delete event "${eventId}"?\n\n` +
    'This will remove the event from backend storage.'
  );
  
  if (!confirmDelete) return;

  try {
    const result = await deleteEvent(eventId, category);
    
    if (!result.success) {
      alert(`Failed to delete event: ${result.error}`);
      return;
    }

    // 更新前端状态
    if (category === 'historical') {
      setHistoricalEvents(prev => prev.filter(e => e.id !== eventId));
    } else {
      setStochasticEvents(prev => prev.filter(e => e.id !== eventId));
    }

    // 如果删除的是当前选中的事件，清除选择
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(null);
    }

    alert('Event deleted successfully!');

  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete event. Please try again.');
  }
};
```

## 步骤7: 添加加载指示器到 UI

在事件列表上方添加加载状态提示：

```typescript
{/* 在 Event List 前添加 */}
{isLoading && (
  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-sm text-blue-700">Loading events from backend...</p>
  </div>
)}

{apiError && (
  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p className="text-sm text-yellow-700">
      ⚠️ {apiError}
      <br />
      Using local mock data instead.
    </p>
  </div>
)}
```

## 步骤8: 修改 TIFF 和 Binary 上传函数（可选）

如果需要保存 TIFF 和 Binary 文件到后端：

```typescript
const handleTIFFUpload = async (file: File) => {
  const eventId = prompt('Enter Event ID for this TIFF file:');
  if (!eventId) return;

  try {
    const result = await uploadEventFiles([file], eventId, 'tiff');
    
    if (result.success) {
      alert(`TIFF file uploaded successfully!\nSaved to: /uploads/${eventId}/${file.name}`);
    } else {
      alert(`Failed to upload TIFF: ${result.error}`);
    }
  } catch (error) {
    console.error('Error uploading TIFF:', error);
    alert('Failed to upload TIFF file.');
  }
};

const handleBinaryUpload = async (file: File) => {
  const eventId = prompt('Enter Event ID for this binary file:');
  if (!eventId) return;

  try {
    const result = await uploadEventFiles([file], eventId, 'binary');
    
    if (result.success) {
      alert(`Binary file uploaded successfully!\nSaved to: /uploads/${eventId}/${file.name}`);
    } else {
      alert(`Failed to upload binary file: ${result.error}`);
    }
  } catch (error) {
    console.error('Error uploading binary file:', error);
    alert('Failed to upload binary file.');
  }
};
```

## 完整的修改摘要

### 需要修改的函数：
1. ✅ 添加 `useEffect` 来加载后端数据
2. ✅ 修改 `handleJSONUpload` - 保存到后端
3. ✅ 修改 `handleShapefileUpload` - 上传文件到后端
4. ✅ 可选：修改 `handleTIFFUpload` 和 `handleBinaryUpload`
5. ✅ 可选：添加 `handleDeleteEvent` 功能

### 需要添加的状态：
```typescript
const [isLoading, setIsLoading] = useState(true);
const [apiError, setApiError] = useState<string | null>(null);
```

### 需要添加的导入：
```typescript
import { 
  getEvents, 
  createEvent, 
  uploadEventFiles,
  type DisasterEvent
} from '@/lib/api/events';
```

## 测试步骤

1. **启动开发服务器**：
   ```bash
   npm run dev
   ```

2. **测试数据加载**：
   - 打开页面，检查控制台是否显示 "Events loaded from backend"
   - 检查是否显示加载指示器

3. **测试 JSON 上传**：
   - 上传一个 JSON 事件文件
   - 检查是否显示 "Saved to backend ✓"
   - 刷新页面，检查事件是否仍然存在

4. **测试 Shapefile 上传**：
   - 选择 .shp, .shx, .dbf 文件
   - 输入事件 ID
   - 检查 `public/uploads/{eventId}/` 目录是否创建了文件

5. **检查数据持久化**：
   - 查看 `public/data/historical-events.json`
   - 查看 `public/data/stochastic-events-index.json`
   - 确认上传的事件已保存

## 故障排查

### 问题：上传成功但刷新后数据消失
- 检查 `public/data/` 目录权限
- 检查浏览器控制台错误信息
- 确认 API 返回 `success: true`

### 问题：API 返回 404
- 确认 Next.js 版本 >= 13
- 确认 API 文件路径正确
- 重启开发服务器

### 问题：文件上传失败
- 检查文件大小（Next.js 默认限制 4MB）
- 检查 `public/uploads/` 目录权限
- 查看服务器控制台错误日志

## 下一步优化

1. 添加上传进度条
2. 实现批量导入功能
3. 添加数据验证（Zod）
4. 实现事件编辑功能
5. 添加数据导出功能
6. 实现搜索和排序
