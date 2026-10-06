import type { Aktivitaeten, Firmen, Ansprechpartner, Leads, Chancen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface AktivitaetenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Aktivitaeten;
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
  /** N:1-Ziel „Chancen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  chancenList: Chancen[];
  /** Klick auf die Chancen-Relation → overlay.push auf dessen Detail. */
  onOpenChancen?: (record: Chancen) => void;
}

export function AktivitaetenDetails({
  record,
  firmenList,
  onOpenFirmen,
  ansprechpartnerList,
  onOpenAnsprechpartner,
  leadsList,
  onOpenLeads,
  chancenList,
  onOpenChancen,
}: AktivitaetenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const firmaTarget = firmenList.find(r => r.record_id === extractRecordId(record.fields.firma));
  const ansprechpartnerTarget = ansprechpartnerList.find(r => r.record_id === extractRecordId(record.fields.ansprechpartner));
  const leadTarget = leadsList.find(r => r.record_id === extractRecordId(record.fields.lead));
  const chanceTarget = chancenList.find(r => r.record_id === extractRecordId(record.fields.chance));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('aktivitaeten', 'art')} value={record.fields.art} format="pill" />
        <RecordField label={fieldLabel('aktivitaeten', 'zeitpunkt')} value={record.fields.zeitpunkt} format="datetime" />
        <RecordField label={fieldLabel('aktivitaeten', 'betreff')} value={record.fields.betreff} format="text" />
        <RecordField label={fieldLabel('aktivitaeten', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aktivitaeten', 'ergebnis')} value={record.fields.ergebnis} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('aktivitaeten', 'folgeaufgabe')} value={record.fields.folgeaufgabe} format="text" />
        <RecordField label={fieldLabel('aktivitaeten', 'faelligkeit')} value={record.fields.faelligkeit} format="date" />
        <RecordField label={fieldLabel('aktivitaeten', 'durchgefuehrt_vorname')} value={record.fields.durchgefuehrt_vorname} format="text" />
        <RecordField label={fieldLabel('aktivitaeten', 'durchgefuehrt_nachname')} value={record.fields.durchgefuehrt_nachname} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('aktivitaeten', 'firma')}
          name={firmaTarget?.fields.firmenname ?? '—'}
          meta={[firmaTarget?.fields.telefon, firmaTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={firmaTarget && onOpenFirmen ? () => onOpenFirmen!(firmaTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('aktivitaeten', 'ansprechpartner')}
          name={ansprechpartnerTarget?.fields.vorname ?? '—'}
          meta={[ansprechpartnerTarget?.fields.email, ansprechpartnerTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={ansprechpartnerTarget && onOpenAnsprechpartner ? () => onOpenAnsprechpartner!(ansprechpartnerTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('aktivitaeten', 'lead')}
          name={leadTarget?.fields.kampagne ?? '—'}
          meta={[leadTarget?.fields.email, leadTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={leadTarget && onOpenLeads ? () => onOpenLeads!(leadTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('aktivitaeten', 'chance')}
          name={chanceTarget?.fields.bezeichnung ?? '—'}
          meta={[chanceTarget?.fields.wettbewerber, chanceTarget?.fields.auftragsnummer_planungssystem].filter(Boolean).join(' · ') || undefined}
          onClick={chanceTarget && onOpenChancen ? () => onOpenChancen!(chanceTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AKTIVITAETEN} recordId={record.record_id} readOnly={!perms.canWrite('aktivitaeten')} />
    </>
  );
}
