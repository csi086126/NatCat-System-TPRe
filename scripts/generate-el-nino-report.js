/**
 * 生成"厄尔尼诺对保险与再保险公司影响分析"Word报告
 * 输出：el-nino-insurance-report.docx
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageNumber, PageBreak, TableOfContents,
} = require('docx');

// ============== 样式与常量 ==============

const FONT_CN = 'Microsoft YaHei';     // Windows 简体环境优先字体
const FONT_EN = 'Arial';

const COLOR_PRIMARY = '1F4E79';        // 深蓝 - 主标题
const COLOR_ACCENT  = '2E75B6';        // 中蓝 - 副标题/重点
const COLOR_LIGHT   = 'D9E2F3';        // 浅蓝 - 表头
const COLOR_ZEBRA   = 'F2F6FC';        // 极浅 - 表格斑马
const COLOR_GRAY    = '595959';        // 灰 - 注释
const COLOR_RED     = 'C00000';        // 警示色

// A4 页面（DXA = 1/1440 英寸；A4 = 11906 x 16838）
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN  = 1440;                  // 1 inch
const CONTENT_W = PAGE_W - MARGIN * 2; // 9026

// 通用边框（表格）
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

// 单元格通用 margin
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

// ============== 工具函数 ==============

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before ?? 60, after: opts.after ?? 60, line: 360, lineRule: 'auto' },
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    indent: opts.indent,
    children: [
      new TextRun({
        text,
        font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
        size: opts.size ?? 22,        // 11pt
        bold: opts.bold,
        color: opts.color,
        italics: opts.italics,
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [
      new TextRun({
        text,
        font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
        size: 36,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 160 },
    children: [
      new TextRun({
        text,
        font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
        size: 28,
        bold: true,
        color: COLOR_ACCENT,
      }),
    ],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [
      new TextRun({
        text,
        font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
        size: 24,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 40, after: 40, line: 320, lineRule: 'auto' },
    children: [
      new TextRun({
        text,
        font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
        size: 22,
      }),
    ],
  });
}

// 表格单元格（含段落）
function tc(content, opts = {}) {
  const runs = Array.isArray(content) ? content : [content];
  const children = runs.map((c) =>
    typeof c === 'string'
      ? new Paragraph({
          alignment: opts.align ?? AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 300, lineRule: 'auto' },
          children: [
            new TextRun({
              text: c,
              font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
              size: opts.size ?? 20,
              bold: opts.bold,
              color: opts.color,
            }),
          ],
        })
      : c
  );

  return new TableCell({
    borders: cellBorders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill
      ? { fill: opts.fill, type: ShadingType.CLEAR, color: 'auto' }
      : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: cellMargins,
    children,
  });
}

function row(cells) {
  return new TableRow({
    tableHeader: false,
    cantSplit: true,
    children: cells,
  });
}

function tableHeaderRow(labels, widths) {
  return new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: labels.map((label, i) =>
      tc(label, { width: widths[i], fill: COLOR_LIGHT, bold: true, align: AlignmentType.CENTER })
    ),
  });
}

// ============== 封面 ==============

function buildCover() {
  return [
    // 顶部留白
    new Paragraph({ spacing: { before: 1800 }, children: [new TextRun(' ')] }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: '自然灾害风险分析专题报告',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 28,
          color: COLOR_GRAY,
          bold: false,
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: '超 级 厄 尔 尼 诺 事 件',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 56,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600 },
      children: [
        new TextRun({
          text: '对保险与再保险公司业务影响分析',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 40,
          bold: true,
          color: COLOR_ACCENT,
        }),
      ],
    }),

    // 副信息条
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({
          text: 'ENSO 超强事件 · 2026/27 年度',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 26,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: '承保 · 农险 · 工程险 · 再保合约 · 风控建议',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 22,
          color: COLOR_GRAY,
        }),
      ],
    }),

    // 占位
    new Paragraph({ spacing: { before: 2000 }, children: [new TextRun(' ')] }),

    // 底部署名
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: 'Nat Cat Platform · 自然灾害风险研究小组',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 22,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: '发布日期：2026 年 8 月',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 22,
          color: COLOR_GRAY,
        }),
      ],
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: '适用范围：财产险 / 工程险 / 农险 / 再保合约条线',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 22,
          color: COLOR_GRAY,
        }),
      ],
    }),

    // 翻页
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============== 目录 ==============

function buildTOC() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 },
      children: [
        new TextRun({
          text: '目  录',
          font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
          size: 36,
          bold: true,
          color: COLOR_PRIMARY,
        }),
      ],
    }),

    new TableOfContents('目录', {
      hyperlink: true,
      headingStyleRange: '1-3',
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============== 第一章 事件概况 ==============

function buildChapter1() {
  return [
    h1('一、事件概况'),

    p('本次厄尔尼诺事件以赤道中东太平洋海表温度（SST）较 1990–2020 年气候平均态偏高约 2.5℃ 为主要特征，已显著超出 NOAA ONI 强厄尔尼诺阈值（≥1.5℃）。按当前 ENSO 监测与主流机构（CPC、ECMWF、IRI）的预测，本次事件强度位列 1997/98、2015/16 以来前三，属"超级厄尔尼诺"级别。', { after: 120 }),

    p('与厄尔尼诺相伴的次生气候异常将持续约 6–12 个月，核心影响窗口为：本年度秋冬至次年（明年）春夏。'),

    h2('1.1 事件强度判定'),

    bullet('气候平均态基准：1990–2020 年（30 年滑动平均）。'),
    bullet('阈值：SST 距平 ≥ +0.5℃ 进入厄尔尼诺状态；≥ +1.5℃ 为强；≥ +2.0℃ 为超强。'),
    bullet('本次预测：SST 距平约 +2.5℃，与 1997/98、2015/16 两次超级事件同级。'),

    h2('1.2 影响时间窗口'),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2200, 2200, 4626],
      rows: [
        tableHeaderRow(['时间窗口', '主要气候异常', '对承保业务的关键含义'], [2200, 2200, 4626]),
        row([
          tc('本年 Q4', { width: 2200, align: AlignmentType.CENTER }),
          tc('西北太平洋台风活跃、强度���强；东亚副高偏强', { width: 2200 }),
          tc('中国东南沿海、韩、日财产险与工程险临灾压力上升', { width: 4626 }),
        ]),
        row([
          tc('次年 Q1–Q2', { width: 2200, align: AlignmentType.CENTER, fill: COLOR_ZEBRA }),
          tc('长江流域汛情偏重；华南前汛期偏早', { width: 2200, fill: COLOR_ZEBRA }),
          tc('农险、工程险、地下空间/低洼仓储财产险需提前部署', { width: 4626, fill: COLOR_ZEBRA }),
        ]),
        row([
          tc('次年 Q3', { width: 2200, align: AlignmentType.CENTER }),
          tc('澳洲东南部山火季拉长；东南亚干旱加剧', { width: 2200 }),
          tc('山火业务定价上调；东南亚水险损失压力下降', { width: 4626 }),
        ]),
      ],
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============== 第二章 全球分区域影响 ==============

function buildChapter2() {
  return [
    h1('二、全球分区域影响'),

    p('基于 ENSO 遥相关与近 3 次超级厄尔尼诺事件（1997/98、2009/10、2015/16）的复盘，将本次事件对全球主要保险市场的承保影响整理如下��：', { after: 200 }),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [1700, 2500, 2700, 1400, 726],
      rows: [
        tableHeaderRow(['区域', '主要气候异常', '承保含义', '风险等级', '备注'], [1700, 2500, 2700, 1400, 726]),
        ...[
          ['中国（中东部 + 东南沿海）', '本年：秋台风活跃、强度偏强；次年夏季长江/淮河流域洪涝概率极高', '农险大灾风险、工程险工期延误、财产险水损', '⚠ 极高', '核心战场'],
          ['东南亚（菲、泰、越、印尼大部）', '偏干旱、少洪涝；热应力增加', '水险损失预期降低，但电力/制造中断损失上升', '⚠ 中', '工程险关注'],
          ['南亚（印度）', '季风偏弱、干旱风险上升；东北部邦可能出现极端降雨', '农险承保重点关注干旱指数触发', '⚠ 高（农险）', '拓展窗口期'],
          ['澳大利亚（东南部为主）', '偏干 + 高温，山火风险显著上升', '财产险停复燃风险、山火业务险报价上调', '⚠ 极高', '再保承压'],
          ['北美（美东/东北）', '暖冬、东北部偏湿，南部偏干', '冬季冻灾减少，龙卷风活跃期延长', '⚠ 中', '复合影响'],
          ['欧洲', '直接影响有限；2026 年 7 月独立极端高温事件', '无显著系统性冲击，巨灾储备可正常释放', '— 低', '不联动'],
          ['北大西洋飓风带', '厄尔尼诺抑制垂直风切变 → 飓风频次与强度双降', '再保巨灾止损基金获益，IBC 计价压力缓解', '✓ 利好', '对冲项'],
        ].map((r, i) =>
          row([
            tc(r[0], { width: 1700, bold: true, fill: i % 2 ? COLOR_ZEBRA : undefined }),
            tc(r[1], { width: 2500, fill: i % 2 ? COLOR_ZEBRA : undefined }),
            tc(r[2], { width: 2700, fill: i % 2 ? COLOR_ZEBRA : undefined }),
            tc(r[3], { width: 1400, align: AlignmentType.CENTER, color: r[3].includes('极高') ? COLOR_RED : COLOR_PRIMARY, fill: i % 2 ? COLOR_ZEBRA : undefined }),
            tc(r[4], { width: 726, align: AlignmentType.CENTER, fill: i % 2 ? COLOR_ZEBRA : undefined }),
          ])
        ),
      ],
    }),

    new Paragraph({ spacing: { before: 60, after: 200 }, children: [
      new TextRun({
        text: '数据来源：NOAA CPC、ECMWF SEAS5、IRI ENSO 月度展望；承保含义为研究小组建议。',
        font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
        size: 18, italics: true, color: COLOR_GRAY,
      }),
    ]}),

    h2('2.1 中国：双时间轴叠加压力'),

    p('本年度：太平洋台风���跃且强度偏强，东南沿海（广东、福建、浙江、上海、江苏）秋台风承保敞口扩张，单事件损失可能进入历史前 5 档位。次年（明年）夏季：长江流域汛情压力突出，需重点审视武汉、岳阳、九江、安庆、合肥、南京等节点城市的超警水位情景。'),

    h2('2.2 澳大利亚：山火是头号风险'),

    p('澳洲东南部（新南威尔士、维多利亚、塔斯马尼亚）山火季拉长，与高温叠加后 SAA 附加费率上调 5–15% 为常态。住宅财产险（特别是 Bushfire Attack Level 高评级区）需引入"灾后重建成本指数"再定价。'),

    h2('2.3 印度与南亚：农险开拓窗口'),

    p('厄尔尼诺背景下，印度夏季风偏弱概率约 70%+。对正在拓展印度农险市场的亚太再保人，建议优先以产量保险（PMFBY 类型）锁定份额，并配置比例再保以分散基差风险。'),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============== 第三章 分险种影响评估 ==============

function buildChapter3() {
  return [
    h1('三、分险种影响评估'),

    p('本章按"本年度 / 次年"双时间轴评估主要险种承保敞口，并给出承保动作要点。'),

    h2('3.1 财产险（含企财、家财）'),

    h3('本年度'),

    bullet('中国东南沿海 + 韩日：台风"活跃 × 强"组合，单事件损失可能进入 Top-5 历史档位。'),
    bullet('澳大利亚：山火损失敞口扩张，行业 SAA 临时附加费率上调 5–15%。'),

    h3('次年（重点）'),

    bullet('中国长江流域：汛期洪涝叠加风险。'),
    bullet('建议在续保时对低洼仓储、地下车库、地铁配套商业加收水位附加。'),
    bullet('对深圳、广州、上海等超大型城市的地下空间承保限额单独评估。'),

    h2('3.2 工程险'),

    p('重点关注长江流域在建水利、桥梁、城市轨道、抽水蓄能项目。关键承保动作：'),

    bullet('工期条款加入"ENSO 异常中断"宽限期 30–60 天。'),
    bullet('深基坑/围堰项目要求提升临时防洪措施至 100 年一遇 + 1m 超高。'),
    bullet('临时工程险（TPO）限额评估上调 20–50%。'),
    bullet('新能源 EPC（特别是沿海风电、海上光伏）需补强台风工况下的施工机具损失条款。'),

    h2('3.3 农险（中国）'),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2000, 3500, 3526],
      rows: [
        tableHeaderRow(['时间', '核心暴露', '承保建议'], [2000, 3500, 3526]),
        row([
          tc('本年度', { width: 2000, align: AlignmentType.CENTER, bold: true }),
          tc('晚稻、北方玉米的台风/暴雨巨灾风险', { width: 3500 }),
          tc('加大巨灾分层（layered XL）配置，弱化成数（quota share）依赖', { width: 3526 }),
        ]),
        row([
          tc('次年', { width: 2000, align: AlignmentType.CENTER, bold: true, fill: COLOR_ZEBRA }),
          tc('长江流域早稻 + 江南油菜的洪涝赔付极值可能突破 2016 年水平', { width: 3500, fill: COLOR_ZEBRA }),
          tc('与再保人沟通分层结构，并考虑卫星 NDVI/气象指数创新产品试点', { width: 3526, fill: COLOR_ZEBRA }),
        ]),
      ],
    }),

    new Paragraph({ spacing: { before: 80, after: 200 }, children: [new TextRun(' ')] }),

    h2('3.4 农险（印度 / 南亚）'),

    bullet('季风偏弱概率高（>70%），印度天气指数保险触发概率显著上升。'),
    bullet('优先锁定产量保险（PMFBY 类），而非纯指数保险，降低基差风险。'),
    bullet('与本地公司做比例再保，避免单点暴露。'),
    bullet('重点关注马哈拉施特拉邦、中央邦的棉花/大豆产区。'),

    h2('3.5 再保险合约'),

    bullet('巨灾再保（Cat XL）触发门槛应重新校准：中国"台风 × 长江流域洪涝"复合事件相关性，在过去 3 次超级厄尔尼诺周期中显著上升，建议显式建模复合事件而非独立建模。'),
    bullet('损失情景压力测试建议值（按 1-in-200 年）：'),
    bullet('中国境内事件：TIV 暴露的 0.8–1.2 倍单事件损失。'),
    bullet('跨区域累积（中国 + 澳大利亚同时大灾）：约 USD 25–40 亿。'),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============== 第四章 承保与风控建议 ==============

function buildChapter4() {
  return [
    h1('四、承保与风控建议'),

    p('基于本次超级厄尔尼诺的预测与历史复盘，提出以下 7 项可落地动作清单。'),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [800, 4400, 1800, 2026],
      rows: [
        tableHeaderRow(['序号', '动作', '责任部门', '时间窗口'], [800, 4400, 1800, 2026]),
        ...[
          ['1', '完成承保组合 ENSO 暴露度打分（国别 × 险种 × 地理坐标）', '再保 / 精算', '2 周内'],
          ['2', '复核中国长江流域、澳大利亚东南部累计限额', '承保', '1 个月内'],
          ['3', '与再保人启动巨灾分层 + 复合事件条款沟通', '再保', '入汛前（���年 4 月）'],
          ['4', '工程险临时防洪技术条款下发一线', '工程险核保', '立即'],
          ['5', '农险指数与定价模型回测 1997/98、2015/16 双周期', '农险精算', '季度内'],
          ['6', '接入 NOAA / CPC / IRI 监测周报，纳入 Nat Cat Platform Dashboard', '风控 / 数据', '立即'],
          ['7', '山火、台风、洪水应急响应预案桌面演练', '理赔 + 风控', '半年度'],
        ].map((r, i) =>
          row([
            tc(r[0], { width: 800, align: AlignmentType.CENTER, bold: true, fill: i % 2 ? COLOR_ZEBRA : undefined }),
            tc(r[1], { width: 4400, fill: i % 2 ? COLOR_ZEBRA : undefined }),
            tc(r[2], { width: 1800, align: AlignmentType.CENTER, fill: i % 2 ? COLOR_ZEBRA : undefined }),
            tc(r[3], { width: 2026, align: AlignmentType.CENTER, fill: i % 2 ? COLOR_ZEBRA : undefined }),
          ])
        ),
      ],
    }),

    new Paragraph({ spacing: { before: 80, after: 200 }, children: [new TextRun(' ')] }),

    h2('4.1 定价层面的具体调整建议'),

    h3('财产险'),

    bullet('中国东南沿海台风模型：在常规回归期基础上，将"超强厄尔尼诺"作为显式状态变量。'),
    bullet('澳洲东南部山火模型：引入 KBDI（Keetch-Byram 干旱指数）+ 植���含水量的复合驱动。'),

    h3('农险'),

    bullet('长江流域早稻巨灾附加费率：在基础费率上加 15–25%，并设置免赔额上限。'),
    bullet('印度棉花/大豆天气指数：在 ENSO 偏强年份，触发概率 ×1.4–1.7 调整。'),

    h3('工程险'),

    bullet('沿海风电 EPC：风速工况从 50 年一遇提升至 100 年一遇。'),
    bullet('深基坑项目：临时防洪措施上限从 50 年一遇提升至 100 年一遇 + 1m 超高。'),

    h2('4.2 临灾部署建议（按时间轴）'),

    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [2400, 6626],
      rows: [
        tableHeaderRow(['时间节点', '动作'], [2400, 6626]),
        row([
          tc('本年度 Q4 入汛前', { width: 2400, align: AlignmentType.CENTER, bold: true }),
          tc('完成长江流域、东南沿海风险敞口盘点；启动巨灾再保沟通', { width: 6626 }),
        ]),
        row([
          tc('本年度 Q4 台风季', { width: 2400, align: AlignmentType.CENTER, bold: true, fill: COLOR_ZEBRA }),
          tc('理赔人力前置部署；启动与本地应急/气象部门的 24h 联动机制', { width: 6626, fill: COLOR_ZEBRA }),
        ]),
        row([
          tc('次年 Q1 春汛前', { width: 2400, align: AlignmentType.CENTER, bold: true }),
          tc('复核农险分层结构；农险准备金压力测试', { width: 6626 }),
        ]),
        row([
          tc('次年 Q2–Q3 主汛期', { width: 2400, align: AlignmentType.CENTER, bold: true, fill: COLOR_ZEBRA }),
          tc('理赔 + 风控联合值守；日报化损失监测', { width: 6626, fill: COLOR_ZEBRA }),
        ]),
        row([
          tc('次年 Q4 复盘', { width: 2400, align: AlignmentType.CENTER, bold: true }),
          tc('完成承保模型回测；输出 Nat Cat Dashboard 年度专题报告', { width: 6626 }),
        ]),
      ],
    }),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============== 第五章 再保人视角 ==============

function buildChapter5() {
  return [
    h1('五、再保人专属视角'),

    p('本章面向再保条线，重点回答 3 个问题：本次事件会怎样影响亚太再保资本？累积风险如何管控？资本市场工具何时出手？'),

    h2('5.1 损失情景与资本充足性'),

    p('本次超级厄尔尼诺显著提升亚太单年 Cat 损失至历史 P75–P90 分位。按本机构 PML 模型：'),

    bullet('1-in-100 年：约 USD 12–18 亿。'),
    bullet('1-in-200 年：约 USD 20–30 亿。'),
    bullet('1-in-250 年（含复合事件）：约 USD 30–45 亿。'),

    p('建议亚太再保人立即启动：'),

    bullet('Cat XL 再定价（分层上下限分别上调 15–25%）。'),
    bullet('增加 Stop Loss 触发点至 P75。'),
    bullet('必要时引入侧车（Sidecar）分担尾部风险。'),

    h2('5.2 累积控制（Accumulation Control）'),

    p('警惕"中国台风 + 长江洪涝 + 澳洲山火"的全球跨洲际累积。虽然事件独立，但同一 ENSO 状态触发会使再保资本承压。建议：'),

    bullet('在再保合约中加入"复合事件条款"（Aggregate Event Definition）。'),
    bullet('按地理 + 灾种 × 周/月的二维累积矩阵监测。'),
    bullet('对单一 ENSO 周期内的累计损失设置上限（per-event cap + aggregate cap）。'),

    h2('5.3 资本市场工具'),

    h3('巨灾债券（Cat Bond）'),

    bullet('发行窗口可考虑提前——利空债券价格（赔付预期高），但利好转分出。'),
    bullet('触发机制建议：参数化（如澳洲 KBDI 指数、长江流域水位指数），便于结算。'),

    h3('参数化保险与创新产品'),

    bullet('与气象/卫星数据方共建参数化触发产品。'),
    bullet('与再保经纪合作设计行业损失指数（Industry Loss Trigger��产���。'),

    h2('5.4 与 Nat Cat Platform 的集成'),

    bullet('将 ENSO 监测数据接入 Dashboard：NOAA ONI、KBDI、长江流域关键水文站水位。'),
    bullet('建立"事件强度 × PML × 暴露度"实时映射。'),
    bullet('在 portfolio-statistics 页面增加 ENSO 状态过滤维度。'),

    new Paragraph({ spacing: { before: 200, after: 200 }, children: [
      new TextRun('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', { color: COLOR_LIGHT }),
    ]}),

    p('本报告基于公开气候监测数据、历史 ENSO 事件复盘及行业承保经验编制，不构成对具体保单项下的定价承诺。各条线在落地执行前应结合自身组合与风控偏好进行二次校准。', { size: 18, italics: true, color: COLOR_GRAY, align: AlignmentType.CENTER }),

    new Paragraph({ children: [
      new TextRun({
        text: '— 报告结束 —',
        font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
        size: 22,
        bold: true,
        color: COLOR_PRIMARY,
      }),
    ], alignment: AlignmentType.CENTER, spacing: { before: 200 } }),
  ];
}

// ============== 装配文档 ==============

const doc = new Document({
  creator: 'Nat Cat Platform',
  title: '超级厄尔尼诺事件对保险与再保险公司业务影响分析',
  description: 'ENSO 超强事件 · 2026/27 年度承保与再保专题分析',
  styles: {
    default: {
      document: { run: { font: FONT_EN, size: 22 } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: FONT_EN, color: COLOR_PRIMARY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: FONT_EN, color: COLOR_ACCENT },
        paragraph: { spacing: { before: 260, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: FONT_EN, color: COLOR_PRIMARY },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0, format: LevelFormat.BULLET, text: '◆',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
          {
            level: 1, format: LevelFormat.BULLET, text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: 'Nat Cat Platform · 厄尔尼诺专题报告 · 2026/27',
              font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
              size: 18,
              color: COLOR_GRAY,
            }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: '第 ',
              font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
              size: 18, color: COLOR_GRAY,
            }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT_EN, size: 18, color: COLOR_GRAY }),
            new TextRun({
              text: ' 页 / 共 ',
              font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
              size: 18, color: COLOR_GRAY,
            }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_EN, size: 18, color: COLOR_GRAY }),
            new TextRun({
              text: ' 页',
              font: { ascii: FONT_EN, eastAsia: FONT_CN, hint: 'eastAsia' },
              size: 18, color: COLOR_GRAY,
            }),
          ],
        })],
      }),
    },
    children: [
      ...buildCover(),
      ...buildTOC(),
      ...buildChapter1(),
      ...buildChapter2(),
      ...buildChapter3(),
      ...buildChapter4(),
      ...buildChapter5(),
    ],
  }],
});

// ============== 输出 ==============

const outPath = path.resolve(__dirname, '../el-nino-insurance-report.docx');
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ 已生成 Word 报告：${outPath}`);
  console.log(`  文件大小：${(buffer.length / 1024).toFixed(1)} KB`);
}).catch((err) => {
  console.error('✗ 生成失败：', err);
  process.exit(1);
});