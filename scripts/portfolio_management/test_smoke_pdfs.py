"""Smoke test:生成 3 个真实 PDF 验证中文地址显示。"""
import os
import sys
import tempfile as _tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pdf_service.point_report import render_point_pdf
from pdf_service.area_report import render_area_pdf
from pdf_service.portfolio_report import render_portfolio_pdf

OUT_DIR = Path(os.environ.get('TEMP', r'C:\Users\sichen\AppData\Local\Temp'))


# ============ Point: 妈阁庙 ============
asset = {
    'address': '妈阁庙,澳门半岛,澳门特别行政区',
    'latitude': 22.1845,
    'longitude': 113.5325,
}
flood = {
    'assessmentMode': 'all-22-stochastic-catalog-scenarios',
    'thresholdMeters': 0.15,
    'samplingMethod': 'max-in-radius',
    'samplingRadiusMeters': 50,
    'classification': '高风险 (High Risk)',
    'driverAssessments': [
        {'annualMetrics': {
            'annualFloodProbability': 0.18,
            'annualizedExcessDepth': 0.0042,
            'conditionalMeanFloodDepth': 0.42,
        }},
        {'annualMetrics': {
            'annualFloodProbability': 0.27,
            'annualizedExcessDepth': 0.0089,
            'conditionalMeanFloodDepth': 0.71,
        }},
    ],
    'historicalFlood': {
        'available': True,
        'events': [
            {'display': '山竹 (Mangkhut) 2018-09-16', 'year': 2018, 'family': 'typhoon-compound', 'depth': 1.45},
            {'display': '天鸽 (Hato) 2017-08-23', 'year': 2017, 'family': 'typhoon-compound', 'depth': 2.10},
            {'display': '海马 (Haima) 2016-10-21', 'year': 2016, 'family': 'typhoon-compound', 'depth': 0.78},
            {'display': '暴雨内涝 2024-06-15', 'year': 2024, 'family': 'rainfall', 'depth': 0.32},
        ]
    }
}
pdf = render_point_pdf(asset, flood)
out = OUT_DIR / 'point_test.pdf'
out.write_bytes(pdf)
print(f'[point] OK {len(pdf):,} bytes -> {out}')

# ============ Area: 妈阁片区 ============
area = {
    'title': '妈阁片区(评估区)',
    'bounds': {'north': 22.190, 'south': 22.180, 'east': 113.540, 'west': 113.525},
    'geometry': {'type': 'Polygon'},
    'vertexCount': 12,
    'eventCount': 48,
    'pathCount': 6,
    'meanWetDepth': 0.45,
    'maximumDepth': 2.10,
    'familyStatistics': [
        {
            'family': 'non-typhoon-rainfall',
            'annualProbability': {'mean': 0.05, 'p90': 0.12},
            'annualizedExcessDepth': {'mean': 0.0012},
            'onePercentAreaOnsetReturnPeriod': 250,
            'scenarios': [
                {'returnPeriodLabel': 'R10', 'floodedAreaPercent': 5.2, 'meanWetDepth': 0.15},
                {'returnPeriodLabel': 'R50', 'floodedAreaPercent': 12.4, 'meanWetDepth': 0.28},
                {'returnPeriodLabel': 'R100', 'floodedAreaPercent': 18.7, 'meanWetDepth': 0.42},
                {'returnPeriodLabel': 'R500', 'floodedAreaPercent': 35.1, 'meanWetDepth': 0.86},
            ],
        },
        {
            'family': 'typhoon-compound',
            'annualProbability': {'mean': 0.10, 'p90': 0.25},
            'annualizedExcessDepth': {'mean': 0.0042},
            'onePercentAreaOnsetReturnPeriod': 100,
            'scenarios': [
                {'returnPeriodLabel': 'R10', 'floodedAreaPercent': 8.0, 'meanWetDepth': 0.22},
                {'returnPeriodLabel': 'R50', 'floodedAreaPercent': 22.1, 'meanWetDepth': 0.58},
                {'returnPeriodLabel': 'R100', 'floodedAreaPercent': 31.5, 'meanWetDepth': 0.81},
                {'returnPeriodLabel': 'R500', 'floodedAreaPercent': 55.8, 'meanWetDepth': 1.65},
            ],
        },
    ],
    'historicalFlood': {'available': True, 'maximumHistoricalDepth': 2.10, 'rasterWidth': 256, 'rasterHeight': 256},
}
pdf = render_area_pdf(area)
out = OUT_DIR / 'area_test.pdf'
out.write_bytes(pdf)
print(f'[area]  OK {len(pdf):,} bytes -> {out}')

# ============ Portfolio ============
locations = [
    {
        'id': '1', 'name': '妈阁庙', 'address': '妈阁庙,澳门',
        'latitude': 22.1845, 'longitude': 113.5325,
        'totalTIV': 50000000, 'currency': 'USD',
        'riskScores': {'flood': {'classification': '高风险 (High Risk)', 'driverAssessments': [
            {'results': [
                {'scenarioFamily': 'rainfall', 'returnPeriod': 100, 'depth': 0.42},
                {'scenarioFamily': 'typhoon-compound', 'returnPeriod': 100, 'depth': 0.81},
                {'scenarioFamily': 'typhoon-compound', 'returnPeriod': 250, 'depth': 1.45},
            ]}
        ]}}
    },
    {
        'id': '2', 'name': '中环 IFC', 'address': '国际金融中心,香港中环',
        'latitude': 22.2855, 'longitude': 114.1585,
        'totalTIV': 250000000, 'currency': 'USD',
        'riskScores': {'flood': {'classification': '中等风险 (Medium Risk)', 'driverAssessments': [
            {'results': [
                {'scenarioFamily': 'rainfall', 'returnPeriod': 100, 'depth': 0.12},
                {'scenarioFamily': 'typhoon-compound', 'returnPeriod': 100, 'depth': 0.31},
                {'scenarioFamily': 'typhoon-compound', 'returnPeriod': 250, 'depth': 0.68},
            ]}
        ]}}
    },
    {
        'id': '3', 'name': '大三巴牌坊', 'address': '大三巴,澳门半岛',
        'latitude': 22.1975, 'longitude': 113.5410,
        'totalTIV': 15000000, 'currency': 'USD',
        'riskScores': {'flood': {'classification': '高风险 (High Risk)', 'driverAssessments': [
            {'results': [
                {'scenarioFamily': 'rainfall', 'returnPeriod': 100, 'depth': 0.85},
                {'scenarioFamily': 'typhoon-compound', 'returnPeriod': 100, 'depth': 1.42},
                {'scenarioFamily': 'typhoon-compound', 'returnPeriod': 250, 'depth': 2.31},
            ]}
        ]}}
    },
    {
        'id': '4', 'name': '低风险住宅', 'address': '屯门,香港',
        'latitude': 22.3900, 'longitude': 113.9700,
        'totalTIV': 8000000, 'currency': 'USD',
        'riskScores': {'flood': {'classification': '低风险 (Low Risk)', 'driverAssessments': [
            {'results': [
                {'scenarioFamily': 'rainfall', 'returnPeriod': 100, 'depth': 0.05},
                {'scenarioFamily': 'typhoon-compound', 'returnPeriod': 100, 'depth': 0.11},
                {'scenarioFamily': 'typhoon-compound', 'returnPeriod': 250, 'depth': 0.18},
            ]}
        ]}}
    },
]
meta = {'title': '2026 Q3 巨灾保险组合 - 港澳地区', 'label': 'Macao+Hong Kong portfolio'}
pdf = render_portfolio_pdf(locations, meta)
out = OUT_DIR / 'portfolio_test.pdf'
out.write_bytes(pdf)
print(f'[portfolio] OK {len(pdf):,} bytes -> {out}')

print()
print('All 3 PDFs generated. Open them to verify Chinese text is real (not boxes).')