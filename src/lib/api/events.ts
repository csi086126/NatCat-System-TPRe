// API 工具函数 - 灾害事件数据管理

export interface DisasterEvent {
  id: string;
  name: string;
  type: string;
  category?: 'historical' | 'stochastic';
  date?: string;
  year?: number;
  impactArea?: {
    level1?: string;
    level2?: string;
    level3?: string;
  };
  severity?: string;
  coordinates?: [number, number];
  [key: string]: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

// ==================== 事件 CRUD 操作 ====================

/**
 * 获取所有事件
 * @param category - 'historical' | 'stochastic' | undefined (获取全部)
 */
export async function getEvents(category?: 'historical' | 'stochastic'): Promise<ApiResponse> {
  try {
    const url = category 
      ? `/api/events?category=${category}`
      : '/api/events';
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('Error fetching events:', error);
    return {
      success: false,
      error: 'Failed to fetch events'
    };
  }
}

/**
 * 创建新事件
 */
export async function createEvent(
  event: DisasterEvent, 
  category: 'historical' | 'stochastic'
): Promise<ApiResponse> {
  try {
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, category }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating event:', error);
    return {
      success: false,
      error: 'Failed to create event'
    };
  }
}

/**
 * 更新事件
 */
export async function updateEvent(
  event: DisasterEvent, 
  category: 'historical' | 'stochastic'
): Promise<ApiResponse> {
  try {
    const response = await fetch('/api/events', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, category }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating event:', error);
    return {
      success: false,
      error: 'Failed to update event'
    };
  }
}

/**
 * 删除事件
 */
export async function deleteEvent(
  id: string, 
  category: 'historical' | 'stochastic'
): Promise<ApiResponse> {
  try {
    const response = await fetch(`/api/events?id=${id}&category=${category}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting event:', error);
    return {
      success: false,
      error: 'Failed to delete event'
    };
  }
}

// ==================== 文件上传操作 ====================

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  modified?: Date;
}

/**
 * 上传文件（支持 Shapefile, TIFF, Binary 等）
 */
export async function uploadEventFiles(
  files: File[],
  eventId: string,
  fileType: 'shapefile' | 'tiff' | 'binary' | 'geojson'
): Promise<ApiResponse<{ files: UploadedFile[] }>> {
  try {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });
    
    formData.append('eventId', eventId);
    formData.append('fileType', fileType);
    
    const response = await fetch('/api/events/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading files:', error);
    return {
      success: false,
      error: 'Failed to upload files'
    };
  }
}

/**
 * 获取事件的上传文件列表
 */
export async function getEventFiles(eventId: string): Promise<ApiResponse<{ files: UploadedFile[] }>> {
  try {
    const response = await fetch(`/api/events/upload?eventId=${eventId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching event files:', error);
    return {
      success: false,
      error: 'Failed to fetch event files'
    };
  }
}

// ==================== 批量操作 ====================

/**
 * 批量导入事件
 */
export async function batchImportEvents(
  events: DisasterEvent[],
  category: 'historical' | 'stochastic'
): Promise<ApiResponse> {
  try {
    const results = await Promise.all(
      events.map(event => createEvent(event, category))
    );
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return {
      success: failCount === 0,
      message: `Imported ${successCount} events successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
      data: { successCount, failCount, results }
    };
  } catch (error) {
    console.error('Error batch importing events:', error);
    return {
      success: false,
      error: 'Failed to batch import events'
    };
  }
}

/**
 * 从 JSON 文件创建事件并上传文件
 */
export async function createEventWithFiles(
  event: DisasterEvent,
  category: 'historical' | 'stochastic',
  files?: File[],
  fileType?: 'shapefile' | 'tiff' | 'binary' | 'geojson'
): Promise<ApiResponse> {
  try {
    // 1. 先创建事件
    const createResult = await createEvent(event, category);
    
    if (!createResult.success) {
      return createResult;
    }
    
    // 2. 如果有文件，上传文件
    if (files && files.length > 0 && fileType) {
      const uploadResult = await uploadEventFiles(files, event.id, fileType);
      
      if (!uploadResult.success) {
        return {
          success: true,
          message: 'Event created but file upload failed',
          data: { event: createResult.data, uploadError: uploadResult.error }
        };
      }
      
      return {
        success: true,
        message: 'Event and files uploaded successfully',
        data: {
          event: createResult.data,
          files: uploadResult.data?.files
        }
      };
    }
    
    return createResult;
  } catch (error) {
    console.error('Error creating event with files:', error);
    return {
      success: false,
      error: 'Failed to create event with files'
    };
  }
}
