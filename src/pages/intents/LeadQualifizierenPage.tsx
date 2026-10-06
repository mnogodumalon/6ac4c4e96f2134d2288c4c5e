/**
 * Lead qualifizieren — 4-Schritt-Wizard + Prüfen.
 * Steps: 1) Lead auswählen → 2) Bewertung wählen → 3) Status setzen (qualifiziert / disqualifiziert)
 *        → 4) Grund erfassen (nur bei Disqualifizierung) → Prüfen & speichern.
 * Reads: leads. Writes: leads (update: leadstatus, bewertung, disqualifizierungsgrund).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useLeadQualifizierenFlow } from '@/lib/journey/flows/LeadQualifizieren';
import { tx } from '@/i18n';

export default function LeadQualifizierenPage() {
  const [step, setStep] = useState(1);
  const flow = useLeadQualifizierenFlow({
    steps: { leads: 1, bewertung: 2, leadstatus: 3, disqualifizierungsgrund: 4 },
    items: {
      leads: (r, ctx) => {
        const name = `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim();
        const firma = fieldText(r, 'firmenname') || ctx.ref('firma') || '';
        const interesse = fieldText(r, 'interesse');
        return {
          id: r.id,
          title: name || tx('Lead ohne Namen'),
          subtitle: [firma, fieldLookup(r, 'herkunft')?.label].filter(Boolean).join(' · ') || interesse.slice(0, 60),
          status: fieldLookup(r, 'leadstatus') ?? undefined,
        };
      },
    },
  });

  const lead = flow.forms.leads;
  const disqualifiziert = lead.get('leadstatus') === 'disqualifiziert';

  return (
    <IntentWizardShell
      title={tx('Lead qualifizieren')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Einen Lead bewerten und qualifizieren oder mit Grund disqualifizieren.'),
        needs: [tx('Ein vorhandener Lead')],
      }}
    >
      <WizardStep label={tx('Lead')} heading={tx('Lead auswählen')} description={tx('Welchen Lead möchtest du bewerten?')}>
        <EntitySelectStep
          {...flow.picks.leads.select}
          {...flow.pick('leads')}
          searchPlaceholder={tx('Name oder Firma suchen …')}
        />
      </WizardStep>

      <WizardStep label={tx('Bewertung')} description={tx('Wie vielversprechend ist der Lead?')} needs={['leads']}>
        <Bound form={lead} name="bewertung" allowClear />
        <StepNav onNext={() => lead.validate(['bewertung'])} nextStepLabel={tx('Status')} />
      </WizardStep>

      <WizardStep label={tx('Status')} description={tx('Ist der Lead qualifiziert oder wird er disqualifiziert?')} needs={['leads']}>
        <Bound form={lead} name="leadstatus" />
        <StepNav
          onNext={() => lead.validate(['leadstatus'])}
          nextStepLabel={disqualifiziert ? tx('Grund') : tx('Prüfen')}
        />
      </WizardStep>

      <WizardStep
        label={tx('Grund')}
        description={tx('Warum passt der Lead nicht?')}
        needs={['leadstatus']}
        enabledIf={disqualifiziert}
      >
        <Bound form={lead} name="disqualifizierungsgrund" rows={4} />
        <StepNav
          onNext={() =>
            String(lead.get('disqualifizierungsgrund') ?? '').trim()
              ? lead.validate(['disqualifizierungsgrund'])
              : tx('Bitte einen Grund für die Disqualifizierung angeben.')
          }
          nextStepLabel={tx('Prüfen')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Status und Bewertung des Leads werden sofort aktualisiert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Chance weiterführen'), href: '#/intents/chance-phase-wechseln' },
            { label: tx('Aktivität erfassen'), href: '#/intents/aktivitaet-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
