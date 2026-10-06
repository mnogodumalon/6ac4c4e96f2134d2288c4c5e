/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'firmen'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.firmen.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.firmen.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.firmen.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.firmen              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   firmen: firmenname, strukturebene, branche, kundenstatus, kundennummer_planungssystem, umsatzpotenzial, strasse, hausnummer, …  ·  → firmen · ← ansprechpartner (list + contextual +) · ← leads (list + contextual +) · ← chancen (list + contextual +) · ← aktivitaeten (list + contextual +)
 *   ansprechpartner: vorname, nachname, position, email, telefon, mobil, entscheider, firma  ·  → firmen · ← chancen (list + contextual +) · ← aktivitaeten (list + contextual +)
 *   leads: erfassungsdatum, herkunft, kampagne, vorname, nachname, firma, firmenname, email, …  ·  → firmen · ← chancen (list + contextual +) · ← aktivitaeten (list + contextual +)
 *   chancen: bezeichnung, phase, vertragsvolumen_jaehrlich, vertragsvolumen_gesamt, wahrscheinlichkeit, abschlussdatum, abschlussgrund, wettbewerber, …  ·  → firmen · → ansprechpartner · → leads · ← aktivitaeten (list + contextual +)
 *   aktivitaeten: art, zeitpunkt, betreff, beschreibung, ergebnis, folgeaufgabe, faelligkeit, durchgefuehrt_vorname, …  ·  → firmen · → ansprechpartner · → leads · → chancen
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Firmen, Ansprechpartner, Leads, Chancen, Aktivitaeten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichFirmen, enrichAnsprechpartner, enrichLeads, enrichChancen, enrichAktivitaeten } from '@/lib/enrich';
import type { EnrichedFirmen, EnrichedAnsprechpartner, EnrichedLeads, EnrichedChancen, EnrichedAktivitaeten } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { FirmenDialog, type FirmenDialogDefaults } from '@/components/dialogs/FirmenDialog';
import { FirmenDetails } from '@/components/details/FirmenDetails';
import { AnsprechpartnerDialog, type AnsprechpartnerDialogDefaults } from '@/components/dialogs/AnsprechpartnerDialog';
import { AnsprechpartnerDetails } from '@/components/details/AnsprechpartnerDetails';
import { LeadsDialog, type LeadsDialogDefaults } from '@/components/dialogs/LeadsDialog';
import { LeadsDetails } from '@/components/details/LeadsDetails';
import { ChancenDialog, type ChancenDialogDefaults } from '@/components/dialogs/ChancenDialog';
import { ChancenDetails } from '@/components/details/ChancenDetails';
import { AktivitaetenDialog, type AktivitaetenDialogDefaults } from '@/components/dialogs/AktivitaetenDialog';
import { AktivitaetenDetails } from '@/components/details/AktivitaetenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'firmen'; record: EnrichedFirmen }
  | { type: 'ansprechpartner'; record: EnrichedAnsprechpartner }
  | { type: 'leads'; record: EnrichedLeads }
  | { type: 'chancen'; record: EnrichedChancen }
  | { type: 'aktivitaeten'; record: EnrichedAktivitaeten };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  firmen: EntityCrudApi<Firmen, FirmenDialogDefaults>;
  ansprechpartner: EntityCrudApi<Ansprechpartner, AnsprechpartnerDialogDefaults>;
  leads: EntityCrudApi<Leads, LeadsDialogDefaults>;
  chancen: EntityCrudApi<Chancen, ChancenDialogDefaults>;
  aktivitaeten: EntityCrudApi<Aktivitaeten, AktivitaetenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { firmen: EnrichedFirmen[]; ansprechpartner: EnrichedAnsprechpartner[]; leads: EnrichedLeads[]; chancen: EnrichedChancen[]; aktivitaeten: EnrichedAktivitaeten[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [firmenDialog, setFirmenDialog] = useState<{ defaults?: FirmenDialogDefaults; editing?: Firmen } | null>(null);
  const [ansprechpartnerDialog, setAnsprechpartnerDialog] = useState<{ defaults?: AnsprechpartnerDialogDefaults; editing?: Ansprechpartner } | null>(null);
  const [leadsDialog, setLeadsDialog] = useState<{ defaults?: LeadsDialogDefaults; editing?: Leads } | null>(null);
  const [chancenDialog, setChancenDialog] = useState<{ defaults?: ChancenDialogDefaults; editing?: Chancen } | null>(null);
  const [aktivitaetenDialog, setAktivitaetenDialog] = useState<{ defaults?: AktivitaetenDialogDefaults; editing?: Aktivitaeten } | null>(null);
  const enrichedFirmen = useMemo(() => enrichFirmen(data.firmen, { firmenMap: data.firmenMap }), [data.firmen, data.firmenMap]);
  const enrichedAnsprechpartner = useMemo(() => enrichAnsprechpartner(data.ansprechpartner, { firmenMap: data.firmenMap }), [data.ansprechpartner, data.firmenMap]);
  const enrichedLeads = useMemo(() => enrichLeads(data.leads, { firmenMap: data.firmenMap }), [data.leads, data.firmenMap]);
  const enrichedChancen = useMemo(() => enrichChancen(data.chancen, { firmenMap: data.firmenMap, ansprechpartnerMap: data.ansprechpartnerMap, leadsMap: data.leadsMap }), [data.chancen, data.firmenMap, data.ansprechpartnerMap, data.leadsMap]);
  const enrichedAktivitaeten = useMemo(() => enrichAktivitaeten(data.aktivitaeten, { firmenMap: data.firmenMap, ansprechpartnerMap: data.ansprechpartnerMap, leadsMap: data.leadsMap, chancenMap: data.chancenMap }), [data.aktivitaeten, data.firmenMap, data.ansprechpartnerMap, data.leadsMap, data.chancenMap]);

  function detailFirmen(record: Firmen, push = false) {
    const rec = enrichedFirmen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'firmen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitFirmen(fields: Firmen['fields']) {
    const editing = firmenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setFirmen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateFirmenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('firmen')} — ${t('crud_updated')}`, async () => {
        data.setFirmen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateFirmenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createFirmenEntry(fields);
      undoToast(`${appLabel('firmen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAnsprechpartner(record: Ansprechpartner, push = false) {
    const rec = enrichedAnsprechpartner.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'ansprechpartner', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAnsprechpartner(fields: Ansprechpartner['fields']) {
    const editing = ansprechpartnerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAnsprechpartner(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAnsprechpartnerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('ansprechpartner')} — ${t('crud_updated')}`, async () => {
        data.setAnsprechpartner(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAnsprechpartnerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAnsprechpartnerEntry(fields);
      undoToast(`${appLabel('ansprechpartner')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailLeads(record: Leads, push = false) {
    const rec = enrichedLeads.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'leads', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitLeads(fields: Leads['fields']) {
    const editing = leadsDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setLeads(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateLead(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('leads')} — ${t('crud_updated')}`, async () => {
        data.setLeads(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateLead(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createLead(fields);
      undoToast(`${appLabel('leads')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailChancen(record: Chancen, push = false) {
    const rec = enrichedChancen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'chancen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitChancen(fields: Chancen['fields']) {
    const editing = chancenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setChancen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateChancenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('chancen')} — ${t('crud_updated')}`, async () => {
        data.setChancen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateChancenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createChancenEntry(fields);
      undoToast(`${appLabel('chancen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAktivitaeten(record: Aktivitaeten, push = false) {
    const rec = enrichedAktivitaeten.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'aktivitaeten', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAktivitaeten(fields: Aktivitaeten['fields']) {
    const editing = aktivitaetenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAktivitaeten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAktivitaetenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('aktivitaeten')} — ${t('crud_updated')}`, async () => {
        data.setAktivitaeten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAktivitaetenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAktivitaetenEntry(fields);
      undoToast(`${appLabel('aktivitaeten')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <FirmenDialog
        open={firmenDialog !== null}
        onClose={() => setFirmenDialog(null)}
        onSubmit={submitFirmen}
        defaultValues={firmenDialog?.defaults}
        recordId={firmenDialog?.editing?.record_id}
        firmenList={data.firmen}
        enablePhotoScan={AI_PHOTO_SCAN['Firmen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Firmen']}
      />
      <AnsprechpartnerDialog
        open={ansprechpartnerDialog !== null}
        onClose={() => setAnsprechpartnerDialog(null)}
        onSubmit={submitAnsprechpartner}
        defaultValues={ansprechpartnerDialog?.defaults}
        recordId={ansprechpartnerDialog?.editing?.record_id}
        firmenList={data.firmen}
        enablePhotoScan={AI_PHOTO_SCAN['Ansprechpartner']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Ansprechpartner']}
      />
      <LeadsDialog
        open={leadsDialog !== null}
        onClose={() => setLeadsDialog(null)}
        onSubmit={submitLeads}
        defaultValues={leadsDialog?.defaults}
        recordId={leadsDialog?.editing?.record_id}
        firmenList={data.firmen}
        enablePhotoScan={AI_PHOTO_SCAN['Leads']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Leads']}
      />
      <ChancenDialog
        open={chancenDialog !== null}
        onClose={() => setChancenDialog(null)}
        onSubmit={submitChancen}
        defaultValues={chancenDialog?.defaults}
        recordId={chancenDialog?.editing?.record_id}
        firmenList={data.firmen}
        ansprechpartnerList={data.ansprechpartner}
        leadsList={data.leads}
        enablePhotoScan={AI_PHOTO_SCAN['Chancen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Chancen']}
      />
      <AktivitaetenDialog
        open={aktivitaetenDialog !== null}
        onClose={() => setAktivitaetenDialog(null)}
        onSubmit={submitAktivitaeten}
        defaultValues={aktivitaetenDialog?.defaults}
        recordId={aktivitaetenDialog?.editing?.record_id}
        firmenList={data.firmen}
        ansprechpartnerList={data.ansprechpartner}
        leadsList={data.leads}
        chancenList={data.chancen}
        enablePhotoScan={AI_PHOTO_SCAN['Aktivitaeten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aktivitaeten']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'firmen') {
            return (
              <>
                <RecordHeader title={top.record.fields.firmenname ?? appLabel('firmen')} subtitle={undefined} />
                <FirmenDetails
                  record={top.record}
                  firmenList={data.firmen}
                  onOpenFirmen={(r) => detailFirmen(r, true)}
                  ansprechpartnerList={data.ansprechpartner}
                  onOpenAnsprechpartner={(r) => detailAnsprechpartner(r, true)}
                  onAddAnsprechpartner={perms.canWrite('ansprechpartner') ? () => setAnsprechpartnerDialog({ defaults: { firma: createRecordUrl(APP_IDS.FIRMEN, top.record.record_id) } }) : undefined}
                  leadsList={data.leads}
                  onOpenLeads={(r) => detailLeads(r, true)}
                  onAddLeads={perms.canWrite('leads') ? () => setLeadsDialog({ defaults: { firma: createRecordUrl(APP_IDS.FIRMEN, top.record.record_id) } }) : undefined}
                  chancenList={data.chancen}
                  onOpenChancen={(r) => detailChancen(r, true)}
                  onAddChancen={perms.canWrite('chancen') ? () => setChancenDialog({ defaults: { firma: createRecordUrl(APP_IDS.FIRMEN, top.record.record_id) } }) : undefined}
                  aktivitaetenList={data.aktivitaeten}
                  onOpenAktivitaeten={(r) => detailAktivitaeten(r, true)}
                  onAddAktivitaeten={perms.canWrite('aktivitaeten') ? () => setAktivitaetenDialog({ defaults: { firma: createRecordUrl(APP_IDS.FIRMEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'ansprechpartner') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('ansprechpartner')} subtitle={undefined} />
                <AnsprechpartnerDetails
                  record={top.record}
                  firmenList={data.firmen}
                  onOpenFirmen={(r) => detailFirmen(r, true)}
                  chancenList={data.chancen}
                  onOpenChancen={(r) => detailChancen(r, true)}
                  onAddChancen={perms.canWrite('chancen') ? () => setChancenDialog({ defaults: { ansprechpartner: createRecordUrl(APP_IDS.ANSPRECHPARTNER, top.record.record_id) } }) : undefined}
                  aktivitaetenList={data.aktivitaeten}
                  onOpenAktivitaeten={(r) => detailAktivitaeten(r, true)}
                  onAddAktivitaeten={perms.canWrite('aktivitaeten') ? () => setAktivitaetenDialog({ defaults: { ansprechpartner: createRecordUrl(APP_IDS.ANSPRECHPARTNER, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'leads') {
            return (
              <>
                <RecordHeader title={top.record.fields.kampagne ?? appLabel('leads')} subtitle={top.record.fields.erfassungsdatum ? formatDate(top.record.fields.erfassungsdatum) : undefined} />
                <LeadsDetails
                  record={top.record}
                  firmenList={data.firmen}
                  onOpenFirmen={(r) => detailFirmen(r, true)}
                  chancenList={data.chancen}
                  onOpenChancen={(r) => detailChancen(r, true)}
                  onAddChancen={perms.canWrite('chancen') ? () => setChancenDialog({ defaults: { lead: createRecordUrl(APP_IDS.LEADS, top.record.record_id) } }) : undefined}
                  aktivitaetenList={data.aktivitaeten}
                  onOpenAktivitaeten={(r) => detailAktivitaeten(r, true)}
                  onAddAktivitaeten={perms.canWrite('aktivitaeten') ? () => setAktivitaetenDialog({ defaults: { lead: createRecordUrl(APP_IDS.LEADS, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'chancen') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('chancen')} subtitle={top.record.fields.abschlussdatum ? formatDate(top.record.fields.abschlussdatum) : undefined} />
                <ChancenDetails
                  record={top.record}
                  firmenList={data.firmen}
                  onOpenFirmen={(r) => detailFirmen(r, true)}
                  ansprechpartnerList={data.ansprechpartner}
                  onOpenAnsprechpartner={(r) => detailAnsprechpartner(r, true)}
                  leadsList={data.leads}
                  onOpenLeads={(r) => detailLeads(r, true)}
                  aktivitaetenList={data.aktivitaeten}
                  onOpenAktivitaeten={(r) => detailAktivitaeten(r, true)}
                  onAddAktivitaeten={perms.canWrite('aktivitaeten') ? () => setAktivitaetenDialog({ defaults: { chance: createRecordUrl(APP_IDS.CHANCEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'aktivitaeten') {
            return (
              <>
                <RecordHeader title={top.record.fields.betreff ?? appLabel('aktivitaeten')} subtitle={top.record.fields.zeitpunkt ? formatDate(top.record.fields.zeitpunkt) : undefined} />
                <AktivitaetenDetails
                  record={top.record}
                  firmenList={data.firmen}
                  onOpenFirmen={(r) => detailFirmen(r, true)}
                  ansprechpartnerList={data.ansprechpartner}
                  onOpenAnsprechpartner={(r) => detailAnsprechpartner(r, true)}
                  leadsList={data.leads}
                  onOpenLeads={(r) => detailLeads(r, true)}
                  chancenList={data.chancen}
                  onOpenChancen={(r) => detailChancen(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'firmen') return perms.canWrite('firmen');
          if (top.type === 'ansprechpartner') return perms.canWrite('ansprechpartner');
          if (top.type === 'leads') return perms.canWrite('leads');
          if (top.type === 'chancen') return perms.canWrite('chancen');
          if (top.type === 'aktivitaeten') return perms.canWrite('aktivitaeten');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'firmen') setFirmenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'ansprechpartner') setAnsprechpartnerDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'leads') setLeadsDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'chancen') setChancenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'aktivitaeten') setAktivitaetenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    firmen: {
      openCreate: (defaults?: FirmenDialogDefaults) => (perms.canWrite('firmen') ? setFirmenDialog({ defaults }) : refuse()),
      openEdit: (record: Firmen) => (perms.canWrite('firmen') ? setFirmenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Firmen) => detailFirmen(record, false),
      canWrite: perms.canWrite('firmen'),
    },
    ansprechpartner: {
      openCreate: (defaults?: AnsprechpartnerDialogDefaults) => (perms.canWrite('ansprechpartner') ? setAnsprechpartnerDialog({ defaults }) : refuse()),
      openEdit: (record: Ansprechpartner) => (perms.canWrite('ansprechpartner') ? setAnsprechpartnerDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Ansprechpartner) => detailAnsprechpartner(record, false),
      canWrite: perms.canWrite('ansprechpartner'),
    },
    leads: {
      openCreate: (defaults?: LeadsDialogDefaults) => (perms.canWrite('leads') ? setLeadsDialog({ defaults }) : refuse()),
      openEdit: (record: Leads) => (perms.canWrite('leads') ? setLeadsDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Leads) => detailLeads(record, false),
      canWrite: perms.canWrite('leads'),
    },
    chancen: {
      openCreate: (defaults?: ChancenDialogDefaults) => (perms.canWrite('chancen') ? setChancenDialog({ defaults }) : refuse()),
      openEdit: (record: Chancen) => (perms.canWrite('chancen') ? setChancenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Chancen) => detailChancen(record, false),
      canWrite: perms.canWrite('chancen'),
    },
    aktivitaeten: {
      openCreate: (defaults?: AktivitaetenDialogDefaults) => (perms.canWrite('aktivitaeten') ? setAktivitaetenDialog({ defaults }) : refuse()),
      openEdit: (record: Aktivitaeten) => (perms.canWrite('aktivitaeten') ? setAktivitaetenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Aktivitaeten) => detailAktivitaeten(record, false),
      canWrite: perms.canWrite('aktivitaeten'),
    },
    enriched: { firmen: enrichedFirmen, ansprechpartner: enrichedAnsprechpartner, leads: enrichedLeads, chancen: enrichedChancen, aktivitaeten: enrichedAktivitaeten },
  };
}
