import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 数据存储路径
const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const HISTORICAL_FILE = path.join(DATA_DIR, 'historical-events.json');
const STOCHASTIC_FILE = path.join(DATA_DIR, 'stochastic-events-index.json');

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// GET - 获取所有事件
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 'historical' | 'stochastic' | null (both)

    await ensureDataDir();

    const result: any = {};

    // 读取历史事件
    if (!category || category === 'historical') {
      try {
        const historicalData = await fs.readFile(HISTORICAL_FILE, 'utf-8');
        result.historical = JSON.parse(historicalData);
      } catch (error) {
        result.historical = [];
      }
    }

    // 读取随机事件
    if (!category || category === 'stochastic') {
      try {
        const stochasticData = await fs.readFile(STOCHASTIC_FILE, 'utf-8');
        result.stochastic = JSON.parse(stochasticData);
      } catch (error) {
        result.stochastic = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error reading events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read events' },
      { status: 500 }
    );
  }
}

// POST - 添加新事件
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, category } = body;

    if (!event || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing event or category' },
        { status: 400 }
      );
    }

    // 验证必需字段
    if (!event.id || !event.name || !event.type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (id, name, type)' },
        { status: 400 }
      );
    }

    await ensureDataDir();

    const filePath = category === 'historical' ? HISTORICAL_FILE : STOCHASTIC_FILE;

    // 读取现有数据
    let events = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      events = JSON.parse(data);
    } catch (error) {
      events = [];
    }

    // 检查是否已存在
    const existingIndex = events.findIndex((e: any) => e.id === event.id);
    
    if (existingIndex >= 0) {
      // 更新现有事件
      events[existingIndex] = event;
    } else {
      // 添加新事件
      events.push(event);
    }

    // 保存到文件
    await fs.writeFile(filePath, JSON.stringify(events, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: existingIndex >= 0 ? 'Event updated' : 'Event created',
      data: event,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save event' },
      { status: 500 }
    );
  }
}

// PUT - 更新事件
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, category } = body;

    if (!event || !category || !event.id) {
      return NextResponse.json(
        { success: false, error: 'Missing event, category, or event ID' },
        { status: 400 }
      );
    }

    await ensureDataDir();

    const filePath = category === 'historical' ? HISTORICAL_FILE : STOCHASTIC_FILE;

    // 读取现有数据
    let events = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      events = JSON.parse(data);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // 查找并更新事件
    const index = events.findIndex((e: any) => e.id === event.id);
    
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    events[index] = event;

    // 保存到文件
    await fs.writeFile(filePath, JSON.stringify(events, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Event updated',
      data: event,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// DELETE - 删除事件
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const category = searchParams.get('category');

    if (!id || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing id or category' },
        { status: 400 }
      );
    }

    await ensureDataDir();

    const filePath = category === 'historical' ? HISTORICAL_FILE : STOCHASTIC_FILE;

    // 读取现有数据
    let events = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      events = JSON.parse(data);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Events file not found' },
        { status: 404 }
      );
    }

    // 过滤掉要删除的事件
    const filteredEvents = events.filter((e: any) => e.id !== id);

    if (filteredEvents.length === events.length) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // 保存到文件
    await fs.writeFile(filePath, JSON.stringify(filteredEvents, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Event deleted',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
