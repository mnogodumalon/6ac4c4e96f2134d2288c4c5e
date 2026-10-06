/**
 * Kundenstruktur anlegen — 3-Schritt-Wizard + Prüfen.
 * Steps: 1) Firma mit Rolle und Kundenstatus anlegen → 2) Übergeordnete Firma wählen → 3) Ersten Ansprechpartner erfassen → 4) Prüfen & anlegen.
 * Reads: firmen (Auswahl der übergeordneten Firma). Writes: firmen, ansprechpartner (via useKundenstrukturAnlegenFlow).
 * Composes: IntentWizardShell, Bound, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useKundenstrukturAnlegenFlow } from '@/lib/journey/flows/KundenstrukturAnlegen';
import { tx } from '@/i18n';

export default function KundenstrukturAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useKundenstrukturAnlegenFlow({
    steps: {
      firmenname: 1, strukturebene: 1, kundenstatus: 1, branche: 1, umsatzpotenzial: 1,
      kundenmanager_vorname: 1, kundenmanager_nachname: 1,
      uebergeordnete_firma: 2,
      vorname: 3, nachname: 3, position: 3, email: 3, entscheider: 3,
    },
    items: {
      uebergeordnete_firma: r => ({
        id: r.id,
        title: fieldText(r, 'firmenname'),
        subtitle: [fieldLookup(r, 'strukturebene')?.label, fieldText(r, 'ort')].filter(Boolean).join(' · '),
      }),
    },
  });
  const firmen = flow.forms.firmen;
  const partner = flow.forms.ansprechpartner;

  return (
    <IntentWizardShell
      title={tx('Kundenstruktur anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Firma in die Hierarchie einordnen und den ersten Ansprechpartner anlegen.'),
        needs: [tx('Firmenname'), tx('Kundenstatus'), tx('Name des Ansprechpartners')],
      }}
    >
      <WizardStep label={tx('Firma')} description={tx('Name, Rolle in der Struktur und Kundenstatus der neuen Firma.')}>
        <div className="space-y-4">
          <Bound form={firmen} name="firmenname" />
          <Bound form={firmen} name="strukturebene" allowClear />
          <Bound form={firmen} name="kundenstatus" />
          <Bound form={firmen} name="branche" />
          <Bound form={firmen} name="umsatzpotenzial" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Bound form={firmen} name="kundenmanager_vorname" />
            <Bound form={firmen} name="kundenmanager_nachname" />
          </div>
          <StepNav onNext={() => flow.validateStep(1)} nextStepLabel={tx('Übergeordnete Firma')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Übergeordnete Firma')} description={tx('Wohin gehört die Firma in der Hierarchie? Ohne Auswahl bleibt sie eigenständig.')}>
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.uebergeordnete_firma.select}
            {...flow.pick('uebergeordnete_firma')}
            searchPlaceholder={tx('Firmenname suchen …')}
          />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Ansprechpartner')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Ansprechpartner')} description={tx('Der erste Kontakt bei der neuen Firma.')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Bound form={partner} name="vorname" />
            <Bound form={partner} name="nachname" />
          </div>
          <Bound form={partner} name="position" />
          <Bound form={partner} name="email" />
          <Bound form={partner} name="entscheider" />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Firma wird angelegt und der Ansprechpartner direkt mit ihr verknüpft.')}
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
        />
      )}
    </IntentWizardShell>
  );
}
