import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 上传文件存储路径
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// 确保上传目录存在
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// POST - 上传文件（Shapefile, TIFF, Binary等）
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const eventId = formData.get('eventId') as string;
    const fileType = formData.get('fileType') as string; // 'shapefile' | 'tiff' | 'binary'

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    await ensureUploadDir();

    // 为该事件创建专门的目录
    const eventDir = path.join(UPLOAD_DIR, eventId);
    try {
      await fs.access(eventDir);
    } catch {
      await fs.mkdir(eventDir, { recursive: true });
    }

    // 保存所有文件
    const savedFiles: Array<{name: string, path: string, size: number}> = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(eventDir, file.name);
      
      await fs.writeFile(filePath, buffer);
      
      savedFiles.push({
        name: file.name,
        path: `/uploads/${eventId}/${file.name}`,
        size: buffer.length
      });
    }

    // Shapefile 特殊处理：验证必需文件
    if (fileType === 'shapefile') {
      const fileNames = savedFiles.map(f => f.name.toLowerCase());
      const hasShp = fileNames.some(name => name.endsWith('.shp'));
      const hasShx = fileNames.some(name => name.endsWith('.shx'));
      const hasDbf = fileNames.some(name => name.endsWith('.dbf'));

      if (!hasShp || !hasShx || !hasDbf) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Incomplete shapefile set. Required: .shp, .shx, .dbf',
            files: savedFiles
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `${savedFiles.length} file(s) uploaded successfully`,
      data: {
        eventId,
        fileType,
        files: savedFiles,
        uploadDir: `/uploads/${eventId}`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

// GET - 获取事件的上传文件列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const eventDir = path.join(UPLOAD_DIR, eventId);

    try {
      const files = await fs.readdir(eventDir);
      const fileDetails = await Promise.all(
        files.map(async (fileName) => {
          const filePath = path.join(eventDir, fileName);
          const stats = await fs.stat(filePath);
          return {
            name: fileName,
            path: `/uploads/${eventId}/${fileName}`,
            size: stats.size,
            modified: stats.mtime
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          eventId,
          files: fileDetails
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return NextResponse.json({
        success: true,
        data: {
          eventId,
          files: []
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error reading uploaded files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read uploaded files' },
      { status: 500 }
    );
  }
}
