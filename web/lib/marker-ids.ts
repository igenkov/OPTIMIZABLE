import { BIOMARKERS } from '@/constants/biomarkers';
import type { MarkerStatus } from '@/types';

const LOWER_NAME_OR_ID_TO_CANONICAL = new Map<string, string>();
for (const b of BIOMARKERS) {
  LOWER_NAME_OR_ID_TO_CANONICAL.set(b.name.trim().toLowerCase(), b.id);
  LOWER_NAME_OR_ID_TO_CANONICAL.set(b.id.trim().toLowerCase(), b.id);
}

/** Known alternate strings (legacy models / PDF labels) */
const LEGACY_ALIASES: Record<string, string> = {
  fasting_glucose: 'glucose',
};

const KNOWN_BIOMARKER_IDS = new Set(BIOMARKERS.map(b => b.id));

/**
 * Map display name, legacy label, or canonical id to `BIOMARKERS` id.
 * Unknown strings are returned unchanged (e.g. lifestyle concern labels).
 */
export function resolveMarkerId(marker: string): string {
  const raw = String(marker ?? '').trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  const alias = LEGACY_ALIASES[lower];
  if (alias) return alias;
  return LOWER_NAME_OR_ID_TO_CANONICAL.get(lower) ?? raw;
}

export function submittedMarkerIdSet(
  markerAnalysis: Array<{ marker: string }> | null | undefined,
): Set<string> {
  const ids = new Set<string>();
  if (!Array.isArray(markerAnalysis)) return ids;
  for (const m of markerAnalysis) {
    const id = resolveMarkerId(m.marker);
    if (id) ids.add(id);
  }
  return ids;
}

/** Keys from stored panel `values` (canonical ids from upload). */
export function submittedIdsFromPanelValues(
  values: Record<string, unknown> | null | undefined,
): Set<string> {
  const ids = new Set<string>();
  if (!values || typeof values !== 'object') return ids;
  for (const key of Object.keys(values)) {
    const id = resolveMarkerId(key);
    if (id) ids.add(id);
  }
  return ids;
}

/** Union: markers in analysis JSON and/or keys present on the submitted bloodwork panel. */
export function mergedSubmittedMarkerIds(
  markerAnalysis: Array<{ marker: string }> | null | undefined,
  panelValues: Record<string, unknown> | null | undefined,
): Set<string> {
  const s = submittedMarkerIdSet(markerAnalysis);
  for (const id of submittedIdsFromPanelValues(panelValues)) s.add(id);
  return s;
}

/** Map legacy model status strings to the three UI tiers. */
export function coerceMarkerStatus(status: string): MarkerStatus {
  if (status === 'optimal' || status === 'suboptimal' || status === 'out_of_range') return status;
  if (status === 'attention' || status === 'address' || status === 'monitor') return 'suboptimal';
  return 'out_of_range';
}

/**
 * Normalize LLM output before persisting: `marker_analysis[].marker` and
 * biomarker-only `concerns[].marker` → canonical ids.
 */
export function normalizePersistedAnalysisMarkers(analysis: Record<string, unknown>): void {
  if (Array.isArray(analysis.marker_analysis)) {
    for (const m of analysis.marker_analysis as Array<Record<string, unknown>>) {
      if (typeof m.marker === 'string') m.marker = resolveMarkerId(m.marker);
    }
  }
  if (Array.isArray(analysis.concerns)) {
    for (const c of analysis.concerns as Array<Record<string, unknown>>) {
      if (typeof c.marker !== 'string') continue;
      const resolved = resolveMarkerId(c.marker);
      if (KNOWN_BIOMARKER_IDS.has(resolved)) c.marker = resolved;
    }
  }
}
