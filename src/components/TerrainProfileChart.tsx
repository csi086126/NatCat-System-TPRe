"use client";

import React, { useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';

export interface ProfileSample {
  distance: number; // meters
  elevation: number | null;
}

interface Props {
  data: ProfileSample[];
  // 双向联动:外部传入当前高亮 index,内部通过 onHoverIndexChange 报告图表 hover
  hoverIndex?: number | null;
  onHoverIndexChange?: (idx: number | null) => void;
}

// 与 LineChart 的 margin/YAxis width 保持一致,用于把鼠标 X 坐标映射到数据 distance
const YAXIS_WIDTH = 56;
const RIGHT_MARGIN = 20;
const TOP_MARGIN = 10;
const BOTTOM_MARGIN = 5;

export default function TerrainProfileChart({ data, hoverIndex = null, onHoverIndexChange }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  // rAF 节流:鼠标快速划过图表时,一帧最多触发一次 setState
  const pendingIdxRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const hovered = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  // 把鼠标在容器内的 clientX 转换为样本 index:
  // - 跳过 YAxis 占据的 56px
  // - 跳过右侧 margin 20px
  // - 剩余区域按 data 的总距离等分映射
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onHoverIndexChange || !wrapperRef.current || data.length === 0) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 上下也留出 margin,避免点到 XAxis 标签区时误触发
    const outOfVerticalBounds = mouseY < TOP_MARGIN || mouseY > rect.height - BOTTOM_MARGIN;
    const drawableWidth = rect.width - YAXIS_WIDTH - RIGHT_MARGIN;
    const mouseXInDraw = mouseX - YAXIS_WIDTH;
    const outOfHorizontalBounds = drawableWidth <= 0 || mouseXInDraw < 0 || mouseXInDraw > drawableWidth;

    // 鼠标在 YAxis / margin 区 -> 立即清空(不等节流,避免残留)
    if (outOfVerticalBounds || outOfHorizontalBounds) {
      pendingIdxRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onHoverIndexChange(null);
      return;
    }

    const totalDist = data[data.length - 1].distance;
    if (totalDist <= 0) return;

    const ratio = Math.max(0, Math.min(1, mouseXInDraw / drawableWidth));
    const distanceAtMouse = ratio * totalDist;

    // 找最近的 sample
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < data.length; i++) {
      const d = Math.abs(data[i].distance - distanceAtMouse);
      if (d < bestDiff) {
        bestDiff = d;
        bestIdx = i;
      }
    }

    // rAF 节流:同帧多次 mousemove 只写 pending,最多一帧一次 setState
    pendingIdxRef.current = bestIdx;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const v = pendingIdxRef.current;
      if (v !== null) onHoverIndexChange(v);
    });
  };

  const handleMouseLeave = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingIdxRef.current = null;
    onHoverIndexChange?.(null);
  };

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ width: '100%', height: 170, position: 'relative' }}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart
          data={data}
          margin={{ top: TOP_MARGIN, right: RIGHT_MARGIN, left: 0, bottom: BOTTOM_MARGIN }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="distance"
            tickFormatter={(v) => `${(v / 1000).toFixed(2)} km`}
            label={{ value: 'Distance', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#6b7280' }}
            fontSize={10}
            stroke="#9ca3af"
          />
          <YAxis
            tickFormatter={(v) => `${v} m`}
            label={{ value: 'Elev (m)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#6b7280' }}
            fontSize={10}
            stroke="#9ca3af"
            width={YAXIS_WIDTH}
          />
          <Tooltip
            formatter={(v: number | string) => [`${Number(v).toFixed(1)} m`, 'Elevation']}
            labelFormatter={(v: number | string) =>
              `${((v as number) / 1000).toFixed(3)} km`
            }
            contentStyle={{ fontSize: 11, padding: '4px 8px' }}
            cursor={{ stroke: '#f59e0b', strokeDasharray: '3 3', strokeWidth: 1 }}
          />
          {/* 来自外部 (地图悬停) 的垂直参考线 + 高亮样本点 */}
          {hovered && hovered.elevation !== null && (
            <ReferenceLine
              x={hovered.distance}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          {hovered && hovered.elevation !== null && (
            <ReferenceDot
              x={hovered.distance}
              y={hovered.elevation}
              r={5}
              fill="#fbbf24"
              stroke="#b45309"
              strokeWidth={2}
              isFront
            />
          )}
          <Line
            type="monotone"
            dataKey="elevation"
            stroke="#10B981"
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}