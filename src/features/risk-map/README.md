# `features/risk-map/` — Risk Map 共享模块

## 定位

本目录是从 `src/app/riskmap/page.tsx`(Next.js 路由入口)**拆出去的共享模块**,所有可复用的 Risk Map 组件、配置、服务、类型与工具都应放在这里。

```
src/
├── app/
│   └── riskmap/
│       └── page.tsx        ← Next.js App Router 路由入口(只放布局/页面级状态)
└── features/
    └── risk-map/           ← 本目录:共享模块,被 page.tsx 与其他模块复用
        ├── components/     ← 展示组件(地图图例、结果卡片等)
        ├── config/         ← 静态配置(GeoServer URL、场景定义、图层清单)
        ├── services/       ← 与后端 API 交互的服务
        ├── types/          ← 跨模块共享类型
        └── utils/          ← 工具函数(PDF 生成、查询历史封装等)
```

## 规则

- ✅ 新增 Risk Map 复用逻辑 → 放 `features/risk-map/` 下对应子目录
- ✅ 修改 Risk Map 路由页面 → 改 `app/riskmap/page.tsx`
- ❌ 不要在 `app/riskmap/` 下新增 components/、services/、utils/ 等子目录
- ❌ 不要复制 `features/risk-map/` 中已有的配置/类型,page.tsx 必须 `import` 自本目录

## 跨页复用

`features/risk-map/` 中的以下模块被多个页面消费,而非 page.tsx 独占:

- `utils/queryHistory.ts` → 调用 `/api/risk-map/query-history`,Risk Map 历史面板
- `utils/{floodRiskPdf,areaFloodRiskPdf,portfolioFloodRiskReport}.ts` → PDF 报告生成
- `config/macauScenarios.ts`、`hongKongScenarios.ts` → 场景配置
- `services/hazardQuery.ts` → 洪涝危险度查询 API 封装

新增消费方请 `import` 这些模块,不要复制。