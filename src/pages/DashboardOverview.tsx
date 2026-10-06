import { useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { IconAlertTriangle, IconPlus, IconUserPlus } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedChancen, EnrichedLeads, EnrichedAktivitaeten } from '@/types/enriched';
import type { Chancen, Leads, Aktivitaeten } from '@/types/app';
import { lookupOption, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { lookupKey, formatDate } from '@/lib/formatters';
import { useClock, gruss, undoToast } from '@/lib/polish';
import { tx, CURRENCY, localeTag } from '@/i18n';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { KanbanWidget, type KanbanCard, type KanbanColumn } from '@/components/widgets/KanbanWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';

const NEXT_PHASE: Record<string, string> = {
  qualifizierung: 'bedarfsanalyse',
  bedarfsanalyse: 'angebot',
  angebot: 'verhandlung',
  verhandlung: 'gewonnen',
};
const NEXT_LEAD: Record<string, string> = { neu: 'kontaktiert', kontaktiert: 'qualifiziert' };
const CLOSED_PHASES = ['gewonnen', 'verloren'];

function compactMoney(v: number) {
  return new Intl.NumberFormat(localeTag(), {
    style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1,
  }).format(v);
}

function nameList(xs: string[]) {
  const names = xs.filter(Boolean);
  const head = names.slice(0, 2).join(' & ');
  return names.length > 2 ? `${head} +${names.length - 2}` : head;
}

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { setChancen, setLeads, setAktivitaeten, fetchAll } = data;
  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');
  const weekEnd = format(addDays(clock, 7), 'yyyy-MM-dd');

  // Phase advance (shared: hero/kanban/overlay footer) — optimistic + Undo.
  const setPhase = (c: Chancen, key: string) => {
    const oldKey = lookupKey(c.fields.phase);
    const patch = (k: string) =>
      setChancen(prev => prev.map(x => x.record_id === c.record_id
        ? { ...x, fields: { ...x.fields, phase: lookupOption('chancen', 'phase', k) } } : x));
    patch(key);
    LivingAppsService.updateChancenEntry(c.record_id, { phase: key }).catch(() => { void fetchAll(); });
    undoToast(tx`${c.fields.bezeichnung ?? ''} — Phase: ${lookupOption('chancen', 'phase', key).label}`, () => {
      if (!oldKey) return;
      patch(oldKey);
      LivingAppsService.updateChancenEntry(c.record_id, { phase: oldKey }).catch(() => { void fetchAll(); });
    });
  };
  const advanceChance = (c: Chancen) => {
    const next = NEXT_PHASE[lookupKey(c.fields.phase) ?? ''];
    if (next) setPhase(c, next);
  };

  const setLeadStatus = (l: Leads, key: string) => {
    const oldKey = lookupKey(l.fields.leadstatus);
    const patch = (k: string) =>
      setLeads(prev => prev.map(x => x.record_id === l.record_id
        ? { ...x, fields: { ...x.fields, leadstatus: lookupOption('leads', 'leadstatus', k) } } : x));
    patch(key);
    LivingAppsService.updateLead(l.record_id, { leadstatus: key }).catch(() => { void fetchAll(); });
    undoToast(tx`${l.fields.vorname ?? ''} ${l.fields.nachname ?? ''} — ${lookupOption('leads', 'leadstatus', key).label}`, () => {
      if (!oldKey) return;
      patch(oldKey);
      LivingAppsService.updateLead(l.record_id, { leadstatus: oldKey }).catch(() => { void fetchAll(); });
    });
  };
  const advanceLead = (l: Leads) => {
    const next = NEXT_LEAD[lookupKey(l.fields.leadstatus) ?? ''];
    if (next) setLeadStatus(l, next);
  };

  // Follow-up done: clear the due date (counter-write restores it).
  const completeFollowUp = (a: Aktivitaeten) => {
    const old = a.fields.faelligkeit;
    const write = (v: string | undefined) => {
      setAktivitaeten(prev => prev.map(x => x.record_id === a.record_id
        ? { ...x, fields: { ...x.fields, faelligkeit: v } } : x));
      LivingAppsService.updateAktivitaetenEntry(a.record_id, { faelligkeit: (v ?? null) as unknown as string })
        .catch(() => { void fetchAll(); });
    };
    write(undefined);
    undoToast(tx`${a.fields.folgeaufgabe ?? ''} — erledigt`, () => write(old));
  };

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'chancen') {
        const next = NEXT_PHASE[lookupKey(top.record.fields.phase) ?? ''];
        return next
          ? { label: tx`Weiter: ${lookupOption('chancen', 'phase', next).label}`, onClick: () => advanceChance(top.record) }
          : undefined;
      }
      if (top.type === 'leads') {
        const next = NEXT_LEAD[lookupKey(top.record.fields.leadstatus) ?? ''];
        return next
          ? { label: tx`Status: ${lookupOption('leads', 'leadstatus', next).label}`, onClick: () => advanceLead(top.record) }
          : undefined;
      }
      return undefined;
    },
  });
  const enrichedChancen: EnrichedChancen[] = crud.enriched.chancen;
  const enrichedLeads: EnrichedLeads[] = crud.enriched.leads;
  const enrichedAkt: EnrichedAktivitaeten[] = crud.enriched.aktivitaeten;
  const enrichedFirmen = crud.enriched.firmen;

  const openChancen = useMemo(
    () => enrichedChancen.filter(c => !CLOSED_PHASES.includes(lookupKey(c.fields.phase) ?? '')),
    [enrichedChancen],
  );
  const overdue = useMemo(
    () => openChancen
      .filter(c => (c.fields.abschlussdatum ?? '').slice(0, 10) !== '' && (c.fields.abschlussdatum ?? '').slice(0, 10) < today)
      .sort((a, b) => (a.fields.abschlussdatum ?? '').localeCompare(b.fields.abschlussdatum ?? '')),
    [openChancen, today],
  );
  const overdueIds = useMemo(() => new Set(overdue.map(c => c.record_id)), [overdue]);

  const yearly = openChancen.reduce((s, c) => s + (c.fields.vertragsvolumen_jaehrlich ?? 0), 0);
  const total = openChancen.reduce((s, c) => s + (c.fields.vertragsvolumen_gesamt ?? 0), 0);

  const phaseColumns: KanbanColumn[] = (LOOKUP_OPTIONS['chancen']?.['phase'] ?? []).map(o => ({ key: o.key, label: o.label }));

  const cards = useMemo<KanbanCard[]>(
    () => [...enrichedChancen]
      .sort((a, b) => (a.fields.abschlussdatum ?? '9999').localeCompare(b.fields.abschlussdatum ?? '9999'))
      .map(c => {
        const phase = lookupKey(c.fields.phase) ?? 'qualifizierung';
        const vol = c.fields.vertragsvolumen_jaehrlich;
        return {
          id: `chance:${c.record_id}`,
          column: phase,
          title: c.fields.bezeichnung ?? c.firmaName,
          subtitle: [c.firmaName, vol != null ? `${compactMoney(vol)} / ${tx('Jahr')}` : '', c.fields.abschlussdatum ? formatDate(c.fields.abschlussdatum) : '']
            .filter(Boolean).join(' · '),
          tone: overdueIds.has(c.record_id) ? 'warning' : phase === 'gewonnen' ? 'success' : 'default',
        };
      }),
    [enrichedChancen, overdueIds],
  );

  const findChance = (id: string) => data.chancen.find(c => c.record_id === id);

  const newLeads = useMemo(() => {
    const rank: Record<string, number> = { heiss: 0, warm: 1, kalt: 2 };
    return enrichedLeads
      .filter(l => lookupKey(l.fields.leadstatus) === 'neu')
      .sort((a, b) =>
        (rank[lookupKey(a.fields.bewertung) ?? ''] ?? 3) - (rank[lookupKey(b.fields.bewertung) ?? ''] ?? 3)
        || (b.fields.erfassungsdatum ?? '').localeCompare(a.fields.erfassungsdatum ?? ''));
  }, [enrichedLeads]);

  const activeLeads = useMemo(
    () => enrichedLeads.filter(l => !['konvertiert', 'disqualifiziert'].includes(lookupKey(l.fields.leadstatus) ?? '')),
    [enrichedLeads],
  );

  const followUps = useMemo(
    () => enrichedAkt
      .filter(a => a.fields.folgeaufgabe && a.fields.faelligkeit && a.fields.faelligkeit.slice(0, 10) <= weekEnd)
      .sort((a, b) => (a.fields.faelligkeit ?? '').localeCompare(b.fields.faelligkeit ?? '')),
    [enrichedAkt, weekEnd],
  );
  const followUpsOverdue = followUps.filter(a => (a.fields.faelligkeit ?? '').slice(0, 10) < today).length;

  const chanceRows = useMemo<ChartRow<EnrichedLeads>[]>(
    () => activeLeads.map(l => ({ id: `lead:${l.record_id}`, data: l })),
    [activeLeads],
  );
  const firmaRows = useMemo<ChartRow<(typeof enrichedFirmen)[number]>[]>(
    () => enrichedFirmen.map(f => ({ id: `firma:${f.record_id}`, data: f })),
    [enrichedFirmen],
  );

  // Context line — names in every branch
  let context: string;
  if (overdue.length > 0) {
    context = tx`${nameList(overdue.map(c => c.fields.bezeichnung ?? c.firmaName))} — erwartetes Abschlussdatum ist verstrichen.`;
  } else if (followUps.length > 0) {
    context = tx`${nameList(followUps.map(a => a.firmaName || (a.fields.betreff ?? '')))}: Folgeaufgaben warten auf dich.`;
  } else if (newLeads.length > 0) {
    context = tx`${nameList(newLeads.map(l => `${l.fields.vorname ?? ''} ${l.fields.nachname ?? ''}`.trim()))} wartet auf den ersten Kontakt.`;
  } else if (openChancen.length > 0) {
    const biggest = [...openChancen].sort((a, b) => (b.fields.vertragsvolumen_jaehrlich ?? 0) - (a.fields.vertragsvolumen_jaehrlich ?? 0))[0];
    context = tx`${biggest.fields.bezeichnung ?? biggest.firmaName} ist die größte offene Chance.`;
  } else {
    context = tx('Lege deine erste Chance oder deinen ersten Lead an.');
  }

  const empty = enrichedChancen.length === 0 && enrichedLeads.length === 0;

  const leadName = (l: EnrichedLeads) => `${l.fields.vorname ?? ''} ${l.fields.nachname ?? ''}`.trim();
  const bewertungWord = (l: EnrichedLeads) => {
    const k = lookupKey(l.fields.bewertung);
    const cls = k === 'heiss' ? 'font-medium text-destructive' : k === 'warm' ? 'font-medium text-amber-600' : 'text-muted-foreground';
    return <span className={cls}>{l.fields.bewertung?.label ?? tx('Unbewertet')}</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crud.leads.canWrite && (
            <Button variant="outline" size="sm" onClick={() => crud.leads.openCreate({ leadstatus: 'neu', erfassungsdatum: today })}>
              <IconUserPlus size={16} className="shrink-0" />{tx('Neuer Lead')}
            </Button>
          )}
          {crud.chancen.canWrite && (
            <Button size="sm" onClick={() => crud.chancen.openCreate({ phase: 'qualifizierung' })}>
              <IconPlus size={16} className="shrink-0" />{tx('Neue Chance')}
            </Button>
          )}
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        hero={overdue.length > 0 ? (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{ label: tx('Chance öffnen'), onClick: () => { const c = findChance(overdue[0].record_id); if (c) crud.chancen.openDetail(c); } }}
          >
            <b>{nameList(overdue.map(c => c.fields.bezeichnung ?? c.firmaName))}</b>{' '}
            {overdue.length === 1
              ? tx`— Abschluss war am ${formatDate(overdue[0].fields.abschlussdatum)} erwartet.`
              : tx`— Abschluss war seit dem ${formatDate(overdue[0].fields.abschlussdatum)} erwartet (${overdue.length} Chancen).`}
          </HeroBanner>
        ) : empty ? (
          <HeroBanner
            icon={<IconUserPlus size={18} />}
            action={{ label: tx('Ersten Lead erfassen'), onClick: () => crud.leads.openCreate({ leadstatus: 'neu', erfassungsdatum: today }) }}
          >
            {tx('Noch keine Daten — starte mit deinem ersten Lead.')}
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatStrip>
            <StatStripItem title={tx('Offene Chancen')} value={openChancen.length} />
            <StatStripItem title={tx('Jährliches Volumen')} value={compactMoney(yearly)} tone="primary" />
            <StatStripItem title={tx('Gesamtvolumen')} value={compactMoney(total)} tone="primary" />
            <StatStripItem
              title={tx('Neue Leads')}
              value={newLeads.length}
              tone={newLeads.length > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            cards={cards}
            columns={phaseColumns}
            defaultCollapsed={['gewonnen', 'verloren']}
            onCardClick={card => { const c = findChance(card.id.split(':')[1] ?? ''); if (c) crud.chancen.openDetail(c); }}
            onCardMove={(cardId, newColumn) => {
              const c = findChance(cardId.split(':')[1] ?? '');
              if (c && lookupKey(c.fields.phase) !== newColumn) setPhase(c, newColumn);
            }}
            onAddCard={crud.chancen.canWrite ? (column => crud.chancen.openCreate({ phase: column })) : undefined}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Fällige Folgeaufgaben')}
              items={followUps.map(a => {
                const late = (a.fields.faelligkeit ?? '').slice(0, 10) < today;
                return {
                  id: a.record_id,
                  title: a.fields.folgeaufgabe ?? a.fields.betreff ?? '',
                  secondLine: (
                    <>
                      <span className={late ? 'font-medium text-destructive' : 'font-medium'}>
                        {late ? tx('Überfällig') : tx('Bald fällig')}
                      </span>
                      <span className="text-muted-foreground"> · {formatDate(a.fields.faelligkeit)}{a.firmaName ? ` · ${a.firmaName}` : ''}</span>
                    </>
                  ),
                  action: { label: tx('✓ Erledigt'), onClick: () => completeFollowUp(a) },
                };
              })}
              onItemClick={id => { const a = data.aktivitaeten.find(x => x.record_id === id); if (a) crud.aktivitaeten.openDetail(a); }}
              empty={{
                text: tx('Keine Folgeaufgaben in den nächsten 7 Tagen.'),
                action: crud.aktivitaeten.canWrite ? { label: tx('Aktivität erfassen'), onClick: () => crud.aktivitaeten.openCreate({}) } : undefined,
              }}
            />
            <WorkList
              title={tx('Unbearbeitete Leads')}
              items={newLeads.map(l => ({
                id: l.record_id,
                title: leadName(l),
                secondLine: (
                  <>
                    {bewertungWord(l)}
                    <span className="text-muted-foreground"> · {l.firmaName || l.fields.firmenname || l.fields.herkunft?.label || ''}</span>
                  </>
                ),
                action: { label: tx('✓ Kontaktiert'), onClick: () => advanceLead(l) },
              }))}
              onItemClick={id => { const l = data.leads.find(x => x.record_id === id); if (l) crud.leads.openDetail(l); }}
              empty={{
                text: tx('Alle Leads sind in Bearbeitung.'),
                action: crud.leads.canWrite ? { label: tx('Neuer Lead'), onClick: () => crud.leads.openCreate({ leadstatus: 'neu', erfassungsdatum: today }) } : undefined,
              }}
            />
            <ChartWidget<EnrichedLeads>
              title={tx('Leads nach Bewertung')}
              rows={chanceRows}
              dimension={{ kind: 'category', accessor: r => r.data.fields.bewertung, label: tx('Bewertung') }}
              tone={seg => (seg.key === 'heiss' ? 'warning' : 'default')}
            />
            <ChartWidget<(typeof enrichedFirmen)[number]>
              title={tx('Kunden nach Kundenstatus')}
              rows={firmaRows}
              dimension={{ kind: 'category', accessor: r => r.data.fields.kundenstatus, label: tx('Kundenstatus') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
