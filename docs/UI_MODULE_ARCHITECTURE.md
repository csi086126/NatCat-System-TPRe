# Nat Cat Platform UI Module Architecture

## 1. Active Product Modules

The current primary application navigation contains four business modules:

| Module | Route | Current responsibility |
| --- | --- | --- |
| Risk Map | `/riskmap` | Geocode single addresses, drawn areas, or uploaded portfolios; query GeoServer hazard layers at the resulting coordinates; determine flood return-period exposure; and export risk reports |
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

## 2. Risk Map and Disaster Repository Boundary

`/disasterinfo` owns the disaster-data catalog and its administration UI. `/riskmap` consumes the published catalog to perform risk queries. A GeoServer layer is therefore managed through Disaster Repository but queried and rendered by Risk Map when it participates in an assessment.

| Capability | Owning module | Risk Map usage |
| --- | --- | --- |
| GeoServer workspace/layer catalog, metadata, styles and availability | Disaster Repository (`/disasterinfo`) | Reads published queryable layers and displays selected WMS overlays |
| Historical and stochastic event catalog | Disaster Repository (`/disasterinfo`) | Optionally selects an event or event layer as an assessment scenario |
| Address geocoding and coordinate validation | Risk Map (`/riskmap`) | Converts one address or uploaded CSV addresses into query points |
| Drawn point/line/polygon assessment geometry | Risk Map (`/riskmap`) | Generates the coordinates or sampling grid used by the assessment |
| Hazard value lookup at coordinates | Risk Map (`/riskmap`) | Queries GeoServer through GetFeatureInfo/WCS or a server-side hazard-query service |
| Flood return-period classification | Risk Map (`/riskmap`) | Queries the configured return-period rasters and determines the lowest return period with inundation, together with depth values |
| Risk report generation | Risk Map (`/riskmap`) | Exports input location, geocoding quality, matched layers, return periods, hazard values, data versions and assessment time |

The intended query flow is:

```text
Single address / drawn area / uploaded CSV
					↓
		Geocoding and coordinate validation
					↓
  Point lookup or polygon sampling coordinates
					↓
 Published hazard-layer catalog from Disaster Repository
					↓
	  Server-side GeoServer raster/vector queries
					↓
 Flood return-period and hazard-value classification
					↓
		  Map results and downloadable report
```

For flood rasters, Risk Map should retain all matched return-period/depth results and classify the location using the minimum return period whose sampled depth exceeds the configured inundation threshold. The report must identify the exact GeoServer layer and data version used; it must not infer a return period from map color alone.

The provisional Macau Risk Map catalog has two families: 11 non-typhoon rainfall layers (`Whole_R*`) and 11 standalone T layers (`Whole_T*`) temporarily occupying the typhoon-compound product slot. The T series is explicitly a UI/data proxy and will be replaced by 11 compound return-period maps derived from the 10,000-year joint event set. The former 121 T-by-R combinations are not queried or displayed. The current and target conventions are documented in [MACAU_FLOOD_DESIGN_SCENARIOS.md](MACAU_FLOOD_DESIGN_SCENARIOS.md).

## 3. Existing Secondary or Experimental Routes

These routes are retained until a product decision is made. They are not linked from the primary header:

| Route | Current overlap / decision needed |
| --- | --- |
| `/asset` | Reinsurance/treaty-oriented portfolio prototype; decide whether to merge into Portfolio Management |
| `/cityinfo` | Risk Map supporting UI for non-hazard geospatial context layers and GeoServer data presentation |
| `/disasterinfo` | Disaster-data administration UI: event catalog, hazard-layer metadata, upload/registration, styles and publication status |
| `/earth` | Legacy standalone Earth view; overlaps Extensions |
| `/portfolio-statistics` | Legacy statistics experience; overlaps Portfolio Management |
| `/statistics` | Standalone statistics view; overlaps Portfolio Management districts view |
| `/test` | Development health-check route |

## 4. Current Code Ownership

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

## 5. Target Feature-Oriented Structure

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
│   │   ├── types/
│   │   └── geospatial-data-hub/       Supporting context-layer UI currently exposed at /cityinfo
│   ├── disaster-repository/           Hazard/event data administration exposed at /disasterinfo
│   │   ├── components/
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

## 6. Migration Rules

1. Preserve public route URLs during folder refactoring.
2. Keep route `page.tsx` files focused on screen composition.
3. Move feature-specific components out of the global component namespace.
4. Centralize GeoServer URLs and layer metadata instead of hard-coding them in pages.
5. Replace direct static JSON access with typed API/service modules as database integration progresses.
6. Do not retain `.backup`, `.new`, or `.new2` files inside `src`; Git history is the backup mechanism.
7. Remove a legacy route only after confirming its unique business capabilities have been merged or retired.

## 7. Recommended Next Refactor Order

1. Extract Risk Map WMS configuration, event types, and layer metadata.
2. Move Portfolio components into `features/portfolio` with temporary re-exports if needed.
3. Consolidate `/portfolio-statistics` and `/statistics` into `/portfolio`.
4. Decide whether `/asset` becomes a treaty view inside Portfolio Management.
5. Move `/cityinfo` into Risk Map supporting features and `/disasterinfo` into a peer Disaster Repository feature while preserving both route URLs.
6. Introduce a protected application layout and replace page-level `AppHeader` duplication.
7. Replace localStorage-only authentication before external client access.