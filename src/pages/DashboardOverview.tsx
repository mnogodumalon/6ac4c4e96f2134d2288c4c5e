import { useMemo, useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { IconAlertTriangle, IconPlus, IconUserPlus } from '@tabler/icons-react';
import { extractRecordId } from '@/services/livingAppsService';
import { Input } from '@/components/ui/input';
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
  const since = format(subDays(clock, 90), 'yyyy-MM-dd');
  const year = format(clock, 'yyyy');
  const [target, setTarget] = useState<number>(() => {
    const v = Number(localStorage.getItem('vertrieb-jahresziel'));
    return v > 0 ? v : 250000;
  });
  const changeTarget = (v: number) => {
    setTarget(v);
    if (v > 0) localStorage.setItem('vertrieb-jahresziel', String(v));
  };
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

  // Mitarbeitende = Kundenmanager der Firma; Chancen/Aktivitäten werden über die Firma zugeordnet.
  const noOwner = tx('Ohne Zuordnung');
  const team = useMemo(() => {
    const ownerOf = new Map<string, string>();
    data.firmen.forEach(f => {
      const n = `${f.fields.kundenmanager_vorname ?? ''} ${f.fields.kundenmanager_nachname ?? ''}`.trim();
      if (n) ownerOf.set(f.record_id, n);
    });
    const rows = new Map<string, { name: string; won: number; wonCount: number; pipeline: number; weighted: number; acts: number }>();
    const row = (name: string) => {
      let r = rows.get(name);
      if (!r) { r = { name, won: 0, wonCount: 0, pipeline: 0, weighted: 0, acts: 0 }; rows.set(name, r); }
      return r;
    };
    ownerOf.forEach(n => row(n));
    data.chancen.forEach(c => {
      const fid = extractRecordId(c.fields.firma);
      const r = row((fid && ownerOf.get(fid)) || noOwner);
      const vol = c.fields.vertragsvolumen_jaehrlich ?? 0;
      const phase = lookupKey(c.fields.phase) ?? '';
      if (phase === 'gewonnen') {
        if ((c.fields.abschlussdatum ?? year).slice(0, 4) === year) { r.won += vol; r.wonCount += 1; }
      } else if (phase !== 'verloren') {
        r.pipeline += vol;
        r.weighted += vol * ((c.fields.wahrscheinlichkeit ?? 0) / 100);
      }
    });
    data.aktivitaeten.forEach(a => {
      if ((a.fields.zeitpunkt ?? '').slice(0, 10) < since) return;
      const n = `${a.fields.durchgefuehrt_vorname ?? ''} ${a.fields.durchgefuehrt_nachname ?? ''}`.trim();
      if (n) row(n).acts += 1;
    });
    return [...rows.values()]
      .filter(r => r.name !== noOwner || r.won + r.pipeline > 0)
      .sort((a, b) => b.won - a.won || b.weighted - a.weighted);
  }, [data.firmen, data.chancen, data.aktivitaeten, year, since, noOwner]);
  const quota = (won: number) => (target > 0 ? won / target : 0);
  const assigned = team.filter(r => r.name !== noOwner);
  const teamWon = team.reduce((s, r) => s + r.won, 0);
  const teamTarget = target * Math.max(assigned.length, 1);
  const reached = assigned.filter(r => quota(r.won) >= 1).length;
  const behind = assigned.filter(r => quota(r.won) < 0.5);
  const barTone = (q: number) => (q >= 1 ? 'bg-emerald-500' : q >= 0.5 ? 'bg-primary' : 'bg-amber-500');

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
  if (behind.length > 0) {
    context = tx`${nameList(behind.map(r => r.name))} liegt noch unter 50 % des Jahresziels.`;
  } else if (assigned.length > 0 && reached > 0) {
    context = tx`${nameList(assigned.filter(r => quota(r.won) >= 1).map(r => r.name))} hat das Jahresziel erreicht.`;
  } else if (overdue.length > 0) {
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
            <StatStripItem
              title={tx`Zielerfüllung Team ${year}`}
              value={`${Math.round((teamWon / teamTarget) * 100)} %`}
              tone={teamWon >= teamTarget ? 'success' : 'primary'}
            />
            <StatStripItem title={tx('Gewonnen')} value={compactMoney(teamWon)} />
            <StatStripItem title={tx('Ziel erreicht')} value={`${reached} / ${assigned.length}`} tone={reached > 0 ? 'success' : 'default'} />
            <StatStripItem title={tx('Offene Pipeline')} value={compactMoney(yearly)} />
          </StatStrip>
        }
        primary={
          // TODO(widget-gap): no widget shows per-person target progress; hand-built ranking
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div className="min-w-0">
                <h2 className="font-semibold">{tx`Zielerfüllung je Mitarbeiter ${year}`}</h2>
                <p className="text-xs text-muted-foreground">{tx('Gewonnenes Jahresvolumen im Verhältnis zum Ziel, zugeordnet über den Kundenmanager der Firma.')}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{tx('Jahresziel / Person (€)')}</span>
                <Input
                  type="number" min={0} step={10000} value={target}
                  onChange={e => changeTarget(Number(e.target.value))}
                  className="w-32"
                />
              </label>
            </div>
            {team.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{tx('Noch keine Kundenmanager an Firmen hinterlegt.')}</p>
            ) : (
              <ul className="divide-y">
                {team.map((r, i) => {
                  const q = quota(r.won);
                  return (
                    <li key={r.name} className="space-y-2 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="min-w-0 truncate font-medium">{i + 1}. {r.name}</span>
                        <span className="text-sm">
                          <b>{compactMoney(r.won)}</b>
                          <span className="text-muted-foreground"> / {compactMoney(target)} · {Math.round(q * 100)} %</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${barTone(q)}`} style={{ width: `${Math.min(q, 1) * 100}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{tx`${r.wonCount} gewonnen`}</span>
                        <span>{tx`Pipeline ${compactMoney(r.pipeline)} (gewichtet ${compactMoney(r.weighted)})`}</span>
                        <span>{tx`${r.acts} Aktivitäten in 90 Tagen`}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
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
