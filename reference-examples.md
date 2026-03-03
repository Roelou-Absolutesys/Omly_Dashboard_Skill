# Real ThingsBoard Widget JSON Examples (CE 3.9.0 Canon)

This skill references the following real, importable widget JSON examples as canonical structure patterns.

## 1) Platform Health — Card + KPI Tiles (timeseries)
- Source: `atm_details___platform_health.json`
- Why it matters:
  - Demonstrates a clean split of `templateHtml`, `templateCss`, and `controllerScript`.
  - Uses a defensive `update()` flow bound to `self.onDataUpdated`.
  - Shows safe extraction of latest points and tolerant key normalization. :contentReference[oaicite:5]{index=5}

## 2) Hardware Faults — 24h (timeseries)
- Source: `atm_details___hardware_health.json`
- Why it matters:
  - Multi-module tile grid with robust parsing.
  - Demonstrates tolerant handling of TB “point” shapes and avoiding placeholder bucket points. :contentReference[oaicite:6]{index=6}

## 3) Security & Fraud — Heatmap + Tooltip + Threshold Settings (timeseries)
- Source: `atm_details___security___fraud.json`
- Why it matters:
  - Shows widget Settings (`bins`, thresholds, anomaly normalization).
  - Implements a reusable global tooltip instance and safe DOM handling. :contentReference[oaicite:7]{index=7}

## 4) CIT Planner — Modal Workflow + Broadcast Events (latest)
- Source: `atm_cashcit___cit_planner__modal_.json`
- Why it matters:
  - Demonstrates `ctx.subscribeBroadcast(...)` patterns for cross-widget interaction. :contentReference[oaicite:8]{index=8}
  - Demonstrates emitting a structured payload via `ctx.broadcast(...)` for downstream rule chains/backends. :contentReference[oaicite:9]{index=9}

## Documentation anchor
Primary documentation reference for all ThingsBoard concepts:
- https://thingsboard.io/docs/
