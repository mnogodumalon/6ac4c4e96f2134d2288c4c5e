import type { Leads, Firmen, Chancen, Aktivitaeten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface LeadsDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Leads;
  /** N:1-Ziel „Firmen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  firmenList: Firmen[];
  /** Klick auf die Firmen-Relation → overlay.push auf dessen Detail. */
  onOpenFirmen?: (record: Firmen) => void;
  /** 1:N „Chancen" (lead): VOLLE Liste — der Block filtert auf diesen Record. */
  chancenList: Chancen[];
  /** Zeilen-Klick → overlay.push auf das Chancen-Detail (nie der Edit-Dialog). */
  onOpenChancen: (record: Chancen) => void;
  /** Kontextuelles „+": öffnet den Chancen-Dialog mit diesem Record vorgesetzt. */
  onAddChancen?: () => void;
  /** 1:N „Aktivitäten" (lead): VOLLE Liste — der Block filtert auf diesen Record. */
  aktivitaetenList: Aktivitaeten[];
  /** Zeilen-Klick → overlay.push auf das Aktivitaeten-Detail (nie der Edit-Dialog). */
  onOpenAktivitaeten: (record: Aktivitaeten) => void;
  /** Kontextuelles „+": öffnet den Aktivitaeten-Dialog mit diesem Record vorgesetzt. */
  onAddAktivitaeten?: () => void;
}

export function LeadsDetails({
  record,
  firmenList,
  onOpenFirmen,
  chancenList,
  onOpenChancen,
  onAddChancen,
  aktivitaetenList,
  onOpenAktivitaeten,
  onAddAktivitaeten,
}: LeadsDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const firmaTarget = firmenList.find(r => r.record_id === extractRecordId(record.fields.firma));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('leads', 'erfassungsdatum')} value={record.fields.erfassungsdatum} format="date" />
        <RecordField label={fieldLabel('leads', 'herkunft')} value={record.fields.herkunft} format="pill" />
        <RecordField label={fieldLabel('leads', 'kampagne')} value={record.fields.kampagne} format="text" />
        <RecordField label={fieldLabel('leads', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('leads', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('leads', 'firmenname')} value={record.fields.firmenname} format="text" />
        <RecordField label={fieldLabel('leads', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('leads', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('leads', 'interesse')} value={record.fields.interesse} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leads', 'leadstatus')} value={record.fields.leadstatus} format="pill" />
        <RecordField label={fieldLabel('leads', 'bewertung')} value={record.fields.bewertung} format="pill" />
        <RecordField label={fieldLabel('leads', 'disqualifizierungsgrund')} value={record.fields.disqualifizierungsgrund} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('leads', 'verantwortlich_vorname')} value={record.fields.verantwortlich_vorname} format="text" />
        <RecordField label={fieldLabel('leads', 'verantwortlich_nachname')} value={record.fields.verantwortlich_nachname} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('leads', 'firma')}
          name={firmaTarget?.fields.firmenname ?? '—'}
          meta={[firmaTarget?.fields.telefon, firmaTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={firmaTarget && onOpenFirmen ? () => onOpenFirmen!(firmaTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('chancen')}
        items={chancenList.filter(r => extractRecordId(r.fields.lead) === record.record_id)}
        map={r => ({ name: r.fields.bezeichnung ?? appLabel('chancen'), meta: r.fields.abschlussdatum })}
        onOpen={onOpenChancen}
        onAdd={onAddChancen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('aktivitaeten')}
        items={aktivitaetenList.filter(r => extractRecordId(r.fields.lead) === record.record_id)}
        map={r => ({ name: r.fields.betreff ?? appLabel('aktivitaeten'), meta: r.fields.zeitpunkt })}
        onOpen={onOpenAktivitaeten}
        onAdd={onAddAktivitaeten}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.LEADS} recordId={record.record_id} readOnly={!perms.canWrite('leads')} />
    </>
  );
}
