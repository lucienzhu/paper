export type EvidenceTier = 'validated' | 'correlation' | 'hypothesis';
export interface EvidenceItem {
  id: string;
  tier: EvidenceTier;
  fields: string[];
  pairs: string[];
  statement: string;
  limits: string;
  source: string;
}
export const registryVersion: string;
export const tiers: Record<EvidenceTier, { label: string; bars: number; rank: number; verb: string; action: string }>;
export const items: EvidenceItem[];
export function item(id: string): EvidenceItem | null;
export function tierOf(ids: string[], changedFields?: string[]): EvidenceTier;
export function relevantCitations(ids: string[], changedFields?: string[], pairs?: string[]): string[];
