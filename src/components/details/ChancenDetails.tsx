import type { Chancen, Firmen, Ansprechpartner, Leads, Aktivitaeten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface ChancenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Chancen;
  /** N:1-Ziel „Firmen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  firmenList: Firmen[];
  /** Klick auf die Firmen-Relation → overlay.push auf dessen Detail. */
  onOpenFirmen?: (record: Firmen) => void;
  /** N:1-Ziel „Ansprechpartner": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  ansprechpartnerList: Ansprechpartner[];
  /** Klick auf die Ansprechpartner-Relation → overlay.push auf dessen Detail. */
  onOpenAnsprechpartner?: (record: Ansprechpartner) => void;
  /** N:1-Ziel „Leads": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  leadsList: Leads[];
  /** Klick auf die Leads-Relation → overlay.push auf dessen Detail. */
  onOpenLeads?: (record: Leads) => void;
  /** 1:N „Aktivitäten" (chance): VOLLE Liste — der Block filtert auf diesen Record. */
  aktivitaetenList: Aktivitaeten[];
  /** Zeilen-Klick → overlay.push auf das Aktivitaeten-Detail (nie der Edit-Dialog). */
  onOpenAktivitaeten: (record: Aktivitaeten) => void;
  /** Kontextuelles „+": öffnet den Aktivitaeten-Dialog mit diesem Record vorgesetzt. */
  onAddAktivitaeten?: () => void;
}

export function ChancenDetails({
  record,
  firmenList,
  onOpenFirmen,
  ansprechpartnerList,
  onOpenAnsprechpartner,
  leadsList,
  onOpenLeads,
  aktivitaetenList,
  onOpenAktivitaeten,
  onAddAktivitaeten,
}: ChancenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const firmaTarget = firmenList.find(r => r.record_id === extractRecordId(record.fields.firma));
  const ansprechpartnerTarget = ansprechpartnerList.find(r => r.record_id === extractRecordId(record.fields.ansprechpartner));
  const leadTarget = leadsList.find(r => r.record_id === extractRecordId(record.fields.lead));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('chancen', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('chancen', 'phase')} value={record.fields.phase} format="pill" />
        <RecordField label={fieldLabel('chancen', 'vertragsvolumen_jaehrlich')} value={record.fields.vertragsvolumen_jaehrlich} format="text" />
        <RecordField label={fieldLabel('chancen', 'vertragsvolumen_gesamt')} value={record.fields.vertragsvolumen_gesamt} format="text" />
        <RecordField label={fieldLabel('chancen', 'wahrscheinlichkeit')} value={record.fields.wahrscheinlichkeit} format="text" />
        <RecordField label={fieldLabel('chancen', 'abschlussdatum')} value={record.fields.abschlussdatum} format="date" />
        <RecordField label={fieldLabel('chancen', 'abschlussgrund')} value={record.fields.abschlussgrund} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('chancen', 'wettbewerber')} value={record.fields.wettbewerber} format="text" />
        <RecordField label={fieldLabel('chancen', 'auftragsnummer_planungssystem')} value={record.fields.auftragsnummer_planungssystem} format="text" />
        <RecordField label={fieldLabel('chancen', 'bemerkungen')} value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('chancen', 'firma')}
          name={firmaTarget?.fields.firmenname ?? '—'}
          meta={[firmaTarget?.fields.telefon, firmaTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={firmaTarget && onOpenFirmen ? () => onOpenFirmen!(firmaTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('chancen', 'ansprechpartner')}
          name={ansprechpartnerTarget?.fields.vorname ?? '—'}
          meta={[ansprechpartnerTarget?.fields.email, ansprechpartnerTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={ansprechpartnerTarget && onOpenAnsprechpartner ? () => onOpenAnsprechpartner!(ansprechpartnerTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('chancen', 'lead')}
          name={leadTarget?.fields.kampagne ?? '—'}
          meta={[leadTarget?.fields.email, leadTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={leadTarget && onOpenLeads ? () => onOpenLeads!(leadTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('aktivitaeten')}
        items={aktivitaetenList.filter(r => extractRecordId(r.fields.chance) === record.record_id)}
        map={r => ({ name: r.fields.betreff ?? appLabel('aktivitaeten'), meta: r.fields.zeitpunkt })}
        onOpen={onOpenAktivitaeten}
        onAdd={onAddAktivitaeten}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.CHANCEN} recordId={record.record_id} readOnly={!perms.canWrite('chancen')} />
    </>
  );
}
