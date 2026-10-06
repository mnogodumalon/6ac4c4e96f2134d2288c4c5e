/**
 * Chance weiterführen — 5-Schritt-Wizard.
 * Steps: 1) Offene Chance wählen → 2) Neue Phase wählen → 3) Bei Gewonnen/Verloren Grund erfassen (nur bei Abschluss)
 *        → 4) Wahrscheinlichkeit und Volumen prüfen → 5) Prüfen & speichern.
 * Reads: chancen (Auswahl, Firma-Name). Writes: chancen (update via useChancePhaseWechselnFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldNumber } from '@/lib/journey';
import { useChancePhaseWechselnFlow } from '@/lib/journey/flows/ChancePhaseWechseln';
import { tx } from '@/i18n';

export default function ChancePhaseWechselnPage() {
  const [step, setStep] = useState(1);
  const flow = useChancePhaseWechselnFlow({
    steps: {
      chancen: 1,
      phase: 2,
      abschlussgrund: 3,
      wettbewerber: 3,
      auftragsnummer_planungssystem: 3,
      wahrscheinlichkeit: 4,
      vertragsvolumen_jaehrlich: 4,
      vertragsvolumen_gesamt: 4,
      abschlussdatum: 4,
    },
    items: {
      chancen: (r, ctx) => {
        const volumen = fieldNumber(r, 'vertragsvolumen_jaehrlich');
        return {
          id: r.id,
          title: fieldText(r, 'bezeichnung'),
          subtitle: [ctx.ref('firma'), volumen != null ? tx`${volumen} € pro Jahr` : null].filter(Boolean).join(' · '),
          status: fieldLookup(r, 'phase') ?? undefined,
        };
      },
    },
  });

  const f = flow.forms.chancen;
  const phase = f.get('phase');
  const closing = phase === 'gewonnen' || phase === 'verloren';
  const won = phase === 'gewonnen';

  return (
    <IntentWizardShell
      title={tx('Chance weiterführen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Bring eine Chance in die nächste Funnel-Phase.'),
        needs: [tx('Die Chance, die du weiterführen willst'), tx('Bei Abschluss: Grund und Volumen')],
      }}
    >
      <WizardStep label={tx('Chance')} description={tx('Welche Chance soll in die nächste Phase?')}>
        <EntitySelectStep
          {...flow.picks.chancen.select}
          {...flow.pick('chancen')}
          searchPlaceholder={tx('Bezeichnung suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Phase')} description={tx('In welcher Phase steht die Chance jetzt?')}>
        <div className="space-y-4">
          <Bound form={f} name="phase" />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => f.validate(['phase'])}
            nextStepLabel={closing ? tx('Abschluss') : tx('Volumen')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Abschluss')}
        enabledIf={closing}
        description={won ? tx('Warum haben wir gewonnen?') : tx('Warum haben wir verloren?')}
      >
        <div className="space-y-4">
          <Bound form={f} name="abschlussgrund" rows={3} />
          {!won && <Bound form={f} name="wettbewerber" />}
          {won && <Bound form={f} name="auftragsnummer_planungssystem" />}
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => f.validate(['abschlussgrund'])}
            nextStepLabel={tx('Volumen')}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Volumen')}
        description={tx('Wahrscheinlichkeit, Volumen und Abschlussdatum prüfen und anpassen.')}
      >
        <div className="space-y-4">
          <Bound form={f} name="wahrscheinlichkeit" hint={tx('In Prozent, 0 bis 100')} />
          <Bound form={f} name="vertragsvolumen_jaehrlich" />
          <Bound form={f} name="vertragsvolumen_gesamt" />
          <Bound form={f} name="abschlussdatum" />
          <StepNav
            onBack={() => setStep(closing ? 3 : 2)}
            onNext={() => flow.validateStep(4)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Chance wird mit der neuen Phase und den geprüften Werten gespeichert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Aktivität erfassen'), href: '#/intents/aktivitaet-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Halte den Stand der Chance mit einer Aktivität fest.')}
        />
      )}
    </IntentWizardShell>
  );
}
