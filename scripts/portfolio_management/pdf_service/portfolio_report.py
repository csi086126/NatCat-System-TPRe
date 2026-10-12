"""
组合洪涝风险评估 PDF 报告(后端生成,中文友好)。

翻译自 src/features/risk-map/utils/portfolioFloodRiskReport.ts(原 jsPDF + xlsx)。
横版 A4(landscape)以容纳大量字段。
"""
import io
from datetime import datetime, timezone
from statistics import median

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
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
RED = colors.HexColor('#B91C1C')
AMBER = colors.HexColor('#D97706')
GREEN = colors.HexColor('#15803D')

PAGE_W, PAGE_H = landscape(A4)
MARGIN = 12 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

RETURN_PERIODS = [10, 25, 50, 100, 250, 500, 1000]


# ==================== 工具函数 ====================
def _num(value):
    try:
        v = float(value)
        return v if v == v else None  # NaN
    except (TypeError, ValueError):
        return None


def _fmt(value, digits=2, suffix=''):
    v = _num(value)
    return 'No data' if v is None else f'{v:.{digits}f}{suffix}'


def _pct(value, digits=2):
    v = _num(value)
    return 'No data' if v is None else f'{v * 100:.{digits}f}%'


def _return_period(value):
    v = _num(value)
    return 'Not reached' if v is None else f'R{int(v)}'


def _compact(value):
    """B / M / K 缩写。"""
    v = _num(value)
    if v is None:
        return '—'
    a = abs(v)
    if a >= 1e9:
        return f'{v / 1e9:.2f}B'
    if a >= 1e6:
        return f'{v / 1e6:.2f}M'
    if a >= 1e3:
        return f'{v / 1e3:.2f}K'
    return f'{v:.0f}'


def _assessment(location: dict, family: str):
    """从 location.riskScores.flood.driverAssessments 找指定 family 的评估结果。"""
    flood = (location.get('riskScores') or {}).get('flood') or {}
    for item in flood.get('driverAssessments') or []:
        for result in (item.get('results') or []):
            if result.get('scenarioFamily') == family:
                return item
    return None


def _scenario_depth(location: dict, family: str, return_period: int):
    item = _assessment(location, family)
    if not item:
        return None
    for result in (item.get('results') or []):
        if result.get('returnPeriod') == return_period:
            return _num(result.get('depth'))
    return None


def _truncate(text: str, max_chars: int) -> str:
    s = str(text or '').strip()
    return s if len(s) <= max_chars else s[: max_chars - 1] + '…'


# ==================== 章节 ====================
def _draw_header(c: canvas.Canvas, title: str, subtitle: str) -> float:
    """ReportLab 坐标系 (0,0) 在左下角;banner 在 y = PAGE_H - 22mm。"""
    banner_y = PAGE_H - 22 * mm
    c.setFillColor(TEAL)
    c.rect(0, banner_y, PAGE_W, 22 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('SourceHanSC-Bold', 15)
    c.drawString(MARGIN, banner_y + 14 * mm, title)
    c.setFont('SourceHanSC-Regular', 8)
    c.drawString(MARGIN, banner_y + 8 * mm, subtitle)
    c.setFillColor(SLATE)
    return banner_y - 6 * mm


def _draw_section(c: canvas.Canvas, y: float, title: str) -> float:
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 11)
    c.drawString(MARGIN, y, title)
    c.setStrokeColor(colors.HexColor('#99F6E4'))
    c.setLineWidth(0.5)
    c.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2)
    return y - 7 * mm


def _draw_cover(c: canvas.Canvas, locations: list, meta: dict) -> float:
    y = PAGE_H - 30 * mm
    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 14)
    title = meta.get('title') or meta.get('label') or '组合洪涝风险评估'
    c.drawString(MARGIN, y, _truncate(title, 50))
    y -= 8 * mm

    c.setFont('SourceHanSC-Regular', 9)
    total = len(locations)
    errors = sum(1 for loc in locations if loc.get('error'))
    c.drawString(MARGIN, y, f'标的总数: {total}    错误标的: {errors}')
    y -= 6 * mm

    # 总 TIV(取所有可读到的)
    tiv_values = []
    for loc in locations:
        for k in ('totalTIV', 'buildingTIV', 'contentTIV', 'biTIV'):
            v = _num(loc.get(k))
            if v is not None:
                tiv_values.append(v)
    if tiv_values:
        c.drawString(
            MARGIN, y,
            f'资产规模: {sum(tiv_values):,.0f} (字段合并参考)    '
            f'货币: {(locations[0] or {}).get("currency", "USD") if locations else "USD"}',
        )
        y -= 6 * mm

    # 生成时间
    c.setFont('SourceHanSC-Regular', 8)
    c.setFillColor(colors.HexColor('#475569'))
    timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    c.drawRightString(PAGE_W - MARGIN, 12 * mm, f'生成时间: {timestamp}    NatCat Platform')
    return y


def _draw_summary_metrics(c: canvas.Canvas, y: float, locations: list) -> float:
    """组合层级汇总:中位水深 / 高风险标的占比 / R100 全员影响率 等"""
    if not locations:
        return y

    # 各重现期深度的中位数 / 最大值
    rainfall_r100 = [_scenario_depth(loc, 'rainfall', 100) for loc in locations]
    rainfall_r100 = [d for d in rainfall_r100 if d is not None]
    compound_r100 = [_scenario_depth(loc, 'typhoon-compound', 100) for loc in locations]
    compound_r100 = [d for d in compound_r100 if d is not None]

    entries = [
        ('标的总数', f'{len(locations)}'),
        ('错误/无数据', f'{sum(1 for loc in locations if loc.get("error"))}'),
        ('非台风降雨 R100 中位水深', _fmt(median(rainfall_r100) if rainfall_r100 else None, 3, ' m')),
        ('非台风降雨 R100 最大水深', _fmt(max(rainfall_r100) if rainfall_r100 else None, 2, ' m')),
        ('台风复合 R100 中位水深', _fmt(median(compound_r100) if compound_r100 else None, 3, ' m')),
        ('台风复合 R100 最大水深', _fmt(max(compound_r100) if compound_r100 else None, 2, ' m')),
        ('R100 超阈值标的数(>0.15m)', f'{sum(1 for d in rainfall_r100 + compound_r100 if d and d > 0.15)}'),
    ]

    gap = 4 * mm
    cols = 3
    cell_w = (CONTENT_W - gap * (cols - 1)) / cols
    cell_h = 14 * mm
    rows = (len(entries) + cols - 1) // cols
    for idx, (label, display) in enumerate(entries):
        col = idx % cols
        row = idx // cols
        x = MARGIN + col * (cell_w + gap)
        row_y = y - row * cell_h
        c.setFillColor(LIGHT_SLATE)
        c.setStrokeColor(BORDER)
        c.rect(x, row_y - cell_h, cell_w, cell_h, fill=1, stroke=1)
        c.setFillColor(colors.HexColor('#64748B'))
        c.setFont('SourceHanSC-Regular', 6.5)
        c.drawString(x + 3 * mm, row_y - 5 * mm, str(label))
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Bold', 9)
        c.drawString(x + 3 * mm, row_y - 11 * mm, str(display)[:30])

    return y - rows * cell_h - 2 * mm


def _draw_distribution_chart(c: canvas.Canvas, y: float, locations: list) -> float:
    """R100 深度分��柱状图(<0.15m / 0.15-0.5m / 0.5-1m / 1-2m / >2m)"""
    all_depths = []
    for loc in locations:
        for family in ('rainfall', 'typhoon-compound'):
            d = _scenario_depth(loc, family, 100)
            if d is not None:
                all_depths.append(d)
    if not all_depths:
        return y

    bins = [0, 0, 0, 0, 0]
    bin_labels = ['<0.15 m', '0.15-0.5 m', '0.5-1 m', '1-2 m', '>2 m']
    bin_colors = [GREEN, AMBER, colors.HexColor('#F59E0B'), RED, colors.HexColor('#7F1D1D')]
    for d in all_depths:
        if d < 0.15:
            bins[0] += 1
        elif d < 0.5:
            bins[1] += 1
        elif d < 1.0:
            bins[2] += 1
        elif d < 2.0:
            bins[3] += 1
        else:
            bins[4] += 1

    c.setFillColor(SLATE)
    c.setFont('SourceHanSC-Bold', 9)
    c.drawString(MARGIN, y, 'R100 深度分布')
    y -= 5 * mm

    chart_x = MARGIN
    chart_y = y - 28 * mm
    chart_w = CONTENT_W
    chart_h = 24 * mm
    n = len(bins)
    bar_w = chart_w / n * 0.7
    gap = chart_w / n * 0.3
    max_count = max(bins) or 1
    for idx, count in enumerate(bins):
        bar_h = count / max_count * chart_h
        bar_x = chart_x + idx * (bar_w + gap) + gap / 2
        c.setFillColor(bin_colors[idx])
        c.rect(bar_x, chart_y, bar_w, bar_h, fill=1, stroke=0)
        # 数字标签
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Bold', 7)
        c.drawCentredString(bar_x + bar_w / 2, chart_y + bar_h + 1 * mm, str(count))
        # X 标签
        c.setFillColor(colors.HexColor('#64748B'))
        c.setFont('SourceHanSC-Regular', 6.5)
        c.drawCentredString(bar_x + bar_w / 2, chart_y - 3 * mm, bin_labels[idx])

    y = chart_y - 7 * mm
    return y


def _draw_location_table(c: canvas.Canvas, y: float, locations: list) -> float:
    """每个标的:名称 / 风险等级 / R100 降雨 / R100 复合 / TIV(只展示前 30 个 + 提示更多)"""
    if not locations:
        return y

    cols = [
        ('标的', 70 * mm),
        ('坐标', 36 * mm),
        ('风险', 22 * mm),
        ('R100 降雨', 28 * mm),
        ('R100 复合', 28 * mm),
        ('R250 复合', 28 * mm),
        ('TIV', 30 * mm),
        ('货币', 18 * mm),
    ]
    header_h = 6 * mm
    row_h = 5 * mm
    x_positions = []
    x = MARGIN
    for label, width in cols:
        x_positions.append((x, label, width))
        x += width

    # 表头
    c.setFillColor(TEAL)
    c.rect(MARGIN, y - header_h, CONTENT_W, header_h, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('SourceHanSC-Bold', 6.5)
    for x_pos, label, width in x_positions:
        c.drawString(x_pos + 1.5 * mm, y - 4 * mm, label)
    y -= header_h

    max_rows_per_page = 32
    shown = locations[:max_rows_per_page]

    for idx, loc in enumerate(shown):
        if y < 25 * mm:  # 页脚空间
            c.showPage()
            y = PAGE_H - 15 * mm
            y = _draw_section(c, y, '标的详情(续) / Locations (cont.)')
            # 重绘表头
            c.setFillColor(TEAL)
            c.rect(MARGIN, y - header_h, CONTENT_W, header_h, fill=1, stroke=0)
            c.setFillColor(colors.white)
            c.setFont('SourceHanSC-Bold', 6.5)
            for x_pos, label, width in x_positions:
                c.drawString(x_pos + 1.5 * mm, y - 4 * mm, label)
            y -= header_h

        if idx % 2 == 1:
            c.setFillColor(ALT_ROW)
            c.rect(MARGIN, y - row_h, CONTENT_W, row_h, fill=1, stroke=0)

        classification = (
            ((loc.get('riskScores') or {}).get('flood') or {}).get('classification') or '—'
        )
        rainfall_d = _scenario_depth(loc, 'rainfall', 100)
        compound_d = _scenario_depth(loc, 'typhoon-compound', 100)
        compound_250 = _scenario_depth(loc, 'typhoon-compound', 250)

        name = loc.get('name') or loc.get('address') or loc.get('id') or '—'
        lat = loc.get('latitude')
        lng = loc.get('longitude')
        coord = f'{_fmt(lat, 3)} {_fmt(lng, 3)}' if lat is not None and lng is not None else '—'
        currency = loc.get('currency') or 'USD'
        tiv = loc.get('totalTIV') or loc.get('buildingTIV')

        values = [
            _truncate(name, 28),
            _truncate(coord, 18),
            _truncate(classification, 10),
            _fmt(rainfall_d, 2, ' m'),
            _fmt(compound_d, 2, ' m'),
            _fmt(compound_250, 2, ' m'),
            _compact(tiv),
            currency,
        ]
        c.setFillColor(SLATE)
        c.setFont('SourceHanSC-Regular', 6)
        for (x_pos, _label, _width), val in zip(x_positions, values):
            c.drawString(x_pos + 1.5 * mm, y - 3.5 * mm, val)
        y -= row_h

    if len(locations) > max_rows_per_page:
        c.setFillColor(colors.HexColor('#64748B'))
        c.setFont('SourceHanSC-Regular', 7)
        c.drawString(
            MARGIN, y - 4 * mm,
            f'… 仅展示前 {max_rows_per_page} 条 / 共 {len(locations)} 条。完整明细请使用 Excel 工作簿导���。',
        )
        y -= 6 * mm

    return y


def _draw_footer(c: canvas.Canvas) -> None:
    c.setStrokeColor(BORDER)
    c.line(MARGIN, 12 * mm, PAGE_W - MARGIN, 12 * mm)
    c.setFillColor(colors.HexColor('#64748B'))
    c.setFont('SourceHanSC-Regular', 7)
    c.drawString(MARGIN, 8 * mm, 'NatCat Platform | Portfolio stochastic-catalog flood risk')
    c.drawRightString(PAGE_W - MARGIN, 8 * mm, 'Page')


# ==================== 入口 ====================
def render_portfolio_pdf(locations: list, meta: dict | None = None) -> bytes:
    """
    生成组合洪涝风险评估 PDF,返回二进制。
    locations: [{id, name, address, latitude, longitude, totalTIV, currency, riskScores, ...}]
    meta: {title, label, ...}
    """
    ensure_fonts_registered()
    meta = meta or {}
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    c.setTitle('Portfolio Flood Risk Report')
    c.setAuthor('NatCat Platform')

    # Page 1: header + cover + summary + distribution
    y = _draw_header(c, '组合洪涝风险评估报告', 'Portfolio Flood Risk — Stochastic Catalog')
    y = _draw_cover(c, locations, meta)

    y = _draw_section(c, y, '组合汇总 / Portfolio Summary')
    y = _draw_summary_metrics(c, y, locations)

    y = _draw_section(c, y, '深度分布 / Depth Distribution (R100)')
    y = _draw_distribution_chart(c, y, locations)

    # Page 2+: location table
    c.showPage()
    y = PAGE_H - 15 * mm
    y = _draw_section(c, y, '标的详情 / Locations')
    y = _draw_location_table(c, y, locations)

    _draw_footer(c)
    c.showPage()
    c.save()
    return buf.getvalue()