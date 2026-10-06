/**
 * useAktivitaetErfassenFlow — the plumbing of the flow « Aktivität erfassen », generated from the plan.
 *
 * Writes `aktivitaeten`: asks `art`, `zeitpunkt`, `betreff`, `beschreibung`, `ergebnis`, `folgeaufgabe`, `faelligkeit`, `durchgefuehrt_vorname`, `durchgefuehrt_nachname`, `firma`, `ansprechpartner`, `lead`, `chance`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 6)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useAktivitaetErfassenFlow({
 *     steps: { firma: 1, ansprechpartner: 2, lead: 3, chance: 4, art: 5, zeitpunkt: 5, betreff: 5, beschreibung: 5, ergebnis: 5, folgeaufgabe: 5, faelligkeit: 5, durchgefuehrt_vorname: 5, durchgefuehrt_nachname: 5 },
 *     items: { firma: r => ({ id: r.id, title: fieldText(r, 'firmenname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.firma.select} {...flow.pick('firma')} />
 *     <EntitySelectStep {...flow.picks.ansprechpartner.select} {...flow.pick('ansprechpartner')} />
 *     <EntitySelectStep {...flow.picks.lead.select} {...flow.pick('lead')} />
 *     <EntitySelectStep {...flow.picks.chance.select} {...flow.pick('chance')} />
 *     <Bound form={flow.forms.aktivitaeten} name="art" />
 *     <Bound form={flow.forms.aktivitaeten} name="zeitpunkt" />
 *     <Bound form={flow.forms.aktivitaeten} name="betreff" />
 *     <Bound form={flow.forms.aktivitaeten} name="beschreibung" />
 *     <Bound form={flow.forms.aktivitaeten} name="ergebnis" />
 *     <Bound form={flow.forms.aktivitaeten} name="folgeaufgabe" />
 *     <Bound form={flow.forms.aktivitaeten} name="faelligkeit" />
 *     <Bound form={flow.forms.aktivitaeten} name="durchgefuehrt_vorname" />
 *     <Bound form={flow.forms.aktivitaeten} name="durchgefuehrt_nachname" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type AktivitaetErfassenFieldKey = 'ansprechpartner' | 'art' | 'beschreibung' | 'betreff' | 'chance' | 'durchgefuehrt_nachname' | 'durchgefuehrt_vorname' | 'ergebnis' | 'faelligkeit' | 'firma' | 'folgeaufgabe' | 'lead' | 'zeitpunkt';

export interface AktivitaetErfassenForms {
  aktivitaeten: StepForm<'aktivitaeten'>;
}

// Alias so the option generics stay readable.
type Key = AktivitaetErfassenFieldKey;

export interface AktivitaetErfassenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    firma?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    ansprechpartner?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    lead?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    chance?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"ansprechpartner": 2, "art": 5, "beschreibung": 5, "betreff": 5, "chance": 4, "durchgefuehrt_nachname": 5, "durchgefuehrt_vorname": 5, "ergebnis": 5, "faelligkeit": 5, "firma": 1, "folgeaufgabe": 5, "lead": 3, "zeitpunkt": 5};
export const AKTIVITAETERFASSEN_REVIEW_STEP = 6;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useAktivitaetErfassenFlow(options: AktivitaetErfassenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const aktivitaeten = useStepForm('aktivitaeten', {
    fields: ["art", "zeitpunkt", "betreff", "beschreibung", "ergebnis", "folgeaufgabe", "faelligkeit", "durchgefuehrt_vorname", "durchgefuehrt_nachname", "firma", "ansprechpartner", "lead", "chance"],
    steps: only(steps, ["art", "zeitpunkt", "betreff", "beschreibung", "ergebnis", "folgeaufgabe", "faelligkeit", "durchgefuehrt_vorname", "durchgefuehrt_nachname", "firma", "ansprechpartner", "lead", "chance"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["art", "zeitpunkt", "betreff", "beschreibung", "ergebnis", "folgeaufgabe", "faelligkeit", "durchgefuehrt_vorname", "durchgefuehrt_nachname", "firma", "ansprechpartner", "lead", "chance"]),
    messages: only(options.messages as Record<string, string> | undefined, ["art", "zeitpunkt", "betreff", "beschreibung", "ergebnis", "folgeaufgabe", "faelligkeit", "durchgefuehrt_vorname", "durchgefuehrt_nachname", "firma", "ansprechpartner", "lead", "chance"]),
  });
  const forms: AktivitaetErfassenForms = { aktivitaeten };
  const formList: StepForm[] = [aktivitaeten];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    firma: useRecordSearch(servicePort, 'firmen', withPickPolicy('firma', {
      searchFields: ["firmenname", "ort"] as never,
      toItem: options.items?.firma as never,
    })),
    ansprechpartner: useRecordSearch(servicePort, 'ansprechpartner', withPickPolicy('ansprechpartner', {
      searchFields: ["vorname", "nachname"] as never,
      toItem: options.items?.ansprechpartner as never,
    })),
    lead: useRecordSearch(servicePort, 'leads', withPickPolicy('lead', {
      searchFields: ["vorname", "nachname"] as never,
      toItem: options.items?.lead as never,
    })),
    chance: useRecordSearch(servicePort, 'chancen', withPickPolicy('chance', {
      searchFields: ["bezeichnung"] as never,
      filter: "r.v_phase not in ['gewonnen', 'verloren']",
      where: (r: JourneyRecord) => !["gewonnen", "verloren"].includes(fieldLookup(r, "phase")?.key ?? ''),
      toItem: options.items?.chance as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:aktivitaet-erfassen:read:${entity}`);
  const picks = {
    firma: { ...searches.firma, select: { ...searches.firma.select, create: false as boolean, hint: hintFor('firma', 'firmen', null as PickWhere | null) } },
    ansprechpartner: { ...searches.ansprechpartner, select: { ...searches.ansprechpartner.select, create: false as boolean, hint: hintFor('ansprechpartner', 'ansprechpartner', null as PickWhere | null) } },
    lead: { ...searches.lead, select: { ...searches.lead.select, create: true as boolean, hint: hintFor('lead', 'leads', null as PickWhere | null) } },
    chance: { ...searches.chance, select: { ...searches.chance.select, create: true as boolean, hint: hintFor('chance', 'chancen', {"conditions": [{"field": "phase", "op": "not_in", "value": ["gewonnen", "verloren"]}], "mode": "all"} as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'aktivitaeten', entity: 'aktivitaeten', form: aktivitaeten, primary: true,    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'aktivitaet-erfassen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AktivitaetErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: AktivitaetErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'aktivitaet-erfassen' as const,
    draftKey: 'aktivitaet-erfassen' as const,
    entity: 'aktivitaeten' as const,
    form: aktivitaeten,
    forms, formList, picks, submit, steps,    reviewStep: AKTIVITAETERFASSEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type AktivitaetErfassenFlow = ReturnType<typeof useAktivitaetErfassenFlow>;
