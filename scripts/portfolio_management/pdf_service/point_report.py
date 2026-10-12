"""
单点洪涝风险评估 PDF 报告(后端生成,中文友好)。

翻译自 src/features/risk-map/utils/floodRiskPdf.ts(原 jsPDF 实现)。
核心差异:
- 中文地址真实显示,不再被 printableText hack 替换
- 输出 bytes,经由 OSS 上传
- 字体用思源黑体 SourceHanSC
"""
import io
from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .fonts import ensure_fonts_registered

# ==================== 颜色 / 布局常量 ====================
SLATE = colors.HexColor('#334155')
LIGHT_SLATE = colors.HexColor('#F1F5F9')
BLUE = colors.HexColor('#2563EB')
VIOLET = colors.HexColor('#7C3AED')
TEAL = colors.HexColor('#0F766E')

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

FLOOD_DEPTH_LEGEND = [
    ('#9B2226', '> 3.0 m'),
    ('#D62828', '2.0 - 3.0 m'),
    ('#E55934', '1.5 - 2.0 m'),
    ('#F9A03F', '1.0 - 1.5 m'),
    ('#FDE74C', '0.5 - 1.0 m'),
    ('#5BC0EB', '0.2 - 0.5 m'),
]


def fmt_number(value, digits=3, suffix='', allow_none=True):
    """统一格式化数字/None/'No data'。"""
    if value is None or (allow_none is False and value is None):
        return 'No data'
    if isinstance(value, str):
        return value
    try:
        return f'{float(value):.{digits}f}{suffix}'
    except (TypeError, ValueError):
        return 'No data'


def family_label(family: str) -> str:
    return 'Non-typhoon rainfall flood' if family == 'non-typhoon-rainfall' else 'Typhoon compound flood'


# ==================== 章节渲染 ====================
def _draw_header(c: canvas.Canvas, title: str, subtitle: str = '') -> float:
    """顶部 banner + 副标题。返回下一段起始 Y。
    ReportLab 坐标系 (0,0) 在左下角,所以顶部 banner 在 y = PAGE_H - 24mm 处。
    """
    banner_y = PAGE_H - 24 * mm
    c.setFillColor(TEAL)
    c.rect(0, banner_y, PAGE_W, 24 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('SourceHanSC-Bold', 16)
    c.drawString(MARGIN, banner_y + 16 * mm, title)
    if subtitle:
        c.setFont('SourceHanSC-Regular', 8)
        c.drawString(MARGIN, banner_y + 9 * mm, subtitle)
    c.setFillColor(SLATE)
    return banner_y - 6 * mm  # banner 下面 6mm


def _section_title(c: canvas.Canvas, y: float, title: str) -> float:
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 11)
    c.drawString(MARGIN, y, title)
    c.setStrokeColor(colors.HexColor('#99F6E4'))
    c.setLineWidth(0.5)
    c.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2)
    return y - 8 * mm


def _draw_cover(c: canvas.Canvas, asset: dict, flood: dict) -> float:
    """封面:地点 / 坐标 / 评估模式 / 时间戳"""
    y = PAGE_H - 45 * mm
    address = (asset.get('address') or '未提供地址').strip()
    y -= 8 * mm
    c.setFont('SourceHanSC-Bold', 16)
    c.setFillColor(SLATE)
    # 中文长地址自动换行
    from reportlab.pdfbase.pdfmetrics import stringWidth
    if stringWidth(address, 'SourceHanSC-Bold', 16) > CONTENT_W:
        # 拆 2 行
        parts = [address[i:i + 30] for i in range(0, len(address), 30)][:2]
        for p in parts:
            c.drawString(MARGIN, y, p)
            y -= 7 * mm
    else:
        c.drawString(MARGIN, y, address)
        y -= 10 * mm

    c.setFont('SourceHanSC-Regular', 10)
    lat = asset.get('latitude')
    lng = asset.get('longitude')
    c.drawString(MARGIN, y, f'经纬度: {fmt_number(lat, 6, "° N")}, {fmt_number(lng, 6, "° E")}')
    y -= 6 * mm

    mode = flood.get('assessmentMode', '')
    threshold = flood.get('thresholdMeters', 0)
    sampling = flood.get('samplingMethod', '')
    radius = flood.get('samplingRadiusMeters', 0)
    c.drawString(MARGIN, y, f'评估模式: {mode or "—"}    阈值: {fmt_number(threshold, 2, " m")}')
    y -= 6 * mm
    c.drawString(MARGIN, y, f'采样方法: {sampling or "—"}    半径: {fmt_number(radius, 0, " m")}')
    y -= 10 * mm

    # 生成时间戳 + 用户邮箱(右下角)
    c.setFont('SourceHanSC-Regular', 8)
    c.setFillColor(colors.HexColor('#475569'))
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    c.drawRightString(PAGE_W - MARGIN, 12 * mm, f'生成时间: {timestamp}    NatCat Platform')
    return y


def _draw_classification(c: canvas.Canvas, y: float, flood: dict) -> float:
    """风险分级大字号展示"""
    classification = flood.get('classification') or '—'
    c.setFillColor(colors.HexColor('#F1F5F9'))
    c.rect(MARGIN, y - 14 * mm, CONTENT_W, 14 * mm, fill=1, stroke=0)
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Regular', 9)
    c.drawString(MARGIN + 4 * mm, y - 5 * mm, '风险分级 (Risk Classification)')
    c.setFont('SourceHanSC-Bold', 14)
    c.drawString(MARGIN + 4 * mm, y - 12 * mm, classification)
    return y - 18 * mm


def _draw_driver_metrics(c: canvas.Canvas, y: float, assessments: list) -> float:
    """两情景指标对比表(annual probability / excess depth / conditional mean)"""
    if len(assessments) < 2:
        return y
    rainfall = assessments[0].get('annualMetrics') or {}
    compound = assessments[1].get('annualMetrics') or {}
    header_h = 9 * mm
    row_h = 8 * mm
    label_w = 78 * mm
    value_w = (CONTENT_W - label_w) / 2

    # Header
    c.setFillColor(LIGHT_SLATE)
    c.rect(MARGIN, y - header_h, label_w, header_h, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.rect(MARGIN + label_w, y - header_h, value_w, header_h, fill=1, stroke=0)
    c.setFillColor(VIOLET)
    c.rect(MARGIN + label_w + value_w, y - header_h, value_w, header_h, fill=1, stroke=0)
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 8)
    c.drawString(MARGIN + 3 * mm, y - 6 * mm, '年事件目录指标')
    c.setFillColor(colors.white)
    c.drawCentredString(MARGIN + label_w + value_w / 2, y - 6 * mm, '非台风降雨')
    c.drawCentredString(MARGIN + label_w + value_w * 1.5, y - 6 * mm, '台风复合')
    y -= header_h

    rows = [
        ('年概率 > 0.15 m', fmt_number(rainfall.get('annualFloodProbability', 0) * 100, 2, '%'), fmt_number(compound.get('annualFloodProbability', 0) * 100, 2, '%')),
        ('年均超额深度', fmt_number(rainfall.get('annualizedExcessDepth'), 4, ' m/yr'), fmt_number(compound.get('annualizedExcessDepth'), 4, ' m/yr')),
        ('条件平均深度', fmt_number(rainfall.get('conditionalMeanFloodDepth'), 3, ' m'), fmt_number(compound.get('conditionalMeanFloodDepth'), 3, ' m')),
    ]
    for idx, (label, rain_v, tc_v) in enumerate(rows):
        row_y = y - row_h * (idx + 1)
        if idx % 2 == 1:
            c.setFillColor(colors.HexColor('#F8FAFC'))
            c.rect(MARGIN, row_y, CONTENT_W, row_h, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor('#E2E8F0'))
        c.rect(MARGIN, row_y, CONTENT_W, row_h, fill=0, stroke=1)
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 8)
        c.drawString(MARGIN + 3 * mm, row_y + 3 * mm, label)
        c.setFont('SourceHanSC-Bold', 8)
        c.drawCentredString(MARGIN + label_w + value_w / 2, row_y + 3 * mm, rain_v)
        c.drawCentredString(MARGIN + label_w + value_w * 1.5, row_y + 3 * mm, tc_v)

    y -= row_h * len(rows)
    return y - 4 * mm


def _draw_historical_events(c: canvas.Canvas, y: float, historical: dict) -> float:
    """历史洪涝事件表"""
    if not historical:
        return y
    events = historical.get('events') or []
    if not events:
        return y
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 9)
    c.drawString(MARGIN, y, f'历史洪涝事件 (前 {min(8, len(events))} 条 / 共 {len(events)} 条)')
    y -= 6 * mm

    # 表头
    header = [('事件', 60 * mm), ('年份', 18 * mm), ('类型', 30 * mm), ('本地最大水深', 50 * mm)]
    c.setFillColor(LIGHT_SLATE)
    c.rect(MARGIN, y - 6 * mm, CONTENT_W, 6 * mm, fill=1, stroke=0)
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 7)
    x = MARGIN + 2 * mm
    for label, width in header:
        c.drawString(x, y - 4 * mm, label)
        x += width
    y -= 6 * mm

    for idx, event in enumerate(events[:8]):
        row_h = 6 * mm
        if idx % 2 == 1:
            c.setFillColor(colors.HexColor('#F8FAFC'))
            c.rect(MARGIN, y - row_h, CONTENT_W, row_h, fill=1, stroke=0)
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 7)
        display = str(event.get('display', '—'))[:30]
        x = MARGIN + 2 * mm
        c.drawString(x, y - 4 * mm, display)
        x += 60 * mm
        year = event.get('year')
        c.drawString(x, y - 4 * mm, '—' if year is None else str(year))
        x += 18 * mm
        family = event.get('family', '')
        c.drawString(x, y - 4 * mm, '降雨' if family == 'rainfall' else '台风复合')
        x += 30 * mm
        depth = event.get('depth')
        c.drawRightString(MARGIN + CONTENT_W - 2 * mm, y - 4 * mm, fmt_number(depth, 2, ' m'))
        y -= row_h

    return y - 4 * mm


def _draw_legend(c: canvas.Canvas, y: float) -> float:
    """洪水深度图例(底部)"""
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 8)
    c.drawString(MARGIN, y, '洪水深度图例')
    y -= 5 * mm
    item_w = CONTENT_W / len(FLOOD_DEPTH_LEGEND)
    for idx, (hex_color, label) in enumerate(FLOOD_DEPTH_LEGEND):
        c.setFillColor(colors.HexColor(hex_color))
        c.rect(MARGIN + idx * item_w, y - 2 * mm, 4 * mm, 4 * mm, fill=1, stroke=0)
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 7)
        c.drawString(MARGIN + idx * item_w + 5 * mm, y, label)
    return y - 8 * mm


def _draw_footer(c: canvas.Canvas) -> None:
    """页脚水印"""
    c.setFillColor(colors.HexColor('#94A3B8'))
    c.setFont('SourceHanSC-Regular', 7)
    c.drawCentredString(
        PAGE_W / 2,
        8 * mm,
        'NatCat Platform — 此报告基于 10,000 年随机事件目录生成,仅供风险评估参考,不构成独立验证的理赔依据。',
    )


def _draw_terrain_profile(c: canvas.Canvas, y: float, profile: dict) -> float:
    """Terrain Profile 章节 — 简表 + 关键高程统计。
    BFF 透传的 profile 结构:
        {points: [{lat, lng}, ...], samples: [{distance, elevation}, ...]}
    samples 可能 elevation 为 null(DEM 缺失), 这种不参与统计但保留距离。
    """
    samples = profile.get('samples') or []
    if not samples:
        return y

    # 仅取 elevation 有效的样本做高程统计
    valid = [s for s in samples if isinstance(s, dict) and s.get('elevation') is not None]
    if valid:
        elevations = [float(s['elevation']) for s in valid]
        min_e = min(elevations)
        max_e = max(elevations)
        avg_e = sum(elevations) / len(elevations)
        max_d = max((float(s.get('distance', 0)) for s in samples), default=0)
    else:
        min_e = max_e = avg_e = None
        max_d = max((float(s.get('distance', 0)) for s in samples), default=0)

    # 标题
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 9)
    c.drawString(MARGIN, y, f'地形剖面摘要 (采样点 {len(samples)} 个 / 有效 {len(valid)} 个)')
    y -= 6 * mm

    # 关键统计 (单行 4 列)
    stat_w = CONTENT_W / 4
    stats = [
        ('总长度', fmt_number(max_d, 0, ' m') if max_d else '—'),
        ('最低高程', fmt_number(min_e, 2, ' m') if min_e is not None else '—'),
        ('最高高程', fmt_number(max_e, 2, ' m') if max_e is not None else '—'),
        ('平均高程', fmt_number(avg_e, 2, ' m') if avg_e is not None else '—'),
    ]
    for idx, (label, val) in enumerate(stats):
        col_x = MARGIN + idx * stat_w
        c.setFillColor(LIGHT_SLATE)
        c.rect(col_x, y - 12 * mm, stat_w, 12 * mm, fill=1, stroke=0)
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 7)
        c.drawString(col_x + 3 * mm, y - 4 * mm, label)
        c.setFont('SourceHanSC-Bold', 11)
        c.drawString(col_x + 3 * mm, y - 10 * mm, val)
    y -= 14 * mm

    # 明细表 — 最多 12 行 (太少无意义, 太多会占太多页)
    detail_count = min(12, len(samples))
    if detail_count == 0:
        return y
    header = [('序号', 12 * mm), ('距离 (m)', 30 * mm), ('高程 (m)', 30 * mm)]
    c.setFillColor(LIGHT_SLATE)
    c.rect(MARGIN, y - 6 * mm, CONTENT_W, 6 * mm, fill=1, stroke=0)
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 7)
    x = MARGIN + 2 * mm
    for label, width in header:
        c.drawString(x, y - 4 * mm, label)
        x += width
    y -= 6 * mm

    # 等距采样 detail_count 个点 (首尾必含, 中间按等距索引)
    if len(samples) > detail_count:
        step = (len(samples) - 1) / (detail_count - 1)
        indices = [int(round(i * step)) for i in range(detail_count)]
    else:
        indices = list(range(len(samples)))

    for idx, s_idx in enumerate(indices):
        s = samples[s_idx]
        if not isinstance(s, dict):
            continue
        row_h = 6 * mm
        if idx % 2 == 1:
            c.setFillColor(colors.HexColor('#F8FAFC'))
            c.rect(MARGIN, y - row_h, CONTENT_W, row_h, fill=1, stroke=0)
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 7)
        c.drawString(MARGIN + 2 * mm, y - 4 * mm, str(idx + 1))
        c.drawString(MARGIN + 14 * mm, y - 4 * mm, fmt_number(s.get('distance'), 1, ''))
        c.drawString(MARGIN + 44 * mm, y - 4 * mm, fmt_number(s.get('elevation'), 2, ''))
        y -= row_h

    if len(samples) > detail_count:
        c.setFillColor(colors.HexColor('#94A3B8'))
        c.setFont('SourceHanSC-Regular', 7)
        c.drawString(MARGIN, y - 3 * mm, f'… 等距采样展示 {detail_count}/{len(samples)} 个点')
        y -= 5 * mm
    return y - 2 * mm


# ==================== 入口函数 ====================
def render_point_pdf(asset: dict, flood: dict, profile: dict | None = None) -> bytes:
    """
    生成单点洪涝风险评估 PDF,返回二进制。
    中文地址真实显示(思源黑体)。
    `profile` 可选 — 存在时在历史洪涝之后追加「地形剖面」章节。
    """
    ensure_fonts_registered()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle('Flood Risk Assessment Report')
    c.setAuthor('NatCat Platform')

    y = _draw_header(c, '单点洪涝风险评估报告', 'Flood Risk Assessment — Single Location')
    y = _draw_cover(c, asset, flood)
    y = _section_title(c, y, '风险评估摘要 / Risk Classification')
    y = _draw_classification(c, y, flood)

    driver_assessments = flood.get('driverAssessments') or []
    if driver_assessments and len(driver_assessments) >= 2:
        y = _section_title(c, y, '两情景指标对比 / Driver Assessment')
        y = _draw_driver_metrics(c, y, driver_assessments)

    historical = flood.get('historicalFlood')
    if historical:
        y = _section_title(c, y, '历史洪涝事件 / Historical Inundation Events')
        y = _draw_historical_events(c, y, historical)

    # Terrain Profile — 可选, 仅在 BFF 透传了 profile 时渲染
    if profile and isinstance(profile, dict):
        y = _section_title(c, y, '地形剖面 / Terrain Profile')
        y = _draw_terrain_profile(c, y, profile)

    y = _section_title(c, y, '洪水深度图例 / Depth Legend')
    _draw_legend(c, y)

    _draw_footer(c)
    c.showPage()
    c.save()
    return buf.getvalue()