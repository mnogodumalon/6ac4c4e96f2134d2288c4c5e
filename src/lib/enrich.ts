import type { EnrichedAktivitaeten, EnrichedAnsprechpartner, EnrichedChancen, EnrichedFirmen, EnrichedLeads } from '@/types/enriched';
import type { Aktivitaeten, Ansprechpartner, Chancen, Firmen, Leads } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface FirmenMaps {
  firmenMap: Map<string, Firmen>;
}

export function enrichFirmen(
  firmen: Firmen[],
  maps: FirmenMaps
): EnrichedFirmen[] {
  return firmen.map(r => ({
    ...r,
    uebergeordnete_firmaName: resolveDisplay(r.fields.uebergeordnete_firma, maps.firmenMap, 'firmenname'),
  }));
}

interface AnsprechpartnerMaps {
  firmenMap: Map<string, Firmen>;
}

export function enrichAnsprechpartner(
  ansprechpartner: Ansprechpartner[],
  maps: AnsprechpartnerMaps
): EnrichedAnsprechpartner[] {
  return ansprechpartner.map(r => ({
    ...r,
    firmaName: resolveDisplay(r.fields.firma, maps.firmenMap, 'firmenname'),
  }));
}

interface LeadsMaps {
  firmenMap: Map<string, Firmen>;
}

export function enrichLeads(
  leads: Leads[],
  maps: LeadsMaps
): EnrichedLeads[] {
  return leads.map(r => ({
    ...r,
    firmaName: resolveDisplay(r.fields.firma, maps.firmenMap, 'firmenname'),
  }));
}

interface ChancenMaps {
  firmenMap: Map<string, Firmen>;
  ansprechpartnerMap: Map<string, Ansprechpartner>;
  leadsMap: Map<string, Leads>;
}

export function enrichChancen(
  chancen: Chancen[],
  maps: ChancenMaps
): EnrichedChancen[] {
  return chancen.map(r => ({
    ...r,
    firmaName: resolveDisplay(r.fields.firma, maps.firmenMap, 'firmenname'),
    ansprechpartnerName: resolveDisplay(r.fields.ansprechpartner, maps.ansprechpartnerMap, 'vorname', 'nachname'),
    leadName: resolveDisplay(r.fields.lead, maps.leadsMap, 'vorname', 'nachname'),
  }));
}

interface AktivitaetenMaps {
  firmenMap: Map<string, Firmen>;
  ansprechpartnerMap: Map<string, Ansprechpartner>;
  leadsMap: Map<string, Leads>;
  chancenMap: Map<string, Chancen>;
}

export function enrichAktivitaeten(
  aktivitaeten: Aktivitaeten[],
  maps: AktivitaetenMaps
): EnrichedAktivitaeten[] {
  return aktivitaeten.map(r => ({
    ...r,
    firmaName: resolveDisplay(r.fields.firma, maps.firmenMap, 'firmenname'),
    ansprechpartnerName: resolveDisplay(r.fields.ansprechpartner, maps.ansprechpartnerMap, 'vorname', 'nachname'),
    leadName: resolveDisplay(r.fields.lead, maps.leadsMap, 'vorname', 'nachname'),
    chanceName: resolveDisplay(r.fields.chance, maps.chancenMap, 'bezeichnung'),
  }));
}
