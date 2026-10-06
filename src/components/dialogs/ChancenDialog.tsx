/**
 * ChancenDialog — pre-generated create/edit dialog for Chancen.
 *
 * Props: open, onClose, onSubmit(fields) => Promise<void>, defaultValues?,
 * recordId? (pass when EDITING — enables the attachments section),
 * firmenList (full hook array — resolves the Firmen applookup),
 * ansprechpartnerList (full hook array — resolves the Ansprechpartner applookup),
 * leadsList (full hook array — resolves the Leads applookup),
 * enablePhotoScan?, enablePhotoLocation?.
 *
 * defaultValues is SHAPE-TOLERANT and its prop type is the EXPORTED
 * ChancenDialogDefaults — NOT the entity field type: lookup fields accept
 * the bare KEY string (or LookupValue), applookup fields the bare record id
 * (or record URL); the dialog normalizes. Type prefill STATE with the export:
 *  ❌ useState<Partial<Chancen['fields']>>({ … })   // LookupValue fields reject string prefills (TS2322)
 *  ✓ useState<ChancenDialogDefaults | undefined>(undefined)
 */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { Chancen, Firmen, Ansprechpartner, Leads, LookupValue } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile, LivingAppsService } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ComputedContext } from '@/config/form-enhancements/types';
import { applyFieldOrder, flattenFieldOrder, applyDefaults, evalComputed, numberInputProps, clampNumberValue, classifyComputed, extractApplookupRefs, mergeApplookupRefs, resolveApplookupRef } from '@/config/form-enhancements/types';
import { formEnhancements, computedDeps, computedApplookupRefs } from '@/config/form-enhancements/Chancen';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { requiredMessage } from '@/lib/journey/messages';
import { t, appLabel, fieldLabel, lookupLabel, localeTag, CURRENCY } from '@/i18n';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/Combobox';
import { FirmenDialog } from '@/components/dialogs/FirmenDialog';
import { AnsprechpartnerDialog } from '@/components/dialogs/AnsprechpartnerDialog';
import { LeadsDialog } from '@/components/dialogs/LeadsDialog';
import { DatePicker } from '@/components/DatePicker';
import { Checkbox } from '@/components/ui/checkbox';
import { IconAlertCircle, IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

/** Widened prefill type for ChancenDialog.defaultValues — see file header. */
export type ChancenDialogDefaults = Omit<Chancen['fields'], 'phase'> & {
    phase?: LookupValue | string;
  };

interface ChancenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Chancen['fields']) => Promise<void>;
  /** SHAPE-TOLERANT: lookup fields accept the bare key (string) or the
   *  LookupValue object; applookup fields the bare record id or the full
   *  record URL — the dialog normalizes both. */
  defaultValues?: ChancenDialogDefaults;
  /** Record id when editing — enables the attachments section. Omit on create. */
  recordId?: string;
  firmenList: Firmen[];
  ansprechpartnerList: Ansprechpartner[];
  leadsList: Leads[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

// defaultValues are SHAPE-TOLERANT: the dialog resolves bare lookup keys via
// its own options and bare record ids via the field's target app — consumers
// never carry the LookupValue/record-URL shape in their head.
const NORMALIZE_LOOKUPS: Record<string, readonly { key: string; label: string }[]> = {
  phase: LOOKUP_OPTIONS['chancen']?.['phase'] ?? [],
};
const NORMALIZE_APPLOOKUPS: Record<string, string> = {
  firma: APP_IDS.FIRMEN,
  ansprechpartner: APP_IDS.ANSPRECHPARTNER,
  lead: APP_IDS.LEADS,
};
function normalizeDefaults(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [k, opts] of Object.entries(NORMALIZE_LOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string') out[k] = opts.find(o => o.key === v) ?? { key: v, label: v };
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' ? opts.find(o => o.key === x) ?? { key: x, label: x } : x));
  }
  for (const [k, appId] of Object.entries(NORMALIZE_APPLOOKUPS)) {
    const v = out[k];
    if (typeof v === 'string' && v !== '' && !v.startsWith('http')) out[k] = createRecordUrl(appId, v);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === 'string' && x !== '' && !x.startsWith('http') ? createRecordUrl(appId, x) : x));
  }
  return out;
}

export function ChancenDialog({ open, onClose, onSubmit, defaultValues, recordId, firmenList, ansprechpartnerList, leadsList, enablePhotoScan = true, enablePhotoLocation = true }: ChancenDialogProps) {
  const [fields, setFields] = useState<Partial<Chancen['fields']>>({});
  const [saving, setSaving] = useState(false);
  const normalizedDefaults = useMemo<Record<string, unknown> | undefined>(
    () => (defaultValues ? normalizeDefaults(defaultValues as Record<string, unknown>) : undefined),
    [defaultValues],
  );
  // Dirty-tracking: in edit-mode the Speichern button is disabled until the
  // user actually changes something. JSON.stringify is good enough for our
  // fields (plain values + LookupValue objects + string arrays).
  const isDirty = useMemo(() => {
    if (!normalizedDefaults) return true;  // create-mode: always allow submit
    try {
      return JSON.stringify(fields) !== JSON.stringify(normalizedDefaults);
    } catch {
      return true;
    }
  }, [fields, normalizedDefaults]);
  // Inline-Create state for "Firmen" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraFirmen` list, and select it in
  // the originating Combobox via the captured `createFirmenField`.
  const [createFirmenOpen, setCreateFirmenOpen] = useState(false);
  const [createFirmenInitial, setCreateFirmenInitial] = useState('');
  const [createFirmenField, setCreateFirmenField] = useState<string>('');
  const [extraFirmen, setExtraFirmen] = useState< Firmen[]>([]);
  const firmenListAll = useMemo(
    () => [...firmenList, ...extraFirmen],
    [firmenList, extraFirmen],
  );
  function openCreateFirmen(fieldKey: string, q: string) {
    setCreateFirmenField(fieldKey);
    setCreateFirmenInitial(q);
    setCreateFirmenOpen(true);
  }
  // Inline-Create state for "Ansprechpartner" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraAnsprechpartner` list, and select it in
  // the originating Combobox via the captured `createAnsprechpartnerField`.
  const [createAnsprechpartnerOpen, setCreateAnsprechpartnerOpen] = useState(false);
  const [createAnsprechpartnerInitial, setCreateAnsprechpartnerInitial] = useState('');
  const [createAnsprechpartnerField, setCreateAnsprechpartnerField] = useState<string>('');
  const [extraAnsprechpartner, setExtraAnsprechpartner] = useState< Ansprechpartner[]>([]);
  const ansprechpartnerListAll = useMemo(
    () => [...ansprechpartnerList, ...extraAnsprechpartner],
    [ansprechpartnerList, extraAnsprechpartner],
  );
  function openCreateAnsprechpartner(fieldKey: string, q: string) {
    setCreateAnsprechpartnerField(fieldKey);
    setCreateAnsprechpartnerInitial(q);
    setCreateAnsprechpartnerOpen(true);
  }
  // Inline-Create state for "Leads" target. The dropdown's
  // "+ Neuer …" option opens a sub-dialog; on submit we POST, add the new
  // record to the local `extraLeads` list, and select it in
  // the originating Combobox via the captured `createLeadsField`.
  const [createLeadsOpen, setCreateLeadsOpen] = useState(false);
  const [createLeadsInitial, setCreateLeadsInitial] = useState('');
  const [createLeadsField, setCreateLeadsField] = useState<string>('');
  const [extraLeads, setExtraLeads] = useState< Leads[]>([]);
  const leadsListAll = useMemo(
    () => [...leadsList, ...extraLeads],
    [leadsList, extraLeads],
  );
  function openCreateLeads(fieldKey: string, q: string) {
    setCreateLeadsField(fieldKey);
    setCreateLeadsInitial(q);
    setCreateLeadsOpen(true);
  }
  // Fields the plan assigns to a tool (empty without a plan).
  const SYSTEM_ASSIGNED: string[] = [];
  const [showErrors, setShowErrors] = useState(false);
  const REQUIRED_FIELDS = ['bezeichnung', 'phase', 'firma'] as const;
  const missingRequired = REQUIRED_FIELDS.filter(k => {
    const v = (fields as Record<string, unknown>)[k];
    return v == null || v === '' || (Array.isArray(v) && v.length === 0);
  });
  const [aiOpen, setAiOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Computed-field plumbing. Pure no-op when formEnhancements.computed is {}.
  // The number renderer uses computedValues only as a fallback when the user
  // hasn't typed anything — clearing the input always restores the computation.
  // computedContext exposes applookup list props so { kind: 'applookup', ... }
  // operands can resolve to numeric fields on the target record.
  const computedContext = useMemo<ComputedContext>(() => ({
    lookupLists: {
      'firma': firmenList,
      'ansprechpartner': ansprechpartnerList,
      'lead': leadsList,
    },
  }), [firmenList, ansprechpartnerList, leadsList, ]);
  const computedValues = useMemo<Record<string, number | null>>(() => {
    let out: Record<string, number | null> = {};
    const entries = Object.entries(formEnhancements.computed);
    for (let i = 0; i < 5; i++) {
      const merged: Record<string, unknown> = { ...(fields as Record<string, unknown>) };
      for (const [k, v] of Object.entries(out)) {
        if (v === null) continue;
        const cur = merged[k];
        if (cur === undefined || cur === null || cur === '') merged[k] = v;
      }
      const next: Record<string, number | null> = {};
      let changed = false;
      for (const [key, spec] of entries) {
        const v = evalComputed(spec, merged, computedContext);
        next[key] = v;
        if (v !== out[key]) changed = true;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  }, [fields, computedContext]);

  useEffect(() => {
    if (open) {
      setFields(applyDefaults(normalizedDefaults ?? {}, formEnhancements.defaults) as Partial<Chancen['fields']>);
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
      setSubmitError(null);
    }
  }, [open, normalizedDefaults]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  // Submit errors surface IN the dialog (it is modal — a banner in the page
  // body would be hidden behind it). A consumer onSubmit that THROWS (the
  // documented "throw to prevent closing" validation pattern) lands here:
  // the dialog stays open, nothing is saved, the message is visible.
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (missingRequired.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      // Fill empty number slots from computed values; user-typed values always win.
      // CRITICAL: only backend-mapped keys may be backfilled. Virtual computeds
      // (sub-agent invents `_netto`, `_bestellung_gesamtbetrag` etc. for the
      // "Berechnungen" display) have no backend counterpart — writing them
      // triggers a 422 from the Living-Apps API ("field does not exist").
      const merged = { ...fields };
      for (const [key, val] of Object.entries(computedValues)) {
        if (val === null) continue;
        if (!backendFieldSet.has(key)) continue;
        const cur = (merged as Record<string, unknown>)[key];
        if (cur === undefined || cur === null || cur === '') {
          (merged as Record<string, unknown>)[key] = val;
        }
      }
      const clean = cleanFieldsForApi(merged, 'chancen');
      await onSubmit(clean as Chancen['fields']);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : t('submit_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="firma" entity="Firmen">\n${JSON.stringify(firmenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="ansprechpartner" entity="Ansprechpartner">\n${JSON.stringify(ansprechpartnerList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="lead" entity="Leads">\n${JSON.stringify(leadsList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "bezeichnung": string | null, // Bezeichnung\n  "phase": LookupValue | null, // Funnel-Phase (select one key: "qualifizierung" | "bedarfsanalyse" | "angebot" | "verhandlung" | "gewonnen" | "verloren") mapping: qualifizierung=Qualifizierung, bedarfsanalyse=Bedarfsanalyse, angebot=Angebot, verhandlung=Verhandlung, gewonnen=Gewonnen, verloren=Verloren\n  "vertragsvolumen_jaehrlich": number | null, // Jährliches Vertragsvolumen (€)\n  "vertragsvolumen_gesamt": number | null, // Gesamtes Vertragsvolumen (€)\n  "wahrscheinlichkeit": number | null, // Wahrscheinlichkeit (%)\n  "abschlussdatum": string | null, // YYYY-MM-DD\n  "abschlussgrund": string | null, // Gewinn- oder Verlustgrund\n  "wettbewerber": string | null, // Wettbewerber\n  "auftragsnummer_planungssystem": string | null, // Auftragsnummer im Planungssystem\n  "bemerkungen": string | null, // Bemerkungen\n  "firma": string | null, // Display name from Firmen (see <available-records>)\n  "ansprechpartner": string | null, // Display name from Ansprechpartner (see <available-records>)\n  "lead": string | null, // Display name from Leads (see <available-records>)\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["firma", "ansprechpartner", "lead"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const firmaName = raw['firma'] as string | null;
        if (firmaName) {
          const firmaMatch = firmenList.find(r => matchName(firmaName!, [String(r.fields.firmenname ?? '')]));
          if (firmaMatch) merged['firma'] = createRecordUrl(APP_IDS.FIRMEN, firmaMatch.record_id);
        }
        const ansprechpartnerName = raw['ansprechpartner'] as string | null;
        if (ansprechpartnerName) {
          const ansprechpartnerMatch = ansprechpartnerList.find(r => matchName(ansprechpartnerName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (ansprechpartnerMatch) merged['ansprechpartner'] = createRecordUrl(APP_IDS.ANSPRECHPARTNER, ansprechpartnerMatch.record_id);
        }
        const leadName = raw['lead'] as string | null;
        if (leadName) {
          const leadMatch = leadsList.find(r => matchName(leadName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (leadMatch) merged['lead'] = createRecordUrl(APP_IDS.LEADS, leadMatch.record_id);
        }
        return merged as Partial<Chancen['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error(`${t('scan_error')}:`, err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues
    ? t('edit_entity', { entity: appLabel('chancen') })
    : t('new_entity', { entity: appLabel('chancen') });

  const fieldBlocks: Record<string, React.ReactNode> = {
    'bezeichnung': (
      <div key="bezeichnung" className="space-y-1.5">
        <Label htmlFor="bezeichnung">{fieldLabel('chancen', 'bezeichnung')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Input
          id="bezeichnung"
          placeholder="z. B. Rahmenvertrag Wartung 2026"
          value={fields.bezeichnung ?? ''}
          onChange={e => setFields(f => ({ ...f, bezeichnung: e.target.value }))}
          required
        />
        {showErrors && !fields.bezeichnung && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('chancen', 'bezeichnung')}</p>
        )}
      </div>
    ),
    'phase': (
      <div key="phase" className="space-y-1.5">
        <Label htmlFor="phase">{fieldLabel('chancen', 'phase')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Select
          value={lookupKey(fields.phase) ?? ''}
          onValueChange={v => setFields(f => ({ ...f, phase: v === 'none' ? undefined : v as any }))}
        >
          <SelectTrigger id="phase" className="max-sm:h-11"><SelectValue placeholder="z. B. Angebot, Verhandlung" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            <SelectItem value="qualifizierung">{lookupLabel('chancen', 'phase', 'qualifizierung') ?? 'Qualifizierung'}</SelectItem>
            <SelectItem value="bedarfsanalyse">{lookupLabel('chancen', 'phase', 'bedarfsanalyse') ?? 'Bedarfsanalyse'}</SelectItem>
            <SelectItem value="angebot">{lookupLabel('chancen', 'phase', 'angebot') ?? 'Angebot'}</SelectItem>
            <SelectItem value="verhandlung">{lookupLabel('chancen', 'phase', 'verhandlung') ?? 'Verhandlung'}</SelectItem>
            <SelectItem value="gewonnen">{lookupLabel('chancen', 'phase', 'gewonnen') ?? 'Gewonnen'}</SelectItem>
            <SelectItem value="verloren">{lookupLabel('chancen', 'phase', 'verloren') ?? 'Verloren'}</SelectItem>
          </SelectContent>
        </Select>
        {showErrors && !fields.phase && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('chancen', 'phase')}</p>
        )}
      </div>
    ),
    'vertragsvolumen_jaehrlich': (
      <div key="vertragsvolumen_jaehrlich" className="space-y-1.5">
        <Label htmlFor="vertragsvolumen_jaehrlich">{fieldLabel('chancen', 'vertragsvolumen_jaehrlich')}</Label>
        <Input
          id="vertragsvolumen_jaehrlich"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'vertragsvolumen_jaehrlich')}
          placeholder="z. B. 24000"
          value={fields.vertragsvolumen_jaehrlich !== undefined ? fields.vertragsvolumen_jaehrlich : (computedValues['vertragsvolumen_jaehrlich'] ?? '')}
          onChange={e => setFields(f => ({ ...f, vertragsvolumen_jaehrlich: clampNumberValue(formEnhancements, 'vertragsvolumen_jaehrlich', e.target.value) }))}
        />
      </div>
    ),
    'vertragsvolumen_gesamt': (
      <div key="vertragsvolumen_gesamt" className="space-y-1.5">
        <Label htmlFor="vertragsvolumen_gesamt">{fieldLabel('chancen', 'vertragsvolumen_gesamt')}</Label>
        <Input
          id="vertragsvolumen_gesamt"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'vertragsvolumen_gesamt')}
          placeholder="z. B. 72000"
          value={fields.vertragsvolumen_gesamt !== undefined ? fields.vertragsvolumen_gesamt : (computedValues['vertragsvolumen_gesamt'] ?? '')}
          onChange={e => setFields(f => ({ ...f, vertragsvolumen_gesamt: clampNumberValue(formEnhancements, 'vertragsvolumen_gesamt', e.target.value) }))}
        />
      </div>
    ),
    'wahrscheinlichkeit': (
      <div key="wahrscheinlichkeit" className="space-y-1.5">
        <Label htmlFor="wahrscheinlichkeit">{fieldLabel('chancen', 'wahrscheinlichkeit')}</Label>
        <Input
          id="wahrscheinlichkeit"
          type="number"
          inputMode="decimal"
          step="any"
          {...numberInputProps(formEnhancements, 'wahrscheinlichkeit')}
          placeholder="z. B. 60"
          value={fields.wahrscheinlichkeit !== undefined ? fields.wahrscheinlichkeit : (computedValues['wahrscheinlichkeit'] ?? '')}
          onChange={e => setFields(f => ({ ...f, wahrscheinlichkeit: clampNumberValue(formEnhancements, 'wahrscheinlichkeit', e.target.value) }))}
        />
      </div>
    ),
    'abschlussdatum': (
      <div key="abschlussdatum" className="space-y-1.5">
        <Label htmlFor="abschlussdatum">{fieldLabel('chancen', 'abschlussdatum')}</Label>
        <DatePicker
          id="abschlussdatum"
          placeholder="Wann wird abgeschlossen?"
          mode="date"
          value={fields.abschlussdatum ?? null}
          onChange={v => setFields(f => ({ ...f, abschlussdatum: v ?? undefined }))}
        />
      </div>
    ),
    'abschlussgrund': (
      <div key="abschlussgrund" className="space-y-1.5">
        <Label htmlFor="abschlussgrund">{fieldLabel('chancen', 'abschlussgrund')}</Label>
        <Textarea
          id="abschlussgrund"
          placeholder="Warum gewonnen oder verloren?"
          value={fields.abschlussgrund ?? ''}
          onChange={e => setFields(f => ({ ...f, abschlussgrund: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'wettbewerber': (
      <div key="wettbewerber" className="space-y-1.5">
        <Label htmlFor="wettbewerber">{fieldLabel('chancen', 'wettbewerber')}</Label>
        <Input
          id="wettbewerber"
          placeholder="z. B. Muster GmbH"
          value={fields.wettbewerber ?? ''}
          onChange={e => setFields(f => ({ ...f, wettbewerber: e.target.value }))}
        />
      </div>
    ),
    'auftragsnummer_planungssystem': (
      <div key="auftragsnummer_planungssystem" className="space-y-1.5">
        <Label htmlFor="auftragsnummer_planungssystem">{fieldLabel('chancen', 'auftragsnummer_planungssystem')}</Label>
        <Input
          id="auftragsnummer_planungssystem"
          placeholder="z. B. AU-2026-001"
          value={fields.auftragsnummer_planungssystem ?? ''}
          onChange={e => setFields(f => ({ ...f, auftragsnummer_planungssystem: e.target.value }))}
        />
      </div>
    ),
    'bemerkungen': (
      <div key="bemerkungen" className="space-y-1.5">
        <Label htmlFor="bemerkungen">{fieldLabel('chancen', 'bemerkungen')}</Label>
        <Textarea
          id="bemerkungen"
          placeholder="Weitere Hinweise zur Chance"
          value={fields.bemerkungen ?? ''}
          onChange={e => setFields(f => ({ ...f, bemerkungen: e.target.value }))}
          rows={3}
        />
      </div>
    ),
    'firma': (
      <div key="firma" className="space-y-1.5">
        <Label htmlFor="firma">{fieldLabel('chancen', 'firma')} <span className="text-destructive" aria-hidden="true">*</span></Label>
        <Combobox
          id="firma"
          placeholder="Welche Firma?"
          items={firmenListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.firmenname ?? r.record_id),
          }))}
          value={extractRecordId(fields.firma)}
          onChange={id => setFields(f => ({ ...f, firma: id ? createRecordUrl(APP_IDS.FIRMEN, id) : undefined }))}
          onCreateNew={(q) => openCreateFirmen("firma", q)}
          createLabel={t('create_in', { entity: appLabel('firmen') })}
        />
        {showErrors && !fields.firma && (
          <p className="text-xs text-destructive mt-1" role="alert">{requiredMessage('chancen', 'firma')}</p>
        )}
      </div>
    ),
    'ansprechpartner': (
      <div key="ansprechpartner" className="space-y-1.5">
        <Label htmlFor="ansprechpartner">{fieldLabel('chancen', 'ansprechpartner')}</Label>
        <Combobox
          id="ansprechpartner"
          placeholder="Welcher Ansprechpartner?"
          items={ansprechpartnerListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.vorname ?? r.record_id),
          }))}
          value={extractRecordId(fields.ansprechpartner)}
          onChange={id => setFields(f => ({ ...f, ansprechpartner: id ? createRecordUrl(APP_IDS.ANSPRECHPARTNER, id) : undefined }))}
          onCreateNew={(q) => openCreateAnsprechpartner("ansprechpartner", q)}
          createLabel={t('create_in', { entity: appLabel('ansprechpartner') })}
        />
      </div>
    ),
    'lead': (
      <div key="lead" className="space-y-1.5">
        <Label htmlFor="lead">{fieldLabel('chancen', 'lead')}</Label>
        <Combobox
          id="lead"
          placeholder="Welcher Lead?"
          items={leadsListAll.map(r => ({
            id: r.record_id,
            label: String(r.fields.kampagne ?? r.record_id),
          }))}
          value={extractRecordId(fields.lead)}
          onChange={id => setFields(f => ({ ...f, lead: id ? createRecordUrl(APP_IDS.LEADS, id) : undefined }))}
          onCreateNew={(q) => openCreateLeads("lead", q)}
          createLabel={t('create_in', { entity: appLabel('leads') })}
        />
      </div>
    ),
  };
  const orderedFields = applyFieldOrder(Object.keys(fieldBlocks), formEnhancements.fieldOrder);
  const orderedFieldsKey = orderedFields.map((it) => typeof it === 'string' ? it : it.row.join('+')).join(',');

  // Render-Modell für Computed-Felder:
  //
  //   • BACKEND-FELDER mit computed-Eintrag (z.B. gesamtpreis bei einer
  //     Katzenpension) bleiben als normales Eingabe-Feld stehen. Der Number-
  //     Input nutzt den computed-Wert als Vorschlag, der User kann jederzeit
  //     überschreiben (clearing → restore computed).
  //   • VIRTUELLE computed-Keys (Eintrag in formEnhancements.computed, ABER
  //     kein passendes Backend-Feld in orderedFields) erscheinen NICHT als
  //     Input, sondern unten als kompakte 'Berechnungen'-Übersicht oder als
  //     Inline-Hint unter dem letzten beitragenden Input.
  const FIELD_LABELS: Record<string, string> = {"bezeichnung": "Bezeichnung", "phase": "Funnel-Phase", "vertragsvolumen_jaehrlich": "Jährliches Vertragsvolumen (€)", "vertragsvolumen_gesamt": "Gesamtes Vertragsvolumen (€)", "wahrscheinlichkeit": "Wahrscheinlichkeit (%)", "abschlussdatum": "Erwartetes Abschlussdatum", "abschlussgrund": "Gewinn- oder Verlustgrund", "wettbewerber": "Wettbewerber", "auftragsnummer_planungssystem": "Auftragsnummer im Planungssystem", "bemerkungen": "Bemerkungen", "firma": "Firma", "ansprechpartner": "Ansprechpartner", "lead": "Ursprünglicher Lead"};
  const CURRENCY_KEYS = new Set<string>(["vertragsvolumen_jaehrlich", "vertragsvolumen_gesamt"]);
  // Applookup-Referenz-Labels: pro applookup-Feld in dieser Form (ownKey)
  // eine Map { lookupKey: label } für ALLE Felder des Target-Schemas. Wird
  // beim Render-Walk gefiltert auf die in der computed-Formel tatsächlich
  // referenzierten lookupKeys (siehe applookupRefs unten).
  const APPLOOKUP_LABELS: Record<string, Record<string, string>> = {"firma": {"firmenname": "Firmenname", "strukturebene": "Rolle in der Kundenstruktur", "branche": "Branche", "kundenstatus": "Kundenstatus", "kundennummer_planungssystem": "Kundennummer im Planungssystem", "umsatzpotenzial": "Jahresumsatz-Potenzial (€)", "strasse": "Straße", "hausnummer": "Hausnummer", "plz": "Postleitzahl", "ort": "Ort", "telefon": "Telefon", "email": "E-Mail", "website": "Website", "kundenmanager_vorname": "Kundenmanager Vorname", "kundenmanager_nachname": "Kundenmanager Nachname", "uebergeordnete_firma": "Übergeordnete Firma"}, "ansprechpartner": {"vorname": "Vorname", "nachname": "Nachname", "position": "Position", "email": "E-Mail", "telefon": "Telefon", "mobil": "Mobil", "entscheider": "Entscheider", "firma": "Firma"}, "lead": {"erfassungsdatum": "Erfassungsdatum", "herkunft": "Herkunft", "kampagne": "Kampagne", "vorname": "Vorname", "nachname": "Nachname", "firma": "Zugeordnete Firma", "firmenname": "Firma", "email": "E-Mail", "telefon": "Telefon", "interesse": "Interesse", "leadstatus": "Lead-Status", "bewertung": "Bewertung", "disqualifizierungsgrund": "Disqualifizierungsgrund", "verantwortlich_vorname": "Verantwortlicher Vorname", "verantwortlich_nachname": "Verantwortlicher Nachname"}};
  const inputFields = useMemo(() => flattenFieldOrder(orderedFields), [orderedFieldsKey]);
  const backendFieldSet = useMemo(() => new Set(inputFields), [inputFields.join(',')]);
  const virtualComputed = useMemo(
    () => Object.fromEntries(
      Object.entries(formEnhancements.computed).filter(([k]) => !backendFieldSet.has(k)),
    ),
    [backendFieldSet],
  );
  const virtualFormEnhancements = useMemo(
    () => ({ ...formEnhancements, computed: virtualComputed }),
    [virtualComputed],
  );
  const computedLayout = useMemo(
    () => classifyComputed(virtualFormEnhancements, inputFields, computedDeps),
    [virtualFormEnhancements, inputFields.join(',')],
  );
  // Applookup-Referenzen: pro ownKey (Lookup-Feld im Form) die Liste der
  // lookupKeys, die in irgendeiner computed-Formel referenziert werden.
  // MODUS-1: aus dem Spec-Tree extrahiert. MODUS-2: aus dem Build-Time-
  // Export computedApplookupRefs (parse-formulas hat Regex-Pairs gesammelt).
  // Pro (ownKey, lookupKey)-Paar nur einmal; pro ownKey können aber mehrere
  // lookupKeys gleichzeitig auftauchen (z.B. einzelpreis UND karten10_preis
  // beim Yoga-Kurs), und alle werden separat als Inline-Hint gerendert.
  const applookupRefs = useMemo(
    () => mergeApplookupRefs(
      extractApplookupRefs(formEnhancements.computed),
      computedApplookupRefs,
    ),
    [],
  );
  function summaryLabel(k: string): string {
    if (FIELD_LABELS[k]) return FIELD_LABELS[k];
    // Leading underscore(s) als Virtual-Marker abstreifen; Unterstriche zu
    // Leerzeichen, jedes Wort kapitalisieren. Umlaute kommen vom Sub-Agent
    // direkt im Key (z. B. `_buchung_dauer_nächte`) — JS/TS/Vite unterstützen
    // Unicode-Identifier nativ, daher keine ASCII-Transliteration nötig.
    return k.replace(/^_+/, '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  function formatSummaryValue(k: string, v: unknown): string {
    if (v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '—';
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return String(v);
    // Backend-Feld mit €-Label ODER virtueller Computed-Key, dessen Name nach Geld aussieht.
    const looksLikeCurrency = CURRENCY_KEYS.has(k) || /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k);
    if (looksLikeCurrency) {
      return n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
  }

  return (
    <>
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 max-sm:[&>button]:size-10 max-sm:[&>button]:grid max-sm:[&>button]:place-items-center max-sm:[&>button]:rounded-full max-sm:[&>button]:border max-sm:[&>button]:border-input max-sm:[&>button]:bg-background max-sm:[&>button]:opacity-100 max-sm:[&>button>svg]:size-5">
        <DialogHeader className="px-6 pt-5 pb-3 border-b flex flex-row items-center gap-3 space-y-0">
          <DialogTitle className="flex-1 truncate text-left">{DIALOG_INTENT}</DialogTitle>
          {enablePhotoScan && (
            <button
              type="button"
              onClick={() => setAiOpen(o => !o)}
              aria-expanded={aiOpen}
              aria-controls="ai-fill-panel"
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 max-sm:py-2.5 max-sm:px-4 text-xs font-semibold transition-all mr-7 max-sm:mr-12 shadow-sm ${
                aiOpen
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 hover:border-primary/50'
              }`}
            >
              <IconSparkles className={`h-3.5 w-3.5 ${aiOpen ? '' : 'text-primary'}`} />
              <span className="hidden sm:inline">{t('smart_fill')}</span>
              <IconChevronDown className={`h-3 w-3 transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </DialogHeader>
        {enablePhotoScan && aiOpen && (
          <div id="ai-fill-panel" className="border-b bg-muted/20 px-6 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t('scan_header_sub')}</p>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  {t('useinfo_label')}
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? t('useinfo_loading') : `(${t('useinfo_more')})`}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">{t('profile_preamble')}</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">{t('useinfo_error')}</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_analyzing')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_analyzing_sub')}</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('scan_success')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('scan_success_sub')}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{t('scan_upload')}</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />{t('scan_camera_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />{t('scan_file_btn')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />{t('scan_doc_btn')}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder={t('scan_text_placeholder')}
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title={t('paste')}
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />{t('scan_text_analyze')}
              </Button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 min-w-0 max-sm:[&_input]:h-11">
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0">
            {(() => {
              const renderField = (k: string) => {
                const inlineHints = computedLayout.anchors[k] ?? [];
                const refs = applookupRefs[k] ?? [];
                // A field the plan gives to a TOOL. On CREATE it is not shown
                // at all — the value does not exist yet and typing one only
                // gets overwritten. On EDIT it stays a normal input with a
                // note: when a tool could not compose its value (a missing
                // ingredient), this is the only place to repair the record.
                if (SYSTEM_ASSIGNED.includes(k) && !recordId) {
                  return (
                    <div key={k} className="space-y-1.5 min-w-0">
                      <Label>{fieldLabel('chancen', k)}</Label>
                      <p className="text-sm text-muted-foreground">{t('assigned_by_system')}</p>
                    </div>
                  );
                }
                return (
                  <div key={k} className="space-y-1.5 min-w-0">
                    {fieldBlocks[k]}
                    {SYSTEM_ASSIGNED.includes(k) && (
                      <p className="text-xs text-muted-foreground">{t('assigned_by_system')}</p>
                    )}
                    {refs.map(({ lookupKey }) => {
                      // Show the live numeric value the formula will pull from
                      // the selected lookup target (e.g. "Monatspreis: 34,90 €"
                      // under the Tarif combobox). Hidden while no lookup is
                      // selected or the target field is non-numeric.
                      const v = resolveApplookupRef(k, lookupKey, fields as Record<string, unknown>, computedContext);
                      if (v === null) return null;
                      const lbl = APPLOOKUP_LABELS[k]?.[lookupKey] ?? lookupKey;
                      const text = formatSummaryValue(lookupKey, v);
                      return (
                        <div key={`alh-${k}-${lookupKey}`} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{lbl}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                    {inlineHints.map((cKey) => {
                      const v = computedValues[cKey];
                      const text = formatSummaryValue(cKey, v);
                      if (text === '—') return null;
                      return (
                        <div key={cKey} className="flex items-center gap-1.5 pl-3 text-xs text-muted-foreground">
                          <span className="text-primary/70">→</span>
                          <span>{summaryLabel(cKey)}</span>
                          <span className="ml-auto font-medium tabular-nums text-foreground">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              };
              return orderedFields.map((item, idx) => {
                if (typeof item === 'string') return renderField(item);
                const cols = item.cols ?? `repeat(${item.row.length}, minmax(0, 1fr))`;
                return (
                  <div key={`row-${idx}`} className="grid gap-3" style={{ gridTemplateColumns: cols }}>
                    {item.row.map(renderField)}
                  </div>
                );
              });
            })()}
            {(computedLayout.aggregates.length > 0 || computedLayout.finalTotal) && (
              <div className="mt-6 pt-4 border-t border-border space-y-1.5">
                {computedLayout.aggregates.length > 0 && (
                  <dl className="space-y-1.5 pb-2">
                    {computedLayout.aggregates.map((k) => {
                      const userVal = (fields as Record<string, unknown>)[k];
                      const computed = computedValues[k];
                      const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                      return (
                        <div key={k} className="flex justify-between items-baseline gap-3">
                          <dt className="text-sm text-muted-foreground truncate">{summaryLabel(k)}</dt>
                          <dd className="text-sm font-medium tabular-nums whitespace-nowrap">{formatSummaryValue(k, v)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
                {computedLayout.finalTotal && (() => {
                  const k = computedLayout.finalTotal;
                  const userVal = (fields as Record<string, unknown>)[k];
                  const computed = computedValues[k];
                  const v = userVal !== undefined && userVal !== null && userVal !== '' ? userVal : computed;
                  // Innere Border nur wenn aggregates existieren — sonst hätten wir
                  // zwei direkt aufeinanderfolgende Striche (Outer + Inner) mit nur
                  // einer Aggregat-Zeile dazwischen → zu viel visuelles Rauschen.
                  const sep = computedLayout.aggregates.length > 0 ? 'pt-3 border-t border-border' : 'pt-1';
                  return (
                    <div className={`flex justify-between items-baseline gap-3 ${sep}`}>
                      <span className="text-base font-semibold text-foreground">{summaryLabel(k)}</span>
                      <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground">{formatSummaryValue(k, v)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {showErrors && missingRequired.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1.5" role="alert">
                <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t('missing_required')}
              </p>
            )}
            {recordId && (
              <div className="pt-2 border-t border-border">
                <AttachmentsSection appId={APP_IDS.CHANCEN} recordId={recordId} />
              </div>
            )}
          </div>
          {submitError && (
            <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/10 px-6 py-2.5 text-sm text-destructive" role="alert">
              <IconAlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="min-w-0 break-words">{submitError}</span>
            </div>
          )}
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2 max-sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} className="max-sm:h-12 max-sm:flex-1 max-sm:text-base">{t('cancel')}</Button>
            <Button
              type="submit"
              className="max-sm:h-12 max-sm:flex-1 max-sm:text-base"
              disabled={saving || !isDirty || (showErrors && missingRequired.length > 0)}
            >
              {saving ? t('saving') : defaultValues ? t('save') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {createFirmenOpen && (
      <FirmenDialog
        open={createFirmenOpen}
        onClose={() => setCreateFirmenOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createFirmenEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Firmen;
            setExtraFirmen(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.FIRMEN, result.id);
            setFields(prev => ({ ...prev, [createFirmenField]: url } as any));
          }
          setCreateFirmenOpen(false);
        }}
        defaultValues={createFirmenInitial
          ? ({ firmenname: createFirmenInitial } as any)
          : undefined}
        firmenList={firmenList}
      />
    )}
    {createAnsprechpartnerOpen && (
      <AnsprechpartnerDialog
        open={createAnsprechpartnerOpen}
        onClose={() => setCreateAnsprechpartnerOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createAnsprechpartnerEntry(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Ansprechpartner;
            setExtraAnsprechpartner(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.ANSPRECHPARTNER, result.id);
            setFields(prev => ({ ...prev, [createAnsprechpartnerField]: url } as any));
          }
          setCreateAnsprechpartnerOpen(false);
        }}
        defaultValues={createAnsprechpartnerInitial
          ? ({ vorname: createAnsprechpartnerInitial } as any)
          : undefined}
        firmenList={firmenList}
      />
    )}
    {createLeadsOpen && (
      <LeadsDialog
        open={createLeadsOpen}
        onClose={() => setCreateLeadsOpen(false)}
        onSubmit={async (newFields) => {
          const result = await LivingAppsService.createLead(newFields as any) as { id?: string };
          if (result?.id) {
            const newRec = { record_id: result.id, fields: newFields } as unknown as Leads;
            setExtraLeads(prev => [...prev, newRec]);
            const url = createRecordUrl(APP_IDS.LEADS, result.id);
            setFields(prev => ({ ...prev, [createLeadsField]: url } as any));
          }
          setCreateLeadsOpen(false);
        }}
        defaultValues={createLeadsInitial
          ? ({ kampagne: createLeadsInitial } as any)
          : undefined}
        firmenList={firmenList}
      />
    )}
    </>
  );
}