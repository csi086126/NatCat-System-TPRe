"""
区域洪涝风险评估 PDF 报告(后端生成,中文友好)。

翻译自 src/features/risk-map/utils/areaFloodRiskPdf.ts(原 jsPDF 实现)。
"""
import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .fonts import ensure_fonts_registered

# ==================== 常量 ====================
SLATE = colors.HexColor('#334155')
LIGHT_SLATE = colors.HexColor('#F1F5F9')
BLUE = colors.HexColor('#2563EB')
VIOLET = colors.HexColor('#7C3AED')
TEAL = colors.HexColor('#0F766E')
BORDER = colors.HexColor('#E2E8F0')
ALT_ROW = colors.HexColor('#F8FAFC')

PAGE_W, PAGE_H = A4
MARGIN = 15 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

FLOOD_LEGEND = [
    ('#9B2226', '> 3.0 m'),
    ('#D62828', '2.0 - 3.0 m'),
    ('#E55934', '1.5 - 2.0 m'),
    ('#F9A03F', '1.0 - 1.5 m'),
    ('#FDE74C', '0.5 - 1.0 m'),
    ('#5BC0EB', '0.2 - 0.5 m'),
]


def fmt(value, digits=3, suffix=''):
    if value is None:
        return 'No data'
    try:
        return f'{float(value):.{digits}f}{suffix}'
    except (TypeError, ValueError):
        return 'No data'


def fmt_pct(value, digits=2):
    if value is None:
        return 'No data'
    try:
        return f'{float(value) * 100:.{digits}f}%'
    except (TypeError, ValueError):
        return 'No data'


# ==================== 章节 ====================
def _draw_header(c: canvas.Canvas, title: str, subtitle: str) -> float:
    """ReportLab 坐标系 (0,0) 在左下角;banner 在 y = PAGE_H - 24mm。"""
    banner_y = PAGE_H - 24 * mm
    c.setFillColor(TEAL)
    c.rect(0, banner_y, PAGE_W, 24 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('SourceHanSC-Bold', 16)
    c.drawString(MARGIN, banner_y + 16 * mm, title)
    c.setFont('SourceHanSC-Regular', 8)
    c.drawString(MARGIN, banner_y + 9 * mm, subtitle)
    c.setFillColor(SLATE)
    return banner_y - 6 * mm


def _draw_section(c: canvas.Canvas, y: float, title: str) -> float:
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 11)
    c.drawString(MARGIN, y, title)
    c.setStrokeColor(colors.HexColor('#99F6E4'))
    c.setLineWidth(0.5)
    c.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2)
    return y - 8 * mm


def _draw_cover(c: canvas.Canvas, result: dict) -> float:
    y = PAGE_H - 35 * mm
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 14)
    title = result.get('title') or result.get('label') or '区域洪涝风险评估'
    c.drawString(MARGIN, y, str(title)[:40])
    y -= 8 * mm

    c.setFont('SourceHanSC-Regular', 9)
    bounds = result.get('bounds') or {}
    if bounds:
        c.drawString(
            MARGIN,
            y,
            f'范围: N {fmt(bounds.get("north"), 4)} / S {fmt(bounds.get("south"), 4)} '
            f'/ E {fmt(bounds.get("east"), 4)} / W {fmt(bounds.get("west"), 4)}',
        )
        y -= 6 * mm

    geom_type = (result.get('geometry') or {}).get('type') or '—'
    c.drawString(MARGIN, y, f'几何类型: {geom_type}    顶点数: {result.get("vertexCount", "—")}')
    y -= 6 * mm

    c.drawString(
        MARGIN,
        y,
        f'触发事件数: {result.get("eventCount", "—")}    路径数: {result.get("pathCount", "—")}',
    )
    y -= 10 * mm

    c.setFont('SourceHanSC-Regular', 8)
    c.setFillColor(colors.HexColor('#475569'))
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    c.drawRightString(PAGE_W - MARGIN, 12 * mm, f'生成时间: {timestamp}    NatCat Platform')
    return y


def _draw_key_value_grid(c: canvas.Canvas, y: float, entries: list) -> float:
    """2 列键值网格。entries: [(label, value), ...]"""
    gap = 4 * mm
    width = (CONTENT_W - gap) / 2
    cell_h = 14 * mm
    for idx, (label, display) in enumerate(entries):
        col = idx % 2
        row = idx // 2
        x = MARGIN + col * (width + gap)
        row_y = y - row * cell_h
        c.setFillColor(LIGHT_SLATE)
        c.setStrokeColor(BORDER)
        c.rect(x, row_y - cell_h, width, cell_h, fill=1, stroke=1)
        c.setFillColor(colors.HexColor('#64748B'))
        c.setFont('SourceHanSC-Regular', 6.5)
        c.drawString(x + 3 * mm, row_y - 5 * mm, str(label))
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Bold', 9)
        c.drawString(x + 3 * mm, row_y - 11 * mm, str(display)[:30])
    rows = (len(entries) + 1) // 2
    return y - rows * cell_h - 2 * mm


def _draw_annual_comparison(c: canvas.Canvas, y: float, families: list) -> float:
    """两情景(非台风降雨 vs 台风复合)指标对比表"""
    rainfall = next((f for f in families if f.get('family') == 'non-typhoon-rainfall'), {})
    compound = next((f for f in families if f.get('family') == 'typhoon-compound'), {})

    rows = [
        ('1% 面积起始重现期', _return_period(rainfall, 'onePercentAreaOnsetReturnPeriod'),
         _return_period(compound, 'onePercentAreaOnsetReturnPeriod')),
        ('平均年概率', fmt_pct((rainfall.get('annualProbability') or {}).get('mean'), 2),
         fmt_pct((compound.get('annualProbability') or {}).get('mean'), 2)),
        ('P90 年概率', fmt_pct((rainfall.get('annualProbability') or {}).get('p90'), 2),
         fmt_pct((compound.get('annualProbability') or {}).get('p90'), 2)),
        ('平均年超额深度', fmt((rainfall.get('annualizedExcessDepth') or {}).get('mean'), 4, ' m/yr'),
         fmt((compound.get('annualizedExcessDepth') or {}).get('mean'), 4, ' m/yr')),
    ]

    label_w = 72 * mm
    value_w = (CONTENT_W - label_w) / 2
    header_h = 9 * mm
    row_h = 8 * mm

    # header
    c.setFillColor(LIGHT_SLATE)
    c.rect(MARGIN, y - header_h, label_w, header_h, fill=1, stroke=0)
    c.setFillColor(BLUE)
    c.rect(MARGIN + label_w, y - header_h, value_w, header_h, fill=1, stroke=0)
    c.setFillColor(VIOLET)
    c.rect(MARGIN + label_w + value_w, y - header_h, value_w, header_h, fill=1, stroke=0)
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 7)
    c.drawString(MARGIN + 3 * mm, y - 6 * mm, '区域风险指标')
    c.setFillColor(colors.white)
    c.drawCentredString(MARGIN + label_w + value_w / 2, y - 6 * mm, '非台风降雨')
    c.drawCentredString(MARGIN + label_w + value_w * 1.5, y - 6 * mm, '台风复合')
    y -= header_h

    for idx, (label, rain_v, tc_v) in enumerate(rows):
        row_y = y - row_h * (idx + 1)
        if idx % 2 == 1:
            c.setFillColor(ALT_ROW)
            c.rect(MARGIN, row_y, CONTENT_W, row_h, fill=1, stroke=0)
        c.setStrokeColor(BORDER)
        c.rect(MARGIN, row_y, CONTENT_W, row_h, fill=0, stroke=1)
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 7)
        c.drawString(MARGIN + 3 * mm, row_y + 3 * mm, label)
        c.setFont('SourceHanSC-Bold', 7)
        c.drawCentredString(MARGIN + label_w + value_w / 2, row_y + 3 * mm, rain_v)
        c.drawCentredString(MARGIN + label_w + value_w * 1.5, row_y + 3 * mm, tc_v)

    return y - row_h * len(rows) - 4 * mm


def _return_period(family: dict, key: str) -> str:
    val = family.get(key)
    if val is None or val == 0:
        return 'Not reached'
    try:
        return f'R{int(float(val))}'
    except (TypeError, ValueError):
        return 'Not reached'


def _draw_area_chart(c: canvas.Canvas, y: float, family: dict, color) -> float:
    """洪水面积+湿平均深度图(简化:柱状图示意)"""
    family_label = (
        '非台风降雨 - 淹没面积与平均水深'
        if family.get('family') == 'non-typhoon-rainfall'
        else '台风复合 - 淹没面积与平均水深'
    )
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 9.5)
    c.drawString(MARGIN, y, family_label)
    y -= 5 * mm

    chart_x = MARGIN + 12 * mm
    chart_y = y - 48 * mm
    chart_w = CONTENT_W - 24 * mm
    chart_h = 42 * mm

    scenarios = family.get('scenarios') or []
    if not scenarios:
        # 占位
        c.setFillColor(LIGHT_SLATE)
        c.rect(chart_x, chart_y, chart_w, chart_h, fill=1, stroke=0)
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 8)
        c.drawCentredString(chart_x + chart_w / 2, chart_y + chart_h / 2, '无情景数据')
        return y - 52 * mm

    # Y 轴网格 + 标签(0/25/50/75/100%)
    for tick in range(5):
        line_y = chart_y + chart_h - tick / 4 * chart_h
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.3)
        c.line(chart_x, line_y, chart_x + chart_w, line_y)
        c.setFillColor(colors.HexColor('#64748B'))
        c.setFont('SourceHanSC-Regular', 5.8)
        c.drawRightString(chart_x - 2 * mm, line_y + 1, f'{tick * 25}%')

    # 计算柱状图比例
    n = len(scenarios)
    bar_w = chart_w / n * 0.6
    gap = chart_w / n * 0.4
    max_pct = 100.0
    for idx, scenario in enumerate(scenarios):
        pct = scenario.get('floodedAreaPercent') or 0
        try:
            pct = float(pct)
        except (TypeError, ValueError):
            pct = 0
        bar_h = pct / max_pct * chart_h
        bar_x = chart_x + idx * (bar_w + gap) + gap / 2
        c.setFillColor(color)
        c.rect(bar_x, chart_y, bar_w, bar_h, fill=1, stroke=0)
        # X 轴标签
        c.setFillColor(colors.HexColor('#64748B'))
        c.setFont('SourceHanSC-Regular', 5.5)
        label = scenario.get('returnPeriodLabel') or f'#{idx + 1}'
        c.drawCentredString(bar_x + bar_w / 2, chart_y - 3 * mm, str(label)[:8])

    y = chart_y - 7 * mm
    return y


def _draw_legend(c: canvas.Canvas, y: float) -> float:
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 8)
    c.drawString(MARGIN, y, '洪水深度图例')
    y -= 5 * mm
    item_w = CONTENT_W / len(FLOOD_LEGEND)
    for idx, (hex_color, label) in enumerate(FLOOD_LEGEND):
        c.setFillColor(colors.HexColor(hex_color))
        c.rect(MARGIN + idx * item_w, y - 2 * mm, 4 * mm, 4 * mm, fill=1, stroke=0)
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 7)
        c.drawString(MARGIN + idx * item_w + 5 * mm, y, label)
    return y - 8 * mm


def _draw_footer(c: canvas.Canvas, page_label: str = '区域随机洪涝目录评估') -> None:
    c.setFillColor(BORDER)
    c.setStrokeColor(BORDER)
    c.line(MARGIN, PAGE_H - 12 * mm, PAGE_W - MARGIN, PAGE_H - 12 * mm)
    c.setFillColor(colors.HexColor('#64748B'))
    c.setFont('SourceHanSC-Regular', 7)
    c.drawString(MARGIN, PAGE_H - 7 * mm, f'NatCat Platform | {page_label}')
    c.drawRightString(PAGE_W - MARGIN, PAGE_H - 7 * mm, 'Page')


# ==================== 入口 ====================
def render_area_pdf(result: dict) -> bytes:
    """
    生成区域洪涝风险评估 PDF,返回二进制。
    result 字段参考 AreaFloodHazardResult(typescript):
      - title / label / bounds / geometry / vertexCount / eventCount / pathCount
      - familyStatistics: [{family, scenarios, annualProbability, annualizedExcessDepth, ...}]
      - historicalFlood: { maximumHistoricalDepth, rasterWidth, rasterHeight, available }
    """
    ensure_fonts_registered()
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setTitle('Area Flood Hazard Report')
    c.setAuthor('NatCat Platform')

    # Page 1: header + cover + key/value
    y = _draw_header(c, '区域洪涝风险评估报告', 'Area Flood Hazard — Stochastic Catalog')
    y = _draw_cover(c, result)

    y = _draw_section(c, y, '评估摘要 / Summary')
    entries = [
        ('历史最大水深', fmt(result.get('historicalFlood', {}).get('maximumHistoricalDepth'), 2, ' m')),
        ('历史栅格尺寸',
         f'{result.get("historicalFlood", {}).get("rasterWidth", "—")} × '
         f'{result.get("historicalFlood", {}).get("rasterHeight", "—")}'
         if result.get('historicalFlood', {}).get('available') else 'Not available'),
        ('平均水深', fmt(result.get('meanWetDepth'), 3, ' m')),
        ('最大水深', fmt(result.get('maximumDepth'), 2, ' m')),
        ('总事件数', str(result.get('eventCount', '—'))),
        ('触发路径数', str(result.get('pathCount', '—'))),
    ]
    y = _draw_key_value_grid(c, y, entries)

    families = result.get('familyStatistics') or []
    if len(families) >= 2:
        y = _draw_section(c, y, '两情景指标对比 / Driver Comparison')
        y = _draw_annual_comparison(c, y, families)

    # Page 2: charts per family
    if families:
        c.showPage()
        y = PAGE_H - 15 * mm
        y = _draw_section(c, y, '情景结果图 / Scenario Charts')
        for family in families:
            color = BLUE if family.get('family') == 'non-typhoon-rainfall' else VIOLET
            y = _draw_area_chart(c, y, family, color)
            y -= 4 * mm
            if y < 60 * mm:  # 留图例 + 页脚空间
                c.showPage()
                y = PAGE_H - 15 * mm

        y = _draw_legend(c, y)

    _draw_footer(c)
    c.showPage()
    c.save()
    return buf.getvalue()