# Nat Cat Platform UI Module Architecture

## 1. Active Product Modules

The current primary application navigation contains four business modules:

| Module | Route | Current responsibility |
| --- | --- | --- |
| Risk Map | `/riskmap` | Single-point risk query, area selection, hazard layers, historical events, portfolio overlay, exports, and EP curves |
| Catastrophe Model | `/model` | Entry point for OasisLMF and the HKUST model console |
| Portfolio Management | `/portfolio` | Portfolio map, district statistics, multidimensional analysis, and trends for HK/Macau |
| Extensions | `/fuzhu` | Future warning/simulation/loss tools and the active Earth Nullschool integration |

Supporting routes:

| Route | Responsibility |
| --- | --- |
| `/` | Auth-gated product landing page |
| `/login` | Current development login |
| `/usercenter` | User profile/settings placeholder |
| `/oasislmf` | OasisLMF service adapter and embedded UI |
| `/oasis` | HKUST model project console |

## 2. Existing Secondary or Experimental Routes

These routes are retained until a product decision is made. They are not linked from the primary header:

| Route | Current overlap / decision needed |
| --- | --- |
| `/asset` | Reinsurance/treaty-oriented portfolio prototype; decide whether to merge into Portfolio Management |
| `/cityinfo` | Geospatial data hub; overlaps Risk Map supporting data layers |
| `/disasterinfo` | Rich disaster repository; candidate submodule of Risk Map or Extensions |
| `/earth` | Legacy standalone Earth view; overlaps Extensions |
| `/portfolio-statistics` | Legacy statistics experience; overlaps Portfolio Management |
| `/statistics` | Standalone statistics view; overlaps Portfolio Management districts view |
| `/test` | Development health-check route |

## 3. Current Code Ownership

```text
src/
├── app/                         Next.js routes and API entry points
│   ├── riskmap/                 Risk Map screen (currently oversized)
│   ├── portfolio/               Portfolio screen composition
│   ├── model/                   Cat model selector
│   ├── oasislmf/                OasisLMF adapter screen
│   ├── oasis/                   HKUST model screen
│   ├── fuzhu/                   Extensions screen
│   └── api/                     Server/API routes
├── components/
│   ├── portfolio/               Portfolio map and analysis components
│   ├── statistics/              Shared geographic statistics component
│   └── ui/                      Generic shadcn/Radix UI primitives
├── contexts/                    Global region state
├── hooks/                       Shared React hooks
├── lib/                         Shared GIS/data helpers and API clients
├── styles/                      Shared map styles
└── types/                       Shared TypeScript types
```

## 4. Target Feature-Oriented Structure

The migration target keeps App Router pages thin and moves business behavior into feature folders:

```text
src/
├── app/                         Route entry points only
├── features/
│   ├── risk-map/
│   │   ├── components/
│   │   ├── config/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── portfolio/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types/
│   ├── cat-models/
│   │   ├── oasislmf/
│   │   └── hkust/
│   ├── disaster-repository/
│   ├── extensions/
│   └── users/
├── shared/
│   ├── components/
│   ├── config/
│   ├── hooks/
│   ├── lib/
│   └── types/
└── components/ui/               Generic UI primitives only
```

## 5. Migration Rules

1. Preserve public route URLs during folder refactoring.
2. Keep route `page.tsx` files focused on screen composition.
3. Move feature-specific components out of the global component namespace.
4. Centralize GeoServer URLs and layer metadata instead of hard-coding them in pages.
5. Replace direct static JSON access with typed API/service modules as database integration progresses.
6. Do not retain `.backup`, `.new`, or `.new2` files inside `src`; Git history is the backup mechanism.
7. Remove a legacy route only after confirming its unique business capabilities have been merged or retired.

## 6. Recommended Next Refactor Order

1. Extract Risk Map WMS configuration, event types, and layer metadata.
2. Move Portfolio components into `features/portfolio` with temporary re-exports if needed.
3. Consolidate `/portfolio-statistics` and `/statistics` into `/portfolio`.
4. Decide whether `/asset` becomes a treaty view inside Portfolio Management.
5. Decide whether `/cityinfo` and `/disasterinfo` become Risk Map submodules.
6. Introduce a protected application layout and replace page-level `AppHeader` duplication.
7. Replace localStorage-only authentication before external client access.