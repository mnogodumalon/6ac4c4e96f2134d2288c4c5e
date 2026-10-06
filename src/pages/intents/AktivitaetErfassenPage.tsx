/**
 * Aktivität erfassen — 3-Schritt-Wizard.
 * Steps: 1) Bezug wählen (Firma, Ansprechpartner, Lead oder Chance) → 2) Art, Zeitpunkt und Betreff → 3) Ergebnis und Folgeaufgabe → Prüfen & anlegen.
 * Reads: firmen, ansprechpartner, leads, chancen. Writes: aktivitaeten (via useAktivitaetErfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, nowIso } from '@/lib/journey';
import { useAktivitaetErfassenFlow } from '@/lib/journey/flows/AktivitaetErfassen';
import { tx } from '@/i18n';

type BezugKey = 'firma' | 'chance' | 'lead' | 'ansprechpartner';

export default function AktivitaetErfassenPage() {
  const [step, setStep] = useState(1);
  const [bezug, setBezug] = useState<BezugKey>('firma');

  const flow = useAktivitaetErfassenFlow({
    steps: {
      firma: 1, ansprechpartner: 1, lead: 1, chance: 1,
      art: 2, zeitpunkt: 2, betreff: 2, beschreibung: 2,
      ergebnis: 3, folgeaufgabe: 3, faelligkeit: 3, durchgefuehrt_vorname: 3, durchgefuehrt_nachname: 3,
    },
    items: {
      firma: r => ({ id: r.id, title: fieldText(r, 'firmenname'), subtitle: fieldText(r, 'ort') }),
      ansprechpartner: (r, ctx) => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: ctx.ref('firma'),
      }),
      lead: (r, ctx) => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: ctx.ref('firma') ?? fieldText(r, 'firmenname'),
      }),
      chance: (r, ctx) => ({ id: r.id, title: fieldText(r, 'bezeichnung'), subtitle: ctx.ref('firma') }),
    },
    initial: { zeitpunkt: nowIso() },
  });

  const f = flow.forms.aktivitaeten;

  const tabs: { key: BezugKey; label: string }[] = [
    { key: 'firma', label: tx('Firma') },
    { key: 'chance', label: tx('Chance') },
    { key: 'lead', label: tx('Lead') },
    { key: 'ansprechpartner', label: tx('Ansprechpartner') },
  ];

  const hasBezug = (['firma', 'chance', 'lead', 'ansprechpartner'] as const).some(k => Boolean(f.get(k)));

  const chips = (['firma', 'chance', 'lead', 'ansprechpartner'] as const)
    .filter(k => Boolean(f.get(k)))
    .map(k => ({ key: k, name: flow.picks[k].labelOf(f.get(k) as string) ?? '' }));

  return (
    <IntentWizardShell
      title={tx('Aktivität erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Anruf, Termin oder E-Mail festhalten und eine Folgeaufgabe planen.'),
        needs: [tx('Firma, Chance oder Lead'), tx('Betreff und Zeitpunkt')],
      }}
    >
      <WizardStep label={tx('Bezug')} description={tx('Zu wem oder was gehört die Aktivität? Wähle mindestens einen Bezug.')}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="tablist">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={bezug === t.key}
                onClick={() => setBezug(t.key)}
                className={`rounded-full border px-4 py-2 text-sm min-h-10 ${
                  bezug === t.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {chips.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {tx('Gewählt')}: {chips.map(c => c.name).filter(Boolean).join(' · ')}
            </p>
          )}
          {bezug === 'firma' && (
            <EntitySelectStep {...flow.picks.firma.select} {...flow.pick('firma')} searchPlaceholder={tx('Firmenname suchen …')} />
          )}
          {bezug === 'chance' && (
            <EntitySelectStep {...flow.picks.chance.select} {...flow.pick('chance')} searchPlaceholder={tx('Bezeichnung suchen …')} />
          )}
          {bezug === 'lead' && (
            <EntitySelectStep {...flow.picks.lead.select} {...flow.pick('lead')} searchPlaceholder={tx('Name suchen …')} />
          )}
          {bezug === 'ansprechpartner' && (
            <EntitySelectStep {...flow.picks.ansprechpartner.select} {...flow.pick('ansprechpartner')} searchPlaceholder={tx('Name suchen …')} />
          )}
          <StepNav
            hideBack
            onNext={() => (hasBezug ? flow.validateStep(1) : tx('Bitte wähle mindestens eine Firma, Chance, einen Lead oder Ansprechpartner.'))}
            nextStepLabel={tx('Art und Zeitpunkt')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Aktivität')} description={tx('Was ist passiert und wann?')}>
        <div className="space-y-4">
          <Bound form={f} name="art" />
          <Bound form={f} name="zeitpunkt" />
          <Bound form={f} name="betreff" />
          <Bound form={f} name="beschreibung" rows={3} />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Ergebnis')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Ergebnis')} description={tx('Ergebnis festhalten und die nächste Aufgabe planen.')}>
        <div className="space-y-4">
          <Bound form={f} name="ergebnis" rows={3} />
          <Bound form={f} name="folgeaufgabe" />
          <Bound form={f} name="faelligkeit" />
          <Bound form={f} name="durchgefuehrt_vorname" />
          <Bound form={f} name="durchgefuehrt_nachname" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Aktivität erscheint sofort beim gewählten Bezug.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Chance weiterführen'), href: '#/intents/chance-phase-wechseln' },
            { label: tx('Lead qualifizieren'), href: '#/intents/lead-qualifizieren' },
            { label: tx('Kundenstruktur anlegen'), href: '#/intents/kundenstruktur-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
