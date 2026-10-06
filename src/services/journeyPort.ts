/**
 * The INTERNAL door of the journey port — authenticated, via LivingAppsService.
 * GENERATED: one lister and one creator per entity. Do not edit.
 *
 *   import { servicePort } from '@/services/journeyPort';
 *
 * Intent pages hand this to `useJourneySubmit` and to shared step blocks. It
 * exposes only list · create · ref — the public subset — so a step written
 * against it also runs on a public page. Undo, edit and delete stay on the
 * page itself (LivingAppsService), never inside a shared step.
 */
import { LivingAppsService, createRecordUrl, type RecordQuery } from '@/services/livingAppsService';
import { toWirePayload, type InternalJourneyPort, type JourneyRecord } from '@/lib/journey/port';
import { buildSearchFilter, byIdFilter, combineFilters } from '@/lib/journey/search';
import type { EntityKey } from '@/lib/journey/rules';

type RawRecord = { record_id: string; fields: Record<string, unknown>; createdat?: string | null };
type RawMutation = { record_id: string; fields?: Record<string, unknown>; created_at?: string | null };

const listers: Record<EntityKey, () => Promise<RawRecord[]>> = {
  'firmen': () => LivingAppsService.getFirmen() as Promise<RawRecord[]>,
  'ansprechpartner': () => LivingAppsService.getAnsprechpartner() as Promise<RawRecord[]>,
  'leads': () => LivingAppsService.getLeads() as Promise<RawRecord[]>,
  'chancen': () => LivingAppsService.getChancen() as Promise<RawRecord[]>,
  'aktivitaeten': () => LivingAppsService.getAktivitaeten() as Promise<RawRecord[]>,
};

/** The query/count half — the REST parameters the plain listers never send. */
const queriers: Record<EntityKey, (q: RecordQuery) => Promise<RawRecord[]>> = {
  'firmen': q => LivingAppsService.queryFirmen(q) as Promise<RawRecord[]>,
  'ansprechpartner': q => LivingAppsService.queryAnsprechpartner(q) as Promise<RawRecord[]>,
  'leads': q => LivingAppsService.queryLeads(q) as Promise<RawRecord[]>,
  'chancen': q => LivingAppsService.queryChancen(q) as Promise<RawRecord[]>,
  'aktivitaeten': q => LivingAppsService.queryAktivitaeten(q) as Promise<RawRecord[]>,
};

const counters: Record<EntityKey, (filter?: string, signal?: AbortSignal) => Promise<number>> = {
  'firmen': (filter, signal) => LivingAppsService.countFirmen(filter, signal),
  'ansprechpartner': (filter, signal) => LivingAppsService.countAnsprechpartner(filter, signal),
  'leads': (filter, signal) => LivingAppsService.countLeads(filter, signal),
  'chancen': (filter, signal) => LivingAppsService.countChancen(filter, signal),
  'aktivitaeten': (filter, signal) => LivingAppsService.countAktivitaeten(filter, signal),
};

const creators: Record<EntityKey, (fields: Record<string, unknown>) => Promise<RawMutation>> = {
  'firmen': fields => LivingAppsService.createFirmenEntry(fields as never),
  'ansprechpartner': fields => LivingAppsService.createAnsprechpartnerEntry(fields as never),
  'leads': fields => LivingAppsService.createLead(fields as never),
  'chancen': fields => LivingAppsService.createChancenEntry(fields as never),
  'aktivitaeten': fields => LivingAppsService.createAktivitaetenEntry(fields as never),
};

const updaters: Record<EntityKey, (id: string, fields: Record<string, unknown>) => Promise<RawMutation>> = {
  'firmen': (id, fields) => LivingAppsService.updateFirmenEntry(id, fields as never),
  'ansprechpartner': (id, fields) => LivingAppsService.updateAnsprechpartnerEntry(id, fields as never),
  'leads': (id, fields) => LivingAppsService.updateLead(id, fields as never),
  'chancen': (id, fields) => LivingAppsService.updateChancenEntry(id, fields as never),
  'aktivitaeten': (id, fields) => LivingAppsService.updateAktivitaetenEntry(id, fields as never),
};

function toJourneyRecord(r: RawRecord): JourneyRecord {
  return { id: r.record_id, fields: r.fields ?? {}, createdAt: r.createdat ?? null };
}

export const servicePort: InternalJourneyPort = {
  door: 'internal',
  async list(entity, opts) {
    // Only a bare list(entity) (or an empty options object) takes the historic
    // load-everything path. ANY explicit option — `limit` included — goes to the
    // server: useRecordSearch's first page of a big entity must not pull the
    // whole table (live 2026-09-02: all 263 employees travelled for a limit-50
    // first page because `limit` alone did not count as a query).
    const usesQuery = !!opts && (opts.search !== undefined || opts.offset !== undefined
      || opts.orderby !== undefined || opts.fields !== undefined || opts.signal !== undefined
      || opts.limit !== undefined || opts.filter !== undefined);
    if (!usesQuery) {
      const rows = await listers[entity]();
      const limited = opts?.limit ? rows.slice(0, opts.limit) : rows;
      return limited.map(toJourneyRecord);
    }
    const filter = combineFilters(opts.filter, opts.search ? buildSearchFilter(opts.search.query, opts.search.fields) : undefined);
    const rows = await queriers[entity]({
      filter, orderby: opts.orderby, limit: opts.limit, offset: opts.offset, fields: opts.fields, signal: opts.signal,
    });
    return rows.map(toJourneyRecord);
  },
  async count(entity, opts) {
    const filter = combineFilters(opts?.filter, opts?.search ? buildSearchFilter(opts.search.query, opts.search.fields) : undefined);
    return counters[entity](filter, opts?.signal);
  },
  async get(entity, id) {
    // One query on the server, not the whole table: `r.id` is the vSQL name
    // of the record id (a live page wrote `r.record_id` and got a 400).
    const rows = await queriers[entity]({ filter: byIdFilter(id), limit: 1 });
    return rows[0] ? toJourneyRecord(rows[0]) : null;
  },
  async create(entity, values) {
    const r = await creators[entity](toWirePayload(entity, values, servicePort));
    return { id: r.record_id, fields: r.fields ?? {}, createdAt: r.created_at ?? null };
  },
  // The same payload rules as create — plain ids in, references shaped here.
  async update(entity, id, values) {
    const r = await updaters[entity](id, toWirePayload(entity, values, servicePort));
    return { id: r.record_id || id, fields: r.fields ?? {}, createdAt: r.created_at ?? null };
  },
  ref: (appId, recordId) => createRecordUrl(appId, recordId),
};
