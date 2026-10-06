/**
 * useKundenstrukturAnlegenFlow — the plumbing of the flow « Kundenstruktur anlegen », generated from the plan.
 *
 * Writes `firmen`: asks `firmenname`, `strukturebene`, `kundenstatus`, `branche`, `umsatzpotenzial`, `kundenmanager_vorname`, `kundenmanager_nachname`, `uebergeordnete_firma`.
Writes `ansprechpartner` (only when the person fills it): asks `vorname`, `nachname`, `position`, `email`, `entscheider`; links `firma` ← the created `firmen`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 3)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useKundenstrukturAnlegenFlow({
 *     steps: { uebergeordnete_firma: 1, firmenname: 2, strukturebene: 2, kundenstatus: 2, branche: 2, umsatzpotenzial: 2, kundenmanager_vorname: 2, kundenmanager_nachname: 2, vorname: 2, nachname: 2, position: 2, email: 2, entscheider: 2 },
 *     items: { uebergeordnete_firma: r => ({ id: r.id, title: fieldText(r, 'firmenname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.uebergeordnete_firma.select} {...flow.pick('uebergeordnete_firma')} />
 *     <Bound form={flow.forms.firmen} name="firmenname" />
 *     <Bound form={flow.forms.firmen} name="strukturebene" />
 *     <Bound form={flow.forms.firmen} name="kundenstatus" />
 *     <Bound form={flow.forms.firmen} name="branche" />
 *     <Bound form={flow.forms.firmen} name="umsatzpotenzial" />
 *     <Bound form={flow.forms.firmen} name="kundenmanager_vorname" />
 *     <Bound form={flow.forms.firmen} name="kundenmanager_nachname" />
 *     <Bound form={flow.forms.ansprechpartner} name="vorname" />
 *     <Bound form={flow.forms.ansprechpartner} name="nachname" />
 *     <Bound form={flow.forms.ansprechpartner} name="position" />
 *     <Bound form={flow.forms.ansprechpartner} name="email" />
 *     <Bound form={flow.forms.ansprechpartner} name="entscheider" />
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
export type KundenstrukturAnlegenFieldKey = 'branche' | 'email' | 'entscheider' | 'firmenname' | 'kundenmanager_nachname' | 'kundenmanager_vorname' | 'kundenstatus' | 'nachname' | 'position' | 'strukturebene' | 'uebergeordnete_firma' | 'umsatzpotenzial' | 'vorname';

export interface KundenstrukturAnlegenForms {
  firmen: StepForm<'firmen'>;
  ansprechpartner: StepForm<'ansprechpartner'>;
}

// Alias so the option generics stay readable.
type Key = KundenstrukturAnlegenFieldKey;

export interface KundenstrukturAnlegenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    uebergeordnete_firma?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"branche": 2, "email": 2, "entscheider": 2, "firmenname": 2, "kundenmanager_nachname": 2, "kundenmanager_vorname": 2, "kundenstatus": 2, "nachname": 2, "position": 2, "strukturebene": 2, "uebergeordnete_firma": 1, "umsatzpotenzial": 2, "vorname": 2};
export const KUNDENSTRUKTURANLEGEN_REVIEW_STEP = 3;

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

export function useKundenstrukturAnlegenFlow(options: KundenstrukturAnlegenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const firmen = useStepForm('firmen', {
    fields: ["firmenname", "strukturebene", "kundenstatus", "branche", "umsatzpotenzial", "kundenmanager_vorname", "kundenmanager_nachname", "uebergeordnete_firma"],
    steps: only(steps, ["firmenname", "strukturebene", "kundenstatus", "branche", "umsatzpotenzial", "kundenmanager_vorname", "kundenmanager_nachname", "uebergeordnete_firma"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["firmenname", "strukturebene", "kundenstatus", "branche", "umsatzpotenzial", "kundenmanager_vorname", "kundenmanager_nachname", "uebergeordnete_firma"]),
    messages: only(options.messages as Record<string, string> | undefined, ["firmenname", "strukturebene", "kundenstatus", "branche", "umsatzpotenzial", "kundenmanager_vorname", "kundenmanager_nachname", "uebergeordnete_firma"]),
  });
  const ansprechpartner = useStepForm('ansprechpartner', {
    fields: ["vorname", "nachname", "position", "email", "entscheider"],
    steps: only(steps, ["vorname", "nachname", "position", "email", "entscheider"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["vorname", "nachname", "position", "email", "entscheider"]),
    messages: only(options.messages as Record<string, string> | undefined, ["vorname", "nachname", "position", "email", "entscheider"]),
  });
  const forms: KundenstrukturAnlegenForms = { firmen, ansprechpartner };
  const formList: StepForm[] = [firmen, ansprechpartner];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    uebergeordnete_firma: useRecordSearch(servicePort, 'firmen', withPickPolicy('uebergeordnete_firma', {
      searchFields: ["firmenname", "ort"] as never,
      toItem: options.items?.uebergeordnete_firma as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:kundenstruktur-anlegen:read:${entity}`);
  const picks = {
    uebergeordnete_firma: { ...searches.uebergeordnete_firma, select: { ...searches.uebergeordnete_firma.select, create: false as boolean, hint: hintFor('uebergeordnete_firma', 'firmen', null as PickWhere | null) } },
  };

  const ansprechpartnerFilled = hasValues(ansprechpartner);
  const plan: PlanStep[] = [
    {
      key: 'firmen', entity: 'firmen', form: firmen, primary: true,    },
    ...(ansprechpartnerFilled ? [{
      key: 'ansprechpartner', entity: 'ansprechpartner', form: ansprechpartner,      needs: ['firmen'],
      link: { firma: 'firmen' },
    } as PlanStep] : []),
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'kundenstruktur-anlegen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: KundenstrukturAnlegenFieldKey) => {
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
  const pickMany = (field: KundenstrukturAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'kundenstruktur-anlegen' as const,
    draftKey: 'kundenstruktur-anlegen' as const,
    entity: 'firmen' as const,
    form: firmen,
    forms, formList, picks, submit, steps,    reviewStep: KUNDENSTRUKTURANLEGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type KundenstrukturAnlegenFlow = ReturnType<typeof useKundenstrukturAnlegenFlow>;
