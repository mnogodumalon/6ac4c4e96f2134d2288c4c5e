import type { Firmen, Ansprechpartner, Leads, Chancen, Aktivitaeten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface FirmenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Firmen;
  /** N:1-Ziel „Firmen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  firmenList: Firmen[];
  /** Klick auf die Firmen-Relation → overlay.push auf dessen Detail. */
  onOpenFirmen?: (record: Firmen) => void;
  /** 1:N „Ansprechpartner" (firma): VOLLE Liste — der Block filtert auf diesen Record. */
  ansprechpartnerList: Ansprechpartner[];
  /** Zeilen-Klick → overlay.push auf das Ansprechpartner-Detail (nie der Edit-Dialog). */
  onOpenAnsprechpartner: (record: Ansprechpartner) => void;
  /** Kontextuelles „+": öffnet den Ansprechpartner-Dialog mit diesem Record vorgesetzt. */
  onAddAnsprechpartner?: () => void;
  /** 1:N „Leads" (firma): VOLLE Liste — der Block filtert auf diesen Record. */
  leadsList: Leads[];
  /** Zeilen-Klick → overlay.push auf das Leads-Detail (nie der Edit-Dialog). */
  onOpenLeads: (record: Leads) => void;
  /** Kontextuelles „+": öffnet den Leads-Dialog mit diesem Record vorgesetzt. */
  onAddLeads?: () => void;
  /** 1:N „Chancen" (firma): VOLLE Liste — der Block filtert auf diesen Record. */
  chancenList: Chancen[];
  /** Zeilen-Klick → overlay.push auf das Chancen-Detail (nie der Edit-Dialog). */
  onOpenChancen: (record: Chancen) => void;
  /** Kontextuelles „+": öffnet den Chancen-Dialog mit diesem Record vorgesetzt. */
  onAddChancen?: () => void;
  /** 1:N „Aktivitäten" (firma): VOLLE Liste — der Block filtert auf diesen Record. */
  aktivitaetenList: Aktivitaeten[];
  /** Zeilen-Klick → overlay.push auf das Aktivitaeten-Detail (nie der Edit-Dialog). */
  onOpenAktivitaeten: (record: Aktivitaeten) => void;
  /** Kontextuelles „+": öffnet den Aktivitaeten-Dialog mit diesem Record vorgesetzt. */
  onAddAktivitaeten?: () => void;
}

export function FirmenDetails({
  record,
  firmenList,
  onOpenFirmen,
  ansprechpartnerList,
  onOpenAnsprechpartner,
  onAddAnsprechpartner,
  leadsList,
  onOpenLeads,
  onAddLeads,
  chancenList,
  onOpenChancen,
  onAddChancen,
  aktivitaetenList,
  onOpenAktivitaeten,
  onAddAktivitaeten,
}: FirmenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const uebergeordnete_firmaTarget = firmenList.find(r => r.record_id === extractRecordId(record.fields.uebergeordnete_firma));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('firmen', 'firmenname')} value={record.fields.firmenname} format="text" />
        <RecordField label={fieldLabel('firmen', 'strukturebene')} value={record.fields.strukturebene} format="pill" />
        <RecordField label={fieldLabel('firmen', 'branche')} value={record.fields.branche} format="text" />
        <RecordField label={fieldLabel('firmen', 'kundenstatus')} value={record.fields.kundenstatus} format="pill" />
        <RecordField label={fieldLabel('firmen', 'kundennummer_planungssystem')} value={record.fields.kundennummer_planungssystem} format="text" />
        <RecordField label={fieldLabel('firmen', 'umsatzpotenzial')} value={record.fields.umsatzpotenzial} format="text" />
        <RecordField label={fieldLabel('firmen', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('firmen', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('firmen', 'plz')} value={record.fields.plz} format="text" />
        <RecordField label={fieldLabel('firmen', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('firmen', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('firmen', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('firmen', 'website')} value={record.fields.website} format="url" />
        <RecordField label={fieldLabel('firmen', 'kundenmanager_vorname')} value={record.fields.kundenmanager_vorname} format="text" />
        <RecordField label={fieldLabel('firmen', 'kundenmanager_nachname')} value={record.fields.kundenmanager_nachname} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('firmen', 'uebergeordnete_firma')}
          name={uebergeordnete_firmaTarget?.fields.firmenname ?? '—'}
          meta={[uebergeordnete_firmaTarget?.fields.telefon, uebergeordnete_firmaTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={uebergeordnete_firmaTarget && onOpenFirmen ? () => onOpenFirmen!(uebergeordnete_firmaTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('ansprechpartner')}
        items={ansprechpartnerList.filter(r => extractRecordId(r.fields.firma) === record.record_id)}
        map={r => ({ name: r.fields.vorname ?? appLabel('ansprechpartner'), meta: undefined })}
        onOpen={onOpenAnsprechpartner}
        onAdd={onAddAnsprechpartner}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('leads')}
        items={leadsList.filter(r => extractRecordId(r.fields.firma) === record.record_id)}
        map={r => ({ name: r.fields.kampagne ?? appLabel('leads'), meta: r.fields.erfassungsdatum })}
        onOpen={onOpenLeads}
        onAdd={onAddLeads}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('chancen')}
        items={chancenList.filter(r => extractRecordId(r.fields.firma) === record.record_id)}
        map={r => ({ name: r.fields.bezeichnung ?? appLabel('chancen'), meta: r.fields.abschlussdatum })}
        onOpen={onOpenChancen}
        onAdd={onAddChancen}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('aktivitaeten')}
        items={aktivitaetenList.filter(r => extractRecordId(r.fields.firma) === record.record_id)}
        map={r => ({ name: r.fields.betreff ?? appLabel('aktivitaeten'), meta: r.fields.zeitpunkt })}
        onOpen={onOpenAktivitaeten}
        onAdd={onAddAktivitaeten}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.FIRMEN} recordId={record.record_id} readOnly={!perms.canWrite('firmen')} />
    </>
  );
}
