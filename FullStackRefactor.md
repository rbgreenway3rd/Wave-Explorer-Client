# WaveExplorer Backend Migration — Discovery Inventory

## Context

You're evaluating whether to add a backend to WaveExplorer, currently a 100% browser-side React app on GitHub Pages. Before deciding *what* to move, you want a clear picture of *what's there* — across the whole app, not just the Neural module. This document is that picture: a thorough inventory of features, computation, state, persistence, and I/O, plus a categorization of migration candidates and a list of the questions a follow-up planning round will need to answer.

**Note on the auth wiring you'll see in the code:** [App.js](src/App.js) imports Firebase Auth + Firestore ([App.js#L13](src/App.js#L13), [App.js#L38-L51](src/App.js#L38-L51)) and a Supabase client ([App.js#L10](src/App.js#L10), used in `ProfileMenu`). These are **stubbed-in but not in production** — no Firebase project is paid/hosted, no Supabase project is hosted, and the path that's actually exercised is the `uid === "dev-bypass"` branch ([App.js#L25-L36](src/App.js#L25-L36)) that short-circuits all BaaS calls and stamps in a dummy admin profile. Treat this code as aspirational scaffolding, not a live dependency. In runtime terms the app *is* 100% browser-only today.

---

## Product Shape (decided this session)

The four gating product-shape questions have been answered. Architecture talk below assumes these:

| # | Question | Answer |
|---|----------|--------|
| 1 | User scope | **Small team / one lab.** Multiple named users in one org, no cross-tenant isolation. |
| 2 | Data source | **Laptop upload (current).** Instrument → user laptop → manual upload. Preserves today's ingestion UX. |
| 3 | Sharing | **Just the uploader.** No sharing model, no per-project permission edges. Each user only sees their own data. |
| 4 | Offline mode | **Hybrid.** Browser does preview-grade work offline; durable storage and full-fidelity compute require the server. |

What these constrain:

- **Auth becomes simple but non-optional.** You need per-user accounts (to enforce "just the uploader"), but no sharing UI, no project permissions, no team management. A finished BaaS auth integration is sufficient; bespoke session-issuing is not necessary.
- **Storage is per-user namespaced, not multi-tenant.** Every row keyed by `user_id`, every file stored under a per-user prefix. No tenant boundaries inside the lab. No cross-user queries.
- **The hybrid offline answer locks in the Design Principle below.** Client-side preview pipelines (current code, downgraded resolution) stay as the interactive layer; backend pipelines own the authoritative full-fidelity results. The existing client-side workers are *not* deleted — they become the preview engines.
- **Scale is bounded.** Concurrent users ~1–10, typically one user doing heavy compute at a time. Doesn't justify GPU sizing until profiling proves it.
- **The "just the uploader" answer is the simplification that buys the most.** No share links, no permission UI, no audit log of who saw what. If that ever changes it's a major redesign — worth committing to it now and revisiting only if real demand appears.

---

## Direct Answers to Your Three Questions

**1. "Could I use GitHub Pages to host a backend too?"** — No. GitHub Pages is static-file hosting only; it cannot execute server-side code, run long-lived processes, hold a GPU, or expose a database. Adding a backend means standing up separate infrastructure (a VPS, a cloud VM, a managed container service, a serverless platform, etc.). The static frontend can still live on GitHub Pages and talk to that backend over HTTPS/WebSocket.

**2. "What would need to be moved to the backend?"** — Categorized in *Migration Candidate Buckets* below. Short version: heavy CPU pipelines and large typed-array data are the strongest candidates; chart rendering and UI state stay client-side; the persistence layer (currently localStorage-only) is the awkward middle that depends on whether you're building a single-user or multi-user product.

**3. "Where do I start?"** — With the product shape decided (above), the recommended pilot is **"upload, parse, and store one dataset server-side, per user."** That single pilot establishes, in one tractable scope:

- **Per-user auth** — finishing one of the stubbed BaaS providers (see *Axis D* below) rather than building bespoke
- **Per-user storage namespace** — object storage for the raw DAT file; relational rows for the project / plate / well / indicator tree
- **The canonical wire-format data contract** for project / plate / well / indicator / signal-arrays (the in-memory class shapes in [Models.js](src/components/Models.js) are aspirational; the wire format has to be defined fresh, and this pilot is what forces the definition)
- **Resumable upload** — DAT files are ~500MB; direct single-shot upload is unreliable at that size
- **The end-to-end skeleton** everything else attaches to (auth → upload → parse-on-server → store → list user's datasets → fetch one)

Why this pilot rather than *"server-side full-plate Neural report"*? Because the report pilot implicitly assumes the dataset is *already* server-resident; otherwise every report run uploads ~92MB+. Doing the upload-and-store pilot first makes the report pilot a clean second step instead of a hidden prerequisite.

**Sequence after the pilot:** (a) browser fetches and renders a stored dataset (proves the round-trip and exercises the wire format from the other direction), then (b) full-plate Neural report runs server-side over already-stored data (the second pilot, much easier once the data plane exists).

---

## Design Principle (the reframe before any architecture talk)

Don't think *"move the React contexts to the backend."* Think **three axes**:

1. **Durable scientific state** — uploaded files, parsed datasets, raw + filtered signal arrays, ROIs, analysis results, reports, templates, project metadata. Anything that must survive a refresh, be sharable, or be retrievable later. *This is what server-side storage is for.*
2. **Async compute jobs** — full-plate filter runs, full-plate Neural/Cardiac analyses, full-plate report generation. Long-running, parameterized; results land in (1). *This is what backend workers are for.*
3. **Ephemeral UI state** — selection, modal open/close, hover, slider drafts, zoom/pan, inspector highlight, draft ROI drawing. *This stays browser-side regardless.*

Two consequences this framing forces — every architecture proposal needs to honor both:

- **A backend does not mean a thin frontend.** If every slider drag waits on a server round-trip, the app feels worse than it does today. The correct shape is **hybrid**: client-side preview at degraded resolution for interactive tuning, backend job for the authoritative full-fidelity computation that lands in durable storage. Preserve the browser as the interactive scientific workstation.
- **The canonical data shape is typed arrays, not `{x,y}[]`.** `rawYs` / `filteredYs` (Float64Array) is the load-bearing storage form in [Models.js](src/components/Models.js); the `{x,y}[]` `rawData` / `filteredData` form is a lazy UI adapter materialized only on demand. A backend storage schema should mirror the typed-array shape, not the object-array shape. Wire-format implication: prefer binary or columnar over JSON for signal payloads.

---

# Part I — Discovery & Constraints

## Application Surface Inventory

The app boots through [App.js](src/App.js) → Firebase Auth gate → `DataProvider` → `CombinedComponent` (the post-auth shell). There is **no URL routing**; `react-router-dom` is in `package.json` but unused. Feature navigation is modal-driven.

### Top-level component folders ([src/components/](src/components/))

| Folder | Purpose |
|--------|---------|
| `Auth/` | Firebase email/password login (`Login.js`) |
| `Nav/` | App-wide navigation (`NavBar`, `NavMenu`, `ProfileMenu`) |
| `FileHandling/` | DAT/TXT/CSV/XLSX ingestion, batch processing, demo file picker |
| `Graphing/` | LargeGraph, MiniGraphGrid, Metrics/Heatmap, FilteredData |
| `NeuralAnalysis/` | Spike/burst detection, single-well and full-plate CSV reports |
| `CardiacAnalysis/` | Cardiac waveform analysis, APD metrics |
| `ui/` | Generic primitives (`Modal`, `Button`) |
| `CombinedComponent.js` | Post-auth orchestration shell |
| `Models.js` | Project/plate/well/indicator data classes |

### Major user-facing workflows

1. **Login** → Firebase Auth + Firestore profile lookup (role + permissions bitmask). Dev bypass exists for `uid === "dev-bypass"`.
2. **Load file** → drag-drop / `<input type=file>` → Web Worker parses DAT/TXT → typed-array project tree in `DataContext`.
3. **Filter pipeline** → user picks filters (StaticRatio, DynamicRatio, Smoothing, ControlSubtraction, OutlierRemoval, FlatFieldCorrection) → 1–4 sharded filter workers process all wells.
4. **Visualize** → LargeGraph (per-well time series), MiniGraphGrid (96/384-well overview), Heatmap (metric-per-well grid).
5. **Analyze (permission-gated)** → Neural Analysis modal or Cardiac Analysis modal.
6. **Export** → Per-well/full-plate CSVs, project CSV, preferences JSON, screenshots (html2canvas), Neural templates.

### Modals (one-liners)

- **Filter parameter modals** — `Smoothing`, `StaticRatio`, `DynamicRatio`, `ControlSubtraction`, `OutlierRemoval`, `FlatFieldCorrection` (the filter chain configuration UIs)
- **`BatchProcessing.js`** — multi-file processing dialog (uses `xlsx` library for APD spreadsheets)
- **`NeuralAnalysisModal.js`** — full Neural workbench (graph, peak inspector, distributions, settings)
- **`NeuralReportModal.js` / `NeuralFullPlateReportModal.js`** — single-well and full-plate CSV exports
- **`CardiacAnalysisModal.js`** — Cardiac analysis (well selector, graph, metrics)
- **`Login.js`** — Firebase auth screen

---

## Computation Inventory (what runs on the user's CPU)

### Web Workers ([src/workers/](src/workers/))

| Worker | What it does |
|--------|--------------|
| [extractWorker.js](src/workers/extractWorker.js) + [extractDatParser.js](src/workers/extractDatParser.js) | Streaming DAT binary parse → Float64Array per indicator |
| [filterWorker.js](src/workers/filterWorker.js) + [filterCore.js](src/workers/filterCore.js) | Static/dynamic ratio, smoothing, control subtraction, outlier removal, baseline correction. Sharded across 1–4 worker instances |
| [decimateWorker.js](src/workers/decimateWorker.js) | Downsamples 250K-sample signals for chart rendering |
| [metricsWorker.js](src/workers/metricsWorker.js) | Slope/range/min computation across annotation windows |
| [neuralPipeline.worker.js](src/workers/neuralPipeline.worker.js) | Spike detection (local maxima, base finding, prominence gates, k-means, NMS, min-distance, activity) + burst detection + AUC |
| [neuralReportWorker.worker.js](src/workers/neuralReportWorker.worker.js) | Dormant — would parallelize full-plate report generation |

### Algorithmic categories

- **Signal processing** — mean/median smoothing (TimSort on Float64Array), static/dynamic ratio, rolling min-median baseline correction (`O(n log W)` sorted-window), MAD-based outlier rejection, linear-regression detrend
- **Peak detection** — local maxima with plateau handling, horizontal-line base finding, multi-tier prominence gating, non-maximum suppression, k-means(k=2) on prominence array (~10K–65K elements), symmetry/width gates
- **Burst detection** — linear-sweep clustering (successor to the old O(n²) DBSCAN; `dbscan` package is still in `package.json` but unused)
- **Statistics** — median, MAD, robust σ (0.6745 constant), Freedman–Diaconis histogram binning (log-scale option), quartile interpolation
- **Curve fitting** — linear regression (Neural detrend), quadratic regression (Cardiac)
- **Image work** — `html2canvas` for screenshot capture only; no actual image processing

### Memory-hot paths

- **Typed-array primary storage** — `rawYs` / `filteredYs` as Float64Array; `{x,y}[]` objects materialized lazily via `materializeFilteredData()` only on demand. This pattern is repo-wide and load-bearing.
- **Per-500MB DAT file scale** — ~384 wells × ~2000 samples × ~15 indicators × 8 bytes ≈ **~92MB minimum** held in RAM, plus filtered copies, plus mini-preview decimations. Peak RAM ~100–400MB.
- **Hotspots** — `detectSpikes` allocates a prominence array per well (10K–65K elements); `neuralSmoothing` triples signal length transiently (detrended + detrendedYs + baseline); the full-plate CSV recently hit OOM at well 277/384 before object stripping landed.

### GPU-eligible candidates (flagged; profile first)

These are theoretically parallel — they are not necessarily where you're bottlenecked today:

- Filter pipeline across wells — embarrassingly parallel
- Local-maxima + base finding per well — independent streams
- K-means clustering on prominence arrays
- Rolling-window baseline correction with parallel sliding-window reduction
- **Not GPU-eligible:** chart rendering (canvas 2D only, no WebGL), D3 scale computation

**Caveat — don't jump to GPU first.** Recent pain points haven't been FLOP-bound: the full-plate Neural CSV recently OOM'd at well 277, then allocation-overflow'd on string concatenation. Both are memory-pressure / construction-cost issues, not compute. Other likely culprits before raw FLOPs: `{x,y}[]` materialization on hot paths, repeated full-plate recomputation when a single parameter changes, lazy-cache invalidation. Profile before committing to GPU complexity; a server-side CPU pipeline plus better caching may close most of the gap.

### Backend-readiness debt (flag now, fix before pilot)

Two things in the current code make a backend migration harder than it needs to be:

- **Cardiac pipeline reads `{x,y}[]`, not typed arrays.** [AnalysisProvider.js#L66](src/components/CardiacAnalysis/AnalysisProvider.js#L66) takes `selectedWell.indicators[0].filteredData` (the materialized object-array form), not `filteredYs`. The Neural pipeline already runs on typed arrays end-to-end. Before Cardiac can be a clean backend job, it needs a typed-array refactor parallel to what Neural already has.
- **Project state has no serialization format.** The in-memory model classes ([Models.js](src/components/Models.js)) have no round-trip JSON / DTO / wire format. Defining one is on the critical path for any pilot — and once defined, the same shape is what gets `POST`ed up and `GET`ted back down.

---

## State & Storage Inventory

### React Contexts (7 total)

| Context | File | Holds |
|---------|------|-------|
| `DataContext` | [DataProvider.js](src/providers/DataProvider.js) | Project metadata, wells array, indicators, selection, view flags — **the largest in-memory state** |
| `NeuralSelectionContext` | [contexts/NeuralSelectionContext.jsx](src/components/NeuralAnalysis/contexts/NeuralSelectionContext.jsx) | Selected well, control well, control-pick mode |
| `NeuralSettingsContext` | [contexts/NeuralSettingsContext.jsx](src/components/NeuralAnalysis/contexts/NeuralSettingsContext.jsx) | Spike params, thresholds, smoothing/decimation/outlier flags, burst params |
| `NeuralResultsContext` | [contexts/NeuralResultsContext.jsx](src/components/NeuralAnalysis/contexts/NeuralResultsContext.jsx) | Per-well spikes, bursts, baseline, statistics |
| `NeuralInteractionContext` | [contexts/NeuralInteractionContext.jsx](src/components/NeuralAnalysis/contexts/NeuralInteractionContext.jsx) | Modal-internal UI state |
| `NeuralInspectorContext` | [contexts/NeuralInspectorContext.jsx](src/components/NeuralAnalysis/contexts/NeuralInspectorContext.jsx) | Inspector panel selections, hover state |
| `AnalysisContext` (Cardiac) | [AnalysisProvider.js](src/components/CardiacAnalysis/AnalysisProvider.js) | Cardiac peakResults, APD values, baselines |

### In-memory data shape

```
Project
 ├─ metadata (title, date, instrument, protocol)
 └─ Plate
     └─ Experiment
         └─ Wells[ ]                     ← 96 to 384+
             └─ Indicators[ ]            ← 1–4 per well
                 ├─ rawYs : Float64Array  ← time series
                 ├─ filteredYs : Float64Array
                 ├─ miniRawPoints / miniFilteredPoints   ← ~80-point decimated previews
                 ├─ rawData / filteredData : {x,y}[]     ← materialized on demand
                 └─ APD metrics (Cardiac), spike/burst arrays (Neural)
```

### Persistence (`localStorage` only — no IndexedDB / Dexie / sessionStorage)

| Key | Contents | Size cap |
|-----|----------|----------|
| `waveexplorer.neural.templates` | Neural parameter snapshots ([templateStorage.js](src/components/NeuralAnalysis/templates/templateStorage.js)) | 50 templates |
| Filter/preference JSON | Exported via NavMenu, re-imported manually | n/a (file-based) |

**Not persisted:** loaded plate data, selected wells, ROI lists, control-well choice, analysis results. Refresh = start over.

### Backend touchpoints — wired but not in production

These exist in source but no live service is behind them today (no paid subscriptions, no hosted projects, no real users hitting them). They're TODO-class scaffolding from an earlier exploration:

- **Firebase Auth + Firestore profiles** — `signInWithEmailAndPassword`, `collection(db, "profiles")` query by email ([App.js#L21](src/App.js#L21), [App.js#L38-L51](src/App.js#L38-L51), `Login.js`). Config hardcoded in [firebaseClient.js](src/firebaseClient.js).
- **Supabase Auth** — `signOut`, `updateUser` (password change) in `ProfileMenu.js`. Config in [supabaseClient.js](src/supabaseClient.js).
- **Dev bypass** — `uid === "dev-bypass"` ([App.js#L25-L36](src/App.js#L25-L36)) is the path that's actually exercised; it skips Firestore and stamps in a dummy admin profile.
- **Zero API calls** for plate data, computation, or reports — there is no functional backend at all.

### Hosting & build

- **Build:** Create React App (`react-scripts build`)
- **Deploy:** `gh-pages -d build` → pushes to `gh-pages` branch
- **Homepage:** `"."` (relative paths — portable to any static host)
- **No `.env` file**; no `REACT_APP_*` URL refs; no Node server scripts

---

## File I/O Inventory

### Ingestion

| Format | Parser | Where |
|--------|--------|-------|
| `.dat` (binary) | `DatParser` streaming | [extractDatParser.js](src/workers/extractDatParser.js) — fed via `feed()`, outputs Float64Array |
| `.txt` (tab-delimited) | `txtFileUploader` | [txtFileUploader.js](src/components/FileHandling/txtFileUploader.js) |
| `.csv` (flat-field correction factors) | FileReader + custom CSV parse | [FlatFieldCorrectionModal.js](src/components/Graphing/FilteredData/ParameterModals/FlatFieldCorrectionModal.js) |
| `.xls(x)` (APD batch) | `xlsx` library | [BatchProcessing.js](src/components/FileHandling/BatchProcessing.js) |

### Export

| Output | Where | Mechanism |
|--------|-------|-----------|
| Neural single-well CSV | [NeuralReport.js](src/components/NeuralAnalysis/NeuralReport.js) | Blob + `URL.createObjectURL` |
| Neural full-plate CSV (chunked) | [NeuralFullPlateReport.js](src/components/NeuralAnalysis/NeuralFullPlateReport.js) | Blob from `string[]` chunks (avoids JS string-length cap) |
| Cardiac analysis CSV | [CardiacReport.js](src/components/CardiacAnalysis/CardiacReport.js) | Blob |
| Project report CSV | [NavMenu.js](src/components/Nav/NavMenu.js) | Blob |
| Preferences JSON | NavMenu.js | Blob |
| Neural templates JSON | [templateStorage.js](src/components/NeuralAnalysis/templates/templateStorage.js) | Blob |
| Screenshots (PNG) | [Handlers.js](src/utilities/Handlers.js) | `html2canvas` |

---

## Migration Candidates by Axis

Reorganizing the inventory along the three axes from *Design Principle* above. Items appear in the axis whose intent they serve, not the file they live in. These are **categories**, not recommendations — choosing what to actually move is downstream of the pilot in *Direct Answer #3*.

### Axis A — Durable scientific state (server-stored)

- Uploaded source files (`.dat`, `.txt`, `.csv`, `.xls(x)`)
- Parsed datasets — project / plate / well / indicator tree ([Models.js](src/components/Models.js), [DataProvider.js](src/providers/DataProvider.js))
- Raw signal arrays (Float64Array) and filtered signal arrays
- ROI definitions, control-well selection, parameter snapshots
- Analysis results (Neural spikes/bursts/baselines/statistics; Cardiac peakResults + APDs)
- Generated report artifacts (CSV outputs, parameter snapshots, timestamps)
- Neural templates ([templateStorage.js](src/components/NeuralAnalysis/templates/templateStorage.js)) — graduate from 50-item localStorage to first-class server objects
- Filter and preference snapshots
- Project metadata (title, date, instrument, protocol, operator)
- User identity, roles, project ownership, sharing rules

### Axis B — Async compute jobs (kick off, await, results land in Axis A)

- Full-plate filter runs ([filterWorker.js](src/workers/filterWorker.js) / [filterCore.js](src/workers/filterCore.js))
- Full-plate Neural pipeline ([neuralPipeline.worker.js](src/workers/neuralPipeline.worker.js))
- Full-plate Cardiac pipeline — **after** the typed-array refactor in *Backend-readiness debt*
- Full-plate Neural CSV generation ([NeuralFullPlateReport.js](src/components/NeuralAnalysis/NeuralFullPlateReport.js))
- Batch processing across multiple files ([BatchProcessing.js](src/components/FileHandling/BatchProcessing.js))
- Decimated-trace generation for large signals (currently [decimateWorker.js](src/workers/decimateWorker.js); worth re-evaluating once data lives server-side)

### Axis C — Ephemeral UI state (stays browser-side, period)

- Selection, hover, modal open/close, zoom/pan, inspector highlight
- Slider draft values during a drag (final values get persisted to Axis A)
- Draft ROI drawing
- Chart rendering and custom canvas plugins (`aucFillPlugin`, `paramVizPlugin`)
- D3 heatmap rendering
- Screenshots (`html2canvas`)
- Template editor UI
- **Client-side previews of any Axis B computation** — degraded-resolution local approximation while the authoritative server job runs. This is the load-bearing trick for keeping slider drag interactive in a backend world.

### Axis D — Stubbed BaaS auth (narrowed by the product-shape answers)

Firebase Auth + Firestore profile and Supabase Auth wiring (see *Backend touchpoints — wired but not in production*). With *small team / one lab + just-the-uploader sharing* decided, the choice narrows: **finish ONE BaaS provider** and use it as the managed auth layer (sign-in, session, password reset). The product doesn't need bespoke session-issuing because there's no sharing model to enforce in the auth tier — every backend query just filters by the authenticated user's id.

**Provider lean: Supabase.** It bundles auth + Postgres + object storage in one provider, which lines up cleanly with the upload-and-store pilot (one vendor for all three concerns the pilot needs). Firebase is also viable but would leave you needing separate object storage for DAT files. Whichever you pick, rip the other out before the pilot — the half-finished both-providers state is the worst option regardless of direction.

---

## Next-Round Discovery Questions

These shape the eventual architecture. You don't need to answer all of them on paper before starting — the pilot in *Direct Answer #3* will force several to resolve organically. But every one of them eventually has to be decided.

### Product shape — RESOLVED

Q1–Q4 are answered in *Product Shape (decided this session)* near the top of this document. Recap: small team / one lab; laptop upload; just-the-uploader sharing; hybrid offline.

### Scale

5. **How big are projects, and how many?** A user with 10 DATs of 500MB each is very different from a user with 10,000 DATs.
6. **Concurrent users at peak?** Affects GPU sizing, autoscaling needs, queueing model.
7. **Compute SLA expectations?** Slider drag = sub-100ms preview. Full-plate analysis = 30s acceptable? 5min? Determines whether GPU is necessary or CPU suffices.

### Infrastructure

8. **Where will the backend live?** Self-hosted (lab server, on-prem GPU box) vs cloud (AWS / GCP / Azure / Modal / Replicate). Budget and ops appetite drive this.
9. **GPU access — what's available?** Owned hardware, cloud GPU per-second billing, university HPC allocation? Affects whether GPU-eligible candidates actually pay off.
10. **What's the ops capacity?** Solo developer maintaining it nights/weekends → favor managed services. Team with infra engineer → can run anything.

### Auth and identity

11. **Auth: Supabase or Firebase?** With *Product Shape* settled, finishing one BaaS as the managed auth layer is the right direction (see *Axis D*). The decision narrows to **Supabase** (bundled auth + Postgres + object storage — natural fit for the upload-and-store pilot) vs **Firebase** (auth + Firestore — viable but you'd still need separate object storage for DAT files). Pick one, rip the other out before the pilot.
12. **Role/permission model staying as-is?** The current bitmask (`PERMISSIONS`) controls feature gating; will the backend need to enforce it too?

### Migration path

13. **All at once or incremental?** Big-bang rewrite vs gradual (one Bucket 1 pipeline at a time, behind a feature flag). The codebase is well-modularized — incremental is feasible.
14. **Backwards compatibility with current users' workflows?** Especially: people who export CSVs and depend on column shape.

---

## Verification — How to Sanity-Check This Inventory

**Manual walkthrough:**
1. Use the dev-bypass to enter the app. Confirm the bypass branch is what executes (the Firestore profile query never fires).
2. Drop a DAT file. Watch the network tab — confirm zero network traffic during parsing/filtering/analysis. With the dev-bypass user, total traffic should be essentially zero across the whole session.
3. Open each modal listed under *Application Surface* and confirm it exists and matches the one-liner.
4. Open browser DevTools → Memory → take a heap snapshot after loading a large DAT. Confirm the ~100–400MB range.

**Code-side spot checks:**
- `grep -rn "createContext" src/` — should list the 7 contexts above
- `grep -rn "new Worker(" src/` — should list the active workers
- `grep -rn "fetch\|axios\|XMLHttpRequest" src/` — should turn up only Firebase/Supabase internals, no app-level data API calls
- `ls src/workers/*.js` — should match the worker table
- `grep -rn "localStorage" src/` — should be limited to template storage + a few prefs

---

## Incidental Findings (caught while auditing)

Not part of the migration question, but you'll want them fixed regardless — and a couple are worth resolving *before* a backend pilot so they don't pollute the architecture conversation:

- **`PERMISSIONS.NEURAL` is referenced but undefined.** [permissions.js#L4-L9](src/permissions.js#L4-L9) defines only `BASIC`, `CARDIAC`, `ADMIN`. [NavBar.js#L39-L40](src/components/Nav/NavBar.js#L39-L40) checks `(profile?.permissions & PERMISSIONS.NEURAL) === PERMISSIONS.NEURAL`. Since `PERMISSIONS.NEURAL` is `undefined`, the bitwise AND yields `0`, which never equals `undefined` — so the Neural-permission gate is **always false unless the user is ADMIN**. Either add `NEURAL: 1 << 2` to the bitmask or change the check to ADMIN-only. (This matters more once auth becomes load-bearing.)
- **Dead packages in `package.json`:** `dbscan` (replaced by linear-sweep burst detection) and `react-router-dom` (no client routing). Both can be removed.

---

# Part II — Backend V1 Design

Part I established constraints and current state. Part II designs the V1 backend around those constraints. **Anchoring principle:** design around *datasets, jobs, results, and artifacts*, not around mirroring the current React providers. The providers are how the *frontend* organizes interaction; they are not the backend's data model.

## Backend V1 Target Shape (the anchor — boil this much ocean, no more)

V1 is the smallest end-to-end loop that proves the architecture for one user:

1. User signs in (Supabase auth).
2. User uploads a DAT file (resumable; ~500MB tolerated).
3. Server stores the raw file in object storage under the user's namespace.
4. Server runs the DAT parser (ported from [extractDatParser.js](src/workers/extractDatParser.js)) and persists project / dataset / well / indicator metadata to Postgres, signal arrays to object storage.
5. User can later sign in, browse stored datasets, open one, and the frontend fetches metadata + per-well signal arrays on demand.
6. User can trigger ONE server-side compute job — full-plate Neural report. Job is async, status-tracked, produces a downloadable CSV artifact.
7. Report saved against the dataset with provenance (algorithm version, parameter snapshot, raw file checksum).

**Explicitly NOT in V1:**

- Filter pipeline server-side (still runs client-side for now)
- Cardiac analysis server-side (waits for the typed-array refactor in *Backend-readiness debt*)
- Sharing UI (the *just-the-uploader* answer rules it out)
- Templates server-side (keep in localStorage; revisit later)
- Batch processing, background notifications, comparison across runs

Everything else hangs off this loop once it works.

## Canonical Data Model

Backend entities — defined for backend storage, **not** a copy of [Models.js](src/components/Models.js):

| Entity | Owner | Storage | Key fields |
|--------|-------|---------|------------|
| User | self | Supabase Auth | id, email, created_at, role |
| Project | user | Postgres | id, user_id, name, instrument, protocol, operator, created_at |
| SourceFile | project | object storage + Postgres row | id, project_id, original_filename, size, sha256, upload_state, uploaded_at, storage_path |
| Dataset | source_file | Postgres + object storage | id, source_file_id, plate_layout (96/384), sample_count, time_start, time_end, indicators[], parse_software_version, parsed_at |
| Well | dataset | Postgres | id, dataset_id, row, col, key (e.g. "A1") |
| Indicator | dataset | Postgres | id, dataset_id, name, units |
| SignalArray | well + indicator | object storage; Postgres pointer | id, well_id, indicator_id, dtype (f64), sample_count, t0, dt, storage_path, sha256 |
| ROI | dataset | Postgres | id, dataset_id, x_min, x_max, label, created_at |
| ParameterSet | analysis-run scoped | Postgres JSONB | id, kind (neural/cardiac/filter), params (immutable snapshot), created_at |
| AnalysisRun | dataset | Postgres | id, dataset_id, kind, parameter_set_id, status, algorithm_version, created_by, created_at, completed_at |
| NeuralResult | analysis_run | Postgres JSONB + object storage for arrays | run_id, per_well_metrics, spikes/bursts (Parquet), summary |
| ReportArtifact | analysis_run | object storage + Postgres row | id, run_id, format (csv), storage_path, sha256, size, created_at |

**Design decisions encoded here:**

- **Filtered signal = raw + filter recipe + cached result.** Not a duplicated array. The filter pipeline applies a parameter set to a raw array; results cached in object storage keyed by `sha256(raw) + filter_params_hash`. Saves storage, preserves provenance.
- **Analysis runs are immutable.** A new run for a new parameter set; old runs preserved for comparison. "Compare parameter sets" falls out naturally.
- **ROIs belong to the dataset.** Re-applying ROIs across analysis runs is the common case; run-scoped ROIs would force re-drawing.
- **One dataset has many analysis runs.** This is the whole point of versioned results.
- **No "Plate" or "Experiment" intermediate.** [Models.js](src/components/Models.js) has them; backend flattens to Dataset → Well → Indicator. Restore the layers later only if a real use case appears.

## Signal Storage Format

Postgres holds metadata and pointers; object storage holds numeric arrays. Don't put 500MB Float64Arrays in Postgres rows.

Storage layout under each user's bucket prefix:

```
users/{user_id}/
  source-files/{source_file_id}/raw.dat
  datasets/{dataset_id}/
    signals/{indicator_name}/{well_key}.f64           ← raw signal arrays
    filtered/{filter_hash}/{indicator_name}/{well_key}.f64  ← cached filter results
    results/{run_id}/spikes.parquet
    results/{run_id}/bursts.parquet
    reports/{run_id}/report.csv
```

**V1 on-disk format for signal arrays:** raw binary Float64Array (little-endian). Smallest thing that works. Length comes from Postgres `sample_count`. No header. Frontend fetches a well's array with one ranged GET and casts directly to `Float64Array`.

**When to upgrade to Arrow/Parquet:** when more than one consumer needs the same array (Jupyter, secondary services) or when columnar queries across wells become hot. Not in V1.

**Compression:** none in V1. DAT data is mostly noise above the signal; per-well compression buys ~20–30% at CPU cost on both sides. Skip until storage cost becomes a measured problem.

## Job System

First-class jobs table. Every long-running backend operation goes through it.

```
jobs
  id, user_id, kind (parse | filter | neural_analysis | cardiac_analysis | report),
  status (queued | running | succeeded | failed | cancelled),
  progress (0-100),
  input_refs JSONB (dataset_id, parameter_set_id, ...),
  output_refs JSONB (analysis_run_id, report_artifact_id),
  error_message,
  algorithm_version,
  software_version,
  created_at, started_at, finished_at,
  created_by
```

**V1 job kinds:** `parse` (post-upload) and `neural_analysis` (full-plate, produces a report). Others are V2+ placeholders.

**V1 job runner:** simplest viable — a single background worker process polling the `jobs` table, one job at a time per user. No Redis, no Celery, no SQS. Move to a real queue when concurrency demands it.

**Cancellation:** soft. UI sends `DELETE` on the job; worker checks the row's `status` between phases and bails if `cancelled`. No mid-loop SIGTERM in V1.

**Progress reporting:** worker updates `progress` periodically. Frontend polls `GET /jobs/:id` every 2s while a job is open. SSE / WebSocket push is V2+.

## Preview vs Authoritative Results (architecture rule)

The rule that prevents the backend from making the app feel slow:

| Layer | Where | Fidelity | Persisted? | Latency |
|-------|-------|----------|------------|---------|
| **Client preview** | browser, current workers | reduced (selected well only, decimated, approximate gates) | no | interactive (<100ms slider response) |
| **Server authoritative** | backend job | full-fidelity (all wells, full sample rate, exact algorithm version) | yes (durable, downloadable, comparable) | seconds–minutes (async job) |

**UI rule:** every result is labeled. Live previews show "Preview"; backend results show their run id and timestamp. The user always knows which they're looking at.

**User flow:** drag prominence slider → instant browser update of selected well → click "Run Full-Plate Report" → backend job runs → result lands as saved `AnalysisRun` + `ReportArtifact` → frontend re-labels to saved-result. The browser never waits on the server for slider interactions.

## Result Versioning & Reproducibility

Every saved `AnalysisRun` records enough to answer *"why did this CSV say what it said"* six months later:

- `dataset_id` + raw file `sha256` (exact bytes analyzed)
- `parameter_set_id` → immutable JSONB snapshot of every gate / threshold
- `algorithm_version` — semver tag baked into worker code
- `software_version` — backend service version
- `created_by`, `created_at`
- Filter recipe hash that produced the input (since filtered signals are derived)

This is the single biggest scientific-quality upgrade the backend buys. Today's reports are unreproducible artifacts; tomorrow's are forensically interpretable.

## API Contract

Resource groups (not final endpoints — those land during V1 build):

- **Auth** — managed by Supabase; backend trusts the JWT
- **Projects** — list / create / read / update / delete; user-scoped
- **Source files / uploads** — resumable upload, parse trigger
- **Datasets** — list / read; metadata + indicator + well lists
- **Signals** — binary Float64Array per well per indicator
- **Filters** — server-side cached filter results (V2+)
- **Analysis runs** — list / read for a dataset; kicked off via Jobs
- **Jobs** — submit / poll / cancel
- **Reports** — list / read / download (signed URLs)
- **Templates / settings** — out of V1; stay client-side

V1 endpoint sketch:

```
POST   /uploads                        → start resumable upload
PUT    /uploads/:id/parts/:n           → upload a part
POST   /uploads/:id/complete           → finalize; triggers parse job
GET    /projects                       → list mine
POST   /projects                       → create
GET    /projects/:id/datasets          → list datasets in a project
GET    /datasets/:id                   → metadata + wells + indicators
GET    /datasets/:id/wells/:key/signals?indicator=foo
                                       → binary Float64Array
POST   /jobs                           → kind + input_refs → returns job
GET    /jobs/:id                       → status + progress
DELETE /jobs/:id                       → cancel
GET    /analysis-runs/:id              → run + parameter snapshot + provenance
GET    /reports/:id                    → metadata
GET    /reports/:id/download           → signed URL
```

Every list endpoint implicitly filters by `auth.uid()`.

## Resumable Uploads

DAT files are ~500MB. Single-shot POST is unreliable at that size, especially on lab Wi-Fi.

**V1 approach:** Supabase Storage's resumable upload (tus.io protocol; Supabase has first-class support). The existing client uploader ([extractWorker.js](src/workers/extractWorker.js)) gets a new branch — instead of parsing locally, it streams the file to Supabase, then notifies the backend to start the parse job.

Upload spec for V1:

- Resumable via tus.io / Supabase Storage
- Client computes `sha256` during upload (Web Crypto subtle API), sends on `complete`
- Server verifies received `sha256`; if it matches an existing `SourceFile.sha256` for this user, return the existing row (dedup)
- Max file size: 2GB (headroom)
- Per-user quota: 50GB (configurable; alert at 80%)
- Server-side parse job auto-kicks on upload complete

## Frontend State Redesign

The Design Principle (Part I) split state into 3 axes. The frontend redesign translates that into concrete stores:

| Store | Holds | Implementation |
|-------|-------|----------------|
| **Server cache** | datasets, jobs, analysis runs, reports | **TanStack Query** — replaces the bulk of `DataProvider` for server-resident entities |
| **Local UI state** | selected well, modal open/close, hover, chart zoom/pan, inspector | React Context — much smaller than today's contexts |
| **Draft analysis params** | unsaved slider/settings changes | React Context or component-local state |
| **Preview results** | client-side approximations of server results | Worker-driven, ephemeral, lives next to the chart that uses it |
| **Committed results** | server-saved authoritative results | Fetched via TanStack Query, immutable from the frontend's perspective |

**Migration:** don't rip out existing contexts in one go. The pilot upload-and-store work *adds* a TanStack Query layer for new server resources (projects, datasets, jobs). Existing contexts keep managing what they manage today. Over time, contexts shrink as server-managed entities move to TanStack Query; what's left is real ephemeral UI state.

## Security & Data Ownership

Even with "just the uploader," the backend enforces ownership:

- Every Postgres row has a `user_id` foreign key
- Every list/read endpoint filters by `auth.uid()` — Supabase RLS policies make this declarative
- Object storage paths are private; downloads use short-TTL signed URLs (15 min)
- Server-side validation of file type (don't trust client-claimed MIME) and size (independent of frontend checks)
- React permission bitmask is UI sugar only; backend doesn't trust it
- **One auth provider only.** Pick Supabase. Rip Firebase wiring before the pilot.

**Data sensitivity check:** confirm with stakeholders whether any data is regulated, publication-embargoed, or otherwise sensitive. For an in-vitro signal-analysis lab this is likely "no constraints," but worth confirming not assuming — it affects backups, deletion semantics, audit logging, and hosting region.

## Deployment & Operations

V1 deployment shape — boring stack:

| Concern | V1 choice |
|---------|-----------|
| Backend runtime | Single container (Node or Python — TBD with pilot) |
| Database | Supabase Postgres (managed) |
| Object storage | Supabase Storage (S3-backed) |
| Auth | Supabase Auth |
| Job worker | Same container, separate process (or sidecar) |
| Job queue | Postgres-table polling for V1; upgrade to pg-boss or a proper queue only when needed |
| Hosting | Fly.io / Railway (lab-scale, predictable cost) or a single VPS |
| Logs | Backend host's hosted logs + structured JSON; no separate ELK |
| Backups | Supabase automated daily DB backups; object storage versioning enabled |
| Restores | Tested via runbook (don't ship without one practice restore) |
| Secrets | Backend host env vars; no secrets in the React build |
| Environments | `dev` (local) + `prod` (single deployed instance). No staging in V1 |
| Deploys | `git push` → backend host autodeploys; frontend stays on GitHub Pages |
| Monitoring | Hosted uptime ping; job-failure email or Slack hook |

V1 doesn't need Kubernetes, Redis, or a separate queue service. Add complexity only when measurement justifies it.

## Backend-Enabled Improvements (V2+ roadmap menu)

What V1 unlocks — order roughly by leverage, not commitment:

1. Persistent project library — no more refresh-and-lose-everything
2. Reproducible reports with provenance — answer "why does this CSV say this" six months later
3. Multiple analysis runs per dataset — compare parameter sets head-to-head
4. Server-side full-plate reports without browser memory crashes — OOM and string-allocation bug classes go away by construction
5. Cached filter results — re-applying the same filter recipe to the same raw signal is free
6. Upload once, analyze many — parse amortizes across runs
7. Server-side decimated traces — fast graph loads on huge files
8. Background batch processing — kick off N reports overnight
9. Cross-run histogram aggregation — full-plate distributions built progressively
10. Dataset search and filtering — find that experiment from last March
11. Saved report artifacts with downloadable history — never re-run for same data + params
12. Crash recovery — backend job survives browser closing
13. Background notifications when long jobs finish — email or in-app

This is the menu, not the plan. Sequence them after V1 lands and is in use, based on what's actually painful.

---

## What This Document Is Not

- **Not a built backend.** Part II is a target shape; the V1 implementation is a separate workstream.
- **Not a final cost estimate.** Supabase + a single backend host is the lean; concrete cost depends on storage volume and job runtime — measure once V1 exists.
- **Not a roadmap beyond V1.** *Backend-Enabled Improvements* is the menu, not the plan; sequence them after V1 lands and based on what's actually painful in practice.
- **Not a substitute for measurement.** The GPU caution and the "boring stack" choice both depend on profiling actual hotspots once the backend exists. Don't optimize what hasn't been observed.
