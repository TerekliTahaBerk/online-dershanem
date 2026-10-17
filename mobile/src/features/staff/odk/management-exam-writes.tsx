import { parseOdkExamCommandResult, parseOdkOutcomeOptions, type OdkExamCommand, type OdkExamWorkspaceView } from '@contracts/odk-management-exam';
import { useMutation } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, Row, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { runWithStepUp, StepUpCancelledError } from '@/features/admin/step-up-retry';
import { FilterChips } from '@/features/admin/ui';
import { useStepUp } from '@/features/auth/step-up';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { confirmAction, DateTimeField, OfflineWriteNotice, useOnline, useStableKey, WriteBanner, writeError, type WriteState } from '../shared';

/**
 * K03b · DENEME HAZIRLIK YAZMALARI — web `/api/odk/admin/exams/[id]/**` ile
 * aynı servisler, mobil komut ucu `POST /api/panel/odk/management/exams/[id]`.
 * Her komut işlem anahtarı + okunan çalışma alanı `revision` taşır; belirsiz
 * ağ hatasında aynı gövdeyle aynı anahtar; 409'da görünüm yenilenir.
 * K03c: puanla, yeniden puanla ve yayın; son ikisi web gibi taze step-up
 * ister (native doğrulama sonrası aynı anahtarla tek tekrar).
 */
const base = (examId: string) => `/api/panel/odk/management/exams/${encodeURIComponent(examId)}`;
type Result = Extract<ReturnType<typeof parseOdkExamCommandResult>, { ok: true }>['value'];

export function useExamCommand(examId: string, revision: string, onChanged: () => void) {
  const { api } = useSession();
  const { requestStepUp } = useStepUp();
  const online = useOnline();
  const [state, setState] = useState<WriteState>(null);
  const key = useStableKey<{ command: OdkExamCommand; revision: string }>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: async (command: OdkExamCommand) => {
      if (!online) throw new ApiError({ kind: 'network' });
      const input = { command, revision };
      // 428'de native step-up; doğrulanırsa AYNI anahtarla bir kez tekrar.
      const send = async () => {
        const parsed = parseOdkExamCommandResult(await api.request(base(examId), { method: 'POST', body: command, headers: { 'X-Od-Idempotency-Key': key.keyFor(input), 'X-Od-Expected-Revision': revision } }));
        if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
        return parsed.value;
      };
      try {
        const value = await runWithStepUp(send, requestStepUp);
        key.settle();
        return value;
      } catch (error) {
        key.settle(error);
        throw error;
      }
    },
  });
  async function run(command: OdkExamCommand, success: string, options: { confirm?: { title: string; message: string; label: string }; refresh?: boolean } = {}): Promise<Result | null> {
    if (mutation.isPending) return null;
    if (options.confirm && !(await confirmAction({ title: options.confirm.title, message: options.confirm.message, confirmLabel: options.confirm.label }))) return null;
    setState(null);
    try {
      const result = await mutation.mutateAsync(command);
      setState({ tone: 'success', message: success });
      if (options.refresh !== false) onChanged();
      return result;
    } catch (error) {
      setState(error instanceof StepUpCancelledError ? { tone: 'warning', message: error.message } : writeError(error, 'Deneme başka bir işlemde değişti. Güncel çalışma alanı yüklendi; kontrol edip yeniden deneyin.'));
      if (error instanceof ApiError && error.kind === 'conflict') onChanged();
      return null;
    }
  }
  return { run, pending: mutation.isPending, state, online };
}

function Toggle({ title, value, onChange, testID }: { title: string; value: boolean; onChange: (next: boolean) => void; testID: string }) {
  const { product } = useDesign();
  return <Row title={title} trailing={<Switch value={value} onValueChange={onChange} trackColor={{ true: product.accent }} accessibilityLabel={title} testID={testID} />} />;
}

/** Zamanlama sekmesi: planlama + güvenlik formu (taslak / hazır), hazır işaretle, planla. */
type Command = ReturnType<typeof useExamCommand>;

export function ScheduleWrites({ data, examId, onChanged }: { data: OdkExamWorkspaceView; examId: string; onChanged: () => void }) {
  const { exam, caps } = data;
  const command = useExamCommand(examId, data.revision, onChanged);
  const editable = caps.edit && (exam.status === 'DRAFT' || exam.status === 'READY');
  return (
    <>
      <OfflineWriteNotice online={command.online} />
      <WriteBanner state={command.state} />
      {/* Form yeni revizyonda sunucu değerleriyle yeniden kurulur; durum bandı korunur. */}
      {editable ? <ScheduleForm key={data.revision} data={data} command={command} /> : null}
      <Section title="Yaşam döngüsü">
        {exam.status === 'DRAFT' && caps.edit ? (
          <Button mutation label="Hazır olarak işaretle" disabled={!command.online || command.pending || !exam.draftEditable} onPress={() => void command.run({ operation: 'ready' }, 'Sürüm kilitlendi; deneme planlamaya hazır.', { confirm: { title: 'Hazır olarak işaretle', message: 'Sürüm kilitlenir; içerik ve cevap anahtarı doğrudan değiştirilemez. Hazırlık engelleri varsa işlem reddedilir.', label: 'Kilitle' } })} testID="exam-ready" />
        ) : null}
        {exam.status === 'READY' && caps.schedule ? (
          <Button mutation label="Planla" disabled={!command.online || command.pending} onPress={() => void command.run({ operation: 'schedule' }, 'Deneme planlandı.', { confirm: { title: 'Denemeyi planla', message: 'Atanan öğrenciler için erişim hazırlığı başlar. Pencere ve Meet bilgileri yeniden kontrol edilir.', label: 'Planla' } })} testID="exam-schedule" />
        ) : null}
        {exam.status !== 'DRAFT' && exam.status !== 'READY' ? <Text tone="secondary">Deneme planlandıktan sonra kritik alanlar kilitlidir.</Text> : null}
      </Section>
    </>
  );
}

function ScheduleForm({ data, command }: { data: OdkExamWorkspaceView; command: Command }) {
  const { exam } = data;
  const schedule = data.schedule!;
  const [title, setTitle] = useState(exam.title);
  const [startsAt, setStartsAt] = useState(exam.startsAt ? new Date(exam.startsAt) : null);
  const [endsAt, setEndsAt] = useState(exam.endsAt ? new Date(exam.endsAt) : null);
  const [late, setLate] = useState(String(exam.lateEntryMinutes));
  const [meetRequired, setMeetRequired] = useState(exam.meetRequired);
  const [meetUrl, setMeetUrl] = useState(exam.meetUrl ?? '');
  const [fullscreenMode, setFullscreenMode] = useState(schedule.fullscreenMode);
  const [blockCopyPaste, setBlock] = useState(schedule.blockCopyPaste);
  const [trackVisibility, setTrack] = useState(schedule.trackVisibility);
  const [autoSubmit, setAutoSubmit] = useState(schedule.autoSubmit);
  const [extra, setExtra] = useState(String(schedule.allowExtraTimeMinutes));
  const lateValue = Number.parseInt(late, 10);
  const extraValue = Number.parseInt(extra, 10);
  const valid = title.trim().length >= 3 && Number.isInteger(lateValue) && lateValue >= 0 && lateValue <= 120 && Number.isInteger(extraValue) && extraValue >= 0 && extraValue <= 60 && (!startsAt || !endsAt || endsAt > startsAt);
  function save() {
    void command.run({
      operation: 'update',
      input: {
        title: title.trim(),
        startsAt: startsAt?.toISOString() ?? null,
        endsAt: endsAt?.toISOString() ?? null,
        lateEntryMinutes: lateValue,
        meetRequired,
        meetUrl: meetUrl.trim() || null,
        autoSubmit,
        security: { fullscreenMode, blockCopyPaste, logCopyPaste: schedule.logCopyPaste, trackVisibility, allowExtraTimeMinutes: extraValue, autoSubmit },
      },
    }, 'Planlama ve güvenlik bilgileri kaydedildi.');
  }
  return (
    <Section title="Düzenle">
      <TextField label="Deneme adı" value={title} onChangeText={setTitle} maxLength={180} testID="exam-title" />
      {startsAt ? <DateTimeField label="Başlangıç" value={startsAt} onChange={setStartsAt} /> : <Button label="Başlangıç ekle" variant="secondary" onPress={() => setStartsAt(new Date(Date.now() + 86_400_000))} testID="exam-add-start" />}
      {endsAt ? <DateTimeField label="Bitiş" value={endsAt} onChange={setEndsAt} minimumDate={startsAt ?? undefined} /> : <Button label="Bitiş ekle" variant="secondary" onPress={() => setEndsAt(new Date((startsAt?.getTime() ?? Date.now()) + 3 * 3_600_000))} testID="exam-add-end" />}
      <TextField label="Geç giriş (dk)" value={late} onChangeText={setLate} keyboardType="number-pad" maxLength={3} testID="exam-late" />
      <Toggle title="Meet zorunlu" value={meetRequired} onChange={setMeetRequired} testID="exam-meet-required" />
      {meetRequired ? <TextField label="Meet bağlantısı" value={meetUrl} onChangeText={setMeetUrl} autoCapitalize="none" keyboardType="url" maxLength={500} testID="exam-meet-url" /> : null}
      <FilterChips label="Tam ekran" value={fullscreenMode} onChange={setFullscreenMode} options={[{ value: 'OFF', label: 'Kapalı' }, { value: 'SUGGESTED', label: 'Önerilir' }, { value: 'REQUIRED', label: 'İstenir' }]} />
      <Toggle title="Kopyala / yapıştır engeli" value={blockCopyPaste} onChange={setBlock} testID="exam-block-copy" />
      <Toggle title="Sekme değişimini izle" value={trackVisibility} onChange={setTrack} testID="exam-track" />
      <Toggle title="Süre bitince otomatik teslim" value={autoSubmit} onChange={setAutoSubmit} testID="exam-autosubmit" />
      <TextField label="Ek süre hakkı (dk)" value={extra} onChangeText={setExtra} keyboardType="number-pad" maxLength={2} />
      <Text tone="muted" variant="meta">İstemci tarafı engeller güvenlik garantisi değildir.</Text>
      <Button mutation label="Kaydet" loading={command.pending} disabled={!command.online || !valid || command.pending} onPress={save} testID="exam-save" />
    </Section>
  );
}

/** Oturumlar sekmesi: oturum süreleri ve aralar (yalnız taslak sürüm). */
export function SessionWrites({ data, examId, onChanged }: { data: OdkExamWorkspaceView; examId: string; onChanged: () => void }) {
  const command = useExamCommand(examId, data.revision, onChanged);
  if (!data.caps.edit || !data.exam.draftEditable) return <WriteBanner state={command.state} />;
  return (
    <>
      <WriteBanner state={command.state} />
      <SessionForm key={data.revision} data={data} command={command} />
    </>
  );
}

function SessionForm({ data, command }: { data: OdkExamWorkspaceView; command: Command }) {
  const sessions = data.sessions ?? [];
  const [values, setValues] = useState(() => Object.fromEntries(sessions.map((item) => [item.key, { duration: String(item.durationMinutes), pause: String(item.breakAfterMinutes) }])));
  const parsed = sessions.map((item) => ({ key: item.key, durationMinutes: Number.parseInt(values[item.key]?.duration ?? '', 10), breakAfterMinutes: Number.parseInt(values[item.key]?.pause ?? '', 10) }));
  const valid = parsed.every((item) => Number.isInteger(item.durationMinutes) && Number.isInteger(item.breakAfterMinutes));
  return (
    <Section title="Süreleri düzenle">
      {sessions.map((item) => (
        <View key={item.key} style={styles.pair}>
          <Text variant="bodyStrong">{item.title}</Text>
          <TextField label="Süre (dk)" value={values[item.key]?.duration ?? ''} onChangeText={(duration) => setValues((current) => ({ ...current, [item.key]: { ...current[item.key], duration } }))} keyboardType="number-pad" maxLength={3} testID={`session-duration-${item.key}`} />
          <TextField label="Sonraki ara (dk)" value={values[item.key]?.pause ?? ''} onChangeText={(pause) => setValues((current) => ({ ...current, [item.key]: { ...current[item.key], pause } }))} keyboardType="number-pad" maxLength={3} />
        </View>
      ))}
      <Button mutation label="Oturum planını kaydet" disabled={!command.online || !valid || command.pending} loading={command.pending} onPress={() => void command.run({ operation: 'sessions', sessions: parsed }, 'Oturum planı güncellendi.')} testID="sessions-save" />
    </Section>
  );
}

type Source = 'GROUP' | 'CLASS' | 'PACKAGE' | 'COHORT' | 'STUDENT';

/** Katılımcılar sekmesi: atamalar ve kaynaktan toplu atama. */
export function AssignmentWrites({ data, examId, onChanged }: { data: OdkExamWorkspaceView; examId: string; onChanged: () => void }) {
  const assignments = data.assignments;
  const command = useExamCommand(examId, data.revision, onChanged);
  const [source, setSource] = useState<Source>('GROUP');
  const [choice, setChoice] = useState('');
  const [emails, setEmails] = useState('');
  if (!assignments) return null;
  const options: Record<Exclude<Source, 'STUDENT'>, { value: string; label: string }[]> = {
    GROUP: assignments.options.groups.map((group) => ({ value: group.id, label: `${group.label} (${group.memberCount})` })),
    CLASS: assignments.options.classLevels.map((level) => ({ value: level, label: `${level}. sınıf` })),
    PACKAGE: assignments.options.packages.map((pack) => ({ value: pack.id, label: pack.title })),
    COHORT: assignments.options.cohorts.map((cohort) => ({ value: cohort.id, label: `${cohort.name} · ${cohort.status}` })),
  };
  const emailList = emails.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
  const input: Extract<OdkExamCommand, { operation: 'assign' }>['input'] | null =
    source === 'STUDENT' ? (emailList.length ? { source: 'STUDENT', studentEmails: emailList } : null)
    : !choice ? null
    : source === 'GROUP' ? { source: 'GROUP', groupId: choice }
    : source === 'CLASS' ? { source: 'CLASS', classLevel: choice }
    : source === 'PACKAGE' ? { source: 'BULK', packageId: choice }
    : { source: 'COHORT', cohortId: choice };
  async function assign() {
    if (!input) return;
    const result = await command.run({ operation: 'assign', input }, 'Atama kaydedildi.', { confirm: { title: 'Atama yap', message: 'Seçilen kaynaktaki aktif öğrenciler denemeye atanır; mevcut atamalar yeniden etkinleşir.', label: 'Ata' } });
    if (result?.result.total != null) { setChoice(''); setEmails(''); }
  }
  return (
    <>
      <WriteBanner state={command.state} />
      {data.exam.status !== 'ARCHIVED' ? (
        <Section first title="Atama yap">
          <FilterChips label="Atama kaynağı" value={source} onChange={(next) => { setSource(next); setChoice(''); }} options={[{ value: 'GROUP', label: 'Grup' }, { value: 'CLASS', label: 'Sınıf düzeyi' }, { value: 'PACKAGE', label: 'Paket' }, { value: 'COHORT', label: 'Pilot' }, { value: 'STUDENT', label: 'E-posta' }]} />
          {source === 'STUDENT' ? (
            <TextField label="Öğrenci e-postaları" hint="Virgül veya satırla ayırın; en fazla 500." value={emails} onChangeText={setEmails} multiline autoCapitalize="none" keyboardType="email-address" testID="assign-emails" />
          ) : options[source].length ? (
            <FilterChips label="Kaynak seçimi" value={choice} onChange={setChoice} options={options[source]} />
          ) : (
            <Text tone="secondary">Bu kaynakta seçenek yok.</Text>
          )}
          <Button mutation label="Ata" disabled={!command.online || !input || command.pending} loading={command.pending} onPress={() => void assign()} testID="assign-submit" />
        </Section>
      ) : null}
      <Section title={`Atamalar · ${assignments.active} aktif / ${assignments.total}`}>
        {assignments.rows.length ? assignments.rows.map((row) => <Row key={row.id} title={row.name} subtitle={`${row.source} · ${formatShortDateTime(row.assignedAt)}`} trailing={<StatusBadge label={row.active ? 'Aktif' : 'Pasif'} tone={row.active ? 'success' : 'neutral'} />} />) : <EmptyState title="Henüz atama yok" />}
      </Section>
    </>
  );
}

/** İçerik sekmesi: cevap anahtarı / kazanım JSON içe aktarma (doğrula → uygula) ve PDF yükleme. */
export function ContentWrites({ data, examId, onChanged }: { data: OdkExamWorkspaceView; examId: string; onChanged: () => void }) {
  const command = useExamCommand(examId, data.revision, onChanged);
  const [kind, setKind] = useState<'answer-key' | 'outcomes'>('answer-key');
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ importId: string; message: string; issues: { level: string; message: string }[] } | null>(null);
  if (!data.caps.edit) return null;
  const versionDraft = data.exam.versionStatus === 'DRAFT';
  async function validate() {
    setParseError(null);
    setPreview(null);
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { setParseError('JSON okunamadı. Metni kontrol edin.'); return; }
    const result = await command.run({ operation: 'import.preview', kind, payload }, 'Önizleme hazır.', { refresh: false });
    if (result?.result.importId) setPreview({ importId: result.result.importId, message: result.result.summary?.message ?? '', issues: result.result.issues });
  }
  async function commit() {
    if (!preview) return;
    const result = await command.run({ operation: 'import.commit', kind, importId: preview.importId }, kind === 'answer-key' ? 'Cevap anahtarı uygulandı.' : 'Kazanım eşlemeleri uygulandı.', { confirm: { title: 'İçe aktarmayı uygula', message: 'Önizlenen eşlemeler sorulara yazılır. Bu işlem geçmişe kaydedilir.', label: 'Uygula' } });
    if (result) { setPreview(null); setText(''); }
  }
  const errors = preview?.issues.filter((issue) => issue.level === 'error').length ?? 0;
  return (
    <>
      <OfflineWriteNotice online={command.online} />
      <WriteBanner state={command.state} />
      <Section title="JSON içe aktarma">
        {!versionDraft ? <Banner tone="info">Sürüm kilitli: önizleme yapılabilir, uygulama yalnız kilitlenmemiş sürümde.</Banner> : null}
        <FilterChips label="İçe aktarma türü" value={kind} onChange={(next) => { setKind(next); setPreview(null); }} options={[{ value: 'answer-key', label: 'Cevap anahtarı' }, { value: 'outcomes', label: 'Kazanım eşlemesi' }]} />
        <TextField label="JSON" value={text} onChangeText={(next) => { setText(next); setPreview(null); }} multiline autoCapitalize="none" autoCorrect={false} testID="import-json" />
        {parseError ? <Banner tone="critical">{parseError}</Banner> : null}
        <Button mutation label="Doğrula" variant="secondary" disabled={!command.online || !text.trim() || command.pending} loading={command.pending && !preview} onPress={() => void validate()} testID="import-validate" />
        {preview ? (
          <View style={styles.pair} testID="import-preview">
            <Text variant="bodyStrong">{preview.message}</Text>
            {preview.issues.slice(0, 20).map((issue, index) => <Row key={index} title={issue.message} trailing={<StatusBadge label={issue.level === 'error' ? 'Hata' : 'Uyarı'} tone={issue.level === 'error' ? 'critical' : 'warning'} />} />)}
            <Button mutation label="Uygula" disabled={!command.online || errors > 0 || !versionDraft || command.pending} loading={command.pending} onPress={() => void commit()} testID="import-commit" />
          </View>
        ) : null}
      </Section>
      {data.exam.draftEditable ? <PdfUpload examId={examId} onChanged={onChanged} /> : null}
    </>
  );
}

/** Taslak sürüme özel PDF (kitapçık / cevap anahtarı). Tür başına tek dosya; yeniden yükleme eskisinin yerini alır. */
function PdfUpload({ examId, onChanged }: { examId: string; onChanged: () => void }) {
  const { api } = useSession();
  const online = useOnline();
  const [type, setType] = useState<'BOOKLET_PDF' | 'ANSWER_KEY_PDF'>('BOOKLET_PDF');
  const [state, setState] = useState<WriteState>(null);
  const upload = useMutation({
    networkMode: 'always',
    mutationFn: async (file: { uri: string; name: string }) => {
      if (!online) throw new ApiError({ kind: 'network' });
      const form = new FormData();
      form.append('type', type);
      form.append('file', { uri: file.uri, name: file.name, type: 'application/pdf' } as unknown as Blob);
      return api.request(`/api/odk/admin/exams/${encodeURIComponent(examId)}/files`, { method: 'POST', body: form });
    },
  });
  async function pick() {
    setState(null);
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.mimeType !== 'application/pdf' || !asset.size || asset.size > 30 * 1024 * 1024) { setState({ tone: 'critical', message: 'En fazla 30 MB PDF seçin.' }); return; }
    try {
      await upload.mutateAsync({ uri: asset.uri, name: asset.name });
      setState({ tone: 'success', message: 'PDF yüklendi ✅' });
      onChanged();
    } catch (error) {
      setState(writeError(error, 'Deneme değişti; yeniden deneyin.'));
    }
  }
  return (
    <Section title="PDF yükle">
      <WriteBanner state={state} />
      <FilterChips label="Dosya türü" value={type} onChange={setType} options={[{ value: 'BOOKLET_PDF', label: 'Kitapçık' }, { value: 'ANSWER_KEY_PDF', label: 'Cevap anahtarı' }]} />
      <Text tone="muted" variant="meta">Dosya özel depoya yüklenir; aynı türde yeniden yükleme eskisinin yerini alır.</Text>
      <Button mutation label="PDF seç ve yükle" variant="secondary" disabled={!online || upload.isPending} loading={upload.isPending} onPress={() => void pick()} testID="pdf-upload" />
    </Section>
  );
}

/** Puanlama sekmesi (K03c): özet, sonuç tablosu, puanla, yeniden puanla, yayın önizleme → onay → yayınla. */
export function ScoringWrites({ data, examId, onChanged }: { data: OdkExamWorkspaceView; examId: string; onChanged: () => void }) {
  const scoring = data.scoring;
  const { exam, caps } = data;
  const command = useExamCommand(examId, data.revision, onChanged);
  const [exclude, setExclude] = useState(true);
  const [confirming, setConfirming] = useState(false);
  if (!scoring) return null;
  const { summary } = scoring;
  const preview = scoring.release ? (exclude ? scoring.release.exclude : scoring.release.include) : null;
  const released = exam.status === 'RELEASED';
  async function score() {
    await command.run({ operation: 'score' }, 'Teslimler puanlandı (yayınlanmadı).', { confirm: { title: 'Teslimleri puanla', message: 'Teslim edilen oturumlar kilitli cevap anahtarıyla puanlanır. Sonuçlar henüz öğrenciye açılmaz.', label: 'Puanla' } });
  }
  async function rescore() {
    await command.run({ operation: 'rescore', input: { confirmPublishedChange: released, reason: 'Mobil yeniden puanlama' } }, 'Yeniden puanlama tamamlandı.', { confirm: { title: 'Yeniden puanla', message: released ? 'Yayınlanmış sonuçlar değişecek; öğrenciler güncel sonucu görür. Kimlik doğrulaması istenebilir.' : 'Tüm teslimler güncel cevap anahtarıyla yeniden puanlanır. Kimlik doğrulaması istenebilir.', label: 'Yeniden puanla' } });
  }
  async function release() {
    const result = await command.run({ operation: 'release', input: { excludeReviewRequired: exclude, createCoachSuggestions: true } }, 'Sonuçlar yayınlandı.');
    if (result) setConfirming(false);
  }
  return (
    <>
      <OfflineWriteNotice online={command.online} />
      <WriteBanner state={command.state} />
      <Section first title="Sonuç özeti">
        <Text tone="muted" variant="meta">Puanlama ≠ yayın. Öğrenci yalnız yayın sonrası görür.</Text>
        <Row title="Katılım / teslim" meta={`${summary.participation} / ${summary.submitted}`} />
        <Row title="Eksik" meta={String(summary.missing)} />
        <Row title="Ortalama / medyan net" meta={`${summary.averageNet == null ? '—' : summary.averageNet.toFixed(2)} / ${summary.medianNet == null ? '—' : summary.medianNet.toFixed(2)}`} />
        <Row title="İnceleme bekleyen" meta={String(summary.integrityReviewCount)} />
        {summary.scoringErrors ? <Banner tone="critical">{`${summary.scoringErrors} teslim puanlanamadı.`}</Banner> : null}
        {summary.sections.map((section) => <Row key={section.code} title={section.title} meta={`${section.averageNet == null ? '—' : section.averageNet.toFixed(2)} net${section.averageAccuracy == null ? '' : ` · %${section.averageAccuracy.toFixed(0)}`}`} />)}
      </Section>
      <Section title="İşlemler">
        {['SCHEDULED', 'LIVE', 'ENDED'].includes(exam.status) && caps.score ? (
          <Button mutation label="Teslimleri puanla" disabled={!command.online || !exam.windowEnded || command.pending} loading={command.pending} onPress={() => void score()} testID="exam-score" />
        ) : null}
        {['SCHEDULED', 'LIVE', 'ENDED'].includes(exam.status) && caps.score && !exam.windowEnded ? <Text tone="secondary">Deneme penceresi kapanınca puanlanabilir.</Text> : null}
        {caps.rescore && ['ENDED', 'SCORED', 'RELEASED'].includes(exam.status) ? (
          <Button mutation label="Yeniden puanla" variant="secondary" disabled={!command.online || command.pending} onPress={() => void rescore()} testID="exam-rescore" />
        ) : null}
      </Section>
      {preview && caps.release ? (
        <Section title="Yayın">
          <Toggle title="İnceleme bekleyenleri hariç tut" value={exclude} onChange={(next) => { setExclude(next); setConfirming(false); }} testID="release-exclude" />
          <Row title="Yayınlanacak" meta={String(preview.publishable)} />
          {preview.warnings.map((warning) => <Banner key={warning} tone="warning">{warning}</Banner>)}
          {!confirming ? (
            <Button label="Yayın önizleme" variant="secondary" disabled={preview.publishable <= 0 || (!preview.canPublish && !exclude)} onPress={() => setConfirming(true)} testID="release-preview" />
          ) : (
            <View style={styles.pair} testID="release-confirm">
              <Text variant="bodyStrong">{`${preview.publishable} öğrencinin sonucu yayınlanacak.`}</Text>
              <Text tone="secondary">Yayın geri alınamaz; öğrenciler ve veliler sonucu görür, koç önerileri oluşturulur. Kimlik doğrulaması istenebilir.</Text>
              <Button mutation label="Sonuçları yayınla" disabled={!command.online || command.pending} loading={command.pending} onPress={() => void release()} testID="release-commit" />
              <Button label="Vazgeç" variant="secondary" onPress={() => setConfirming(false)} />
            </View>
          )}
        </Section>
      ) : null}
      {scoring.rows.length ? (
        <Section title="Sonuçlar">
          {scoring.rows.map((row) => (
            <Row
              key={row.attemptId}
              title={row.name}
              subtitle={`D ${row.correct ?? '—'} · Y ${row.wrong ?? '—'} · B ${row.blank ?? '—'} · Net ${row.net == null ? '—' : row.net.toFixed(2)}${row.durationMinutes == null ? '' : ` · ${row.durationMinutes} dk`} · ${row.integrityLabel}`}
              trailing={<StatusBadge label={row.resultLabel} tone={row.result === 'ERROR' ? 'critical' : row.result === 'PUBLISHED' ? 'success' : 'neutral'} />}
            />
          ))}
        </Section>
      ) : caps.score ? <Section title="Sonuçlar"><EmptyState title="Henüz oturum yok" /></Section> : null}
    </>
  );
}

type QuestionRow = NonNullable<OdkExamWorkspaceView['questions']>['rows'][number];
type Option = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Soru düzenleme (web soru editörü): anahtar, zorluk, kitapçık sayfası ve en
 * çok 3 kazanım (biri ana). Sunucu güncel taslak listesine yalnız bu soruyu
 * uygular; içerik alanları korunur. Yalnız taslak sürümde.
 */
export function QuestionEditSheet({ data, examId, question, onClose, onSaved, onChanged }: { data: OdkExamWorkspaceView; examId: string; question: QuestionRow; onClose: () => void; onSaved: (message: string) => void; onChanged: () => void }) {
  const { api } = useSession();
  const command = useExamCommand(examId, data.revision, onChanged);
  const [option, setOption] = useState<Option | 'NONE'>(question.correctOption ? (question.correctOption as Option) : 'NONE');
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [page, setPage] = useState(question.bookletPage ? String(question.bookletPage) : '');
  const [outcomes, setOutcomes] = useState(question.outcomes);
  const [primary, setPrimary] = useState(question.primaryOutcomeId);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<{ id: string; label: string }[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const pageValue = page.trim() ? Number.parseInt(page, 10) : null;
  const validPage = pageValue == null || (Number.isInteger(pageValue) && pageValue >= 1 && pageValue <= 1000);
  async function search() {
    setSearchError(null);
    try {
      const parsed = parseOdkOutcomeOptions(await api.request(`${base(examId)}/outcomes?q=${encodeURIComponent(term.trim())}`));
      if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
      setResults(parsed.value.options);
    } catch (error) {
      setSearchError(error instanceof ApiError ? error.message : 'Kazanımlar yüklenemedi.');
    }
  }
  function add(item: { id: string; label: string }) {
    if (outcomes.length >= 3 || outcomes.some((outcome) => outcome.id === item.id)) return;
    setOutcomes([...outcomes, item]);
    if (!primary) setPrimary(item.id);
  }
  function remove(id: string) {
    const next = outcomes.filter((outcome) => outcome.id !== id);
    setOutcomes(next);
    if (primary === id) setPrimary(next[0]?.id ?? null);
  }
  async function save() {
    const result = await command.run({ operation: 'question.update', question: { id: question.id, correctOption: option === 'NONE' ? null : option, difficulty, bookletPage: pageValue, outcomeIds: outcomes.map((outcome) => outcome.id), primaryOutcomeId: primary } }, `Soru ${question.number} kaydedildi.`, { refresh: false });
    if (result) onSaved(`Soru ${question.number} kaydedildi.`);
  }
  return (
    <BottomSheet visible title={`Soru ${question.number} · ${question.section}`} onClose={() => { if (!command.pending) onClose(); }}>
      <View style={styles.pair}>
        <WriteBanner state={command.state} />
        <FilterChips label="Doğru cevap" value={option} onChange={setOption} options={[...(['A', 'B', 'C', 'D', 'E'] as const).map((value) => ({ value, label: value })), { value: 'NONE' as const, label: 'Yok' }]} />
        <FilterChips label="Zorluk" value={difficulty} onChange={setDifficulty} options={[{ value: 'EASY', label: 'Kolay' }, { value: 'MEDIUM', label: 'Orta' }, { value: 'HARD', label: 'Zor' }]} />
        <TextField label="Kitapçık sayfası" value={page} onChangeText={setPage} keyboardType="number-pad" maxLength={4} error={validPage ? undefined : '1–1000 arası bir sayfa girin.'} testID="question-page" />
        <Text variant="bodyStrong">{`Kazanımlar (${outcomes.length}/3)`}</Text>
        {outcomes.length ? outcomes.map((outcome) => (
          <Row key={outcome.id} title={outcome.label} trailing={<View style={styles.inline}><Button label={primary === outcome.id ? 'Ana' : 'Ana yap'} variant={primary === outcome.id ? 'primary' : 'secondary'} onPress={() => setPrimary(outcome.id)} testID={`question-primary-${outcome.id}`} /><Button label="Kaldır" variant="secondary" onPress={() => remove(outcome.id)} testID={`question-remove-${outcome.id}`} /></View>} />
        )) : <Text tone="secondary">Bağlı kazanım yok.</Text>}
        {outcomes.length < 3 ? (
          <>
            <TextField label="Kazanım ara" value={term} onChangeText={setTerm} autoCapitalize="none" returnKeyType="search" onSubmitEditing={() => void search()} testID="question-outcome-search" />
            <Button label="Ara" variant="secondary" onPress={() => void search()} testID="question-outcome-search-submit" />
            {searchError ? <Banner tone="critical">{searchError}</Banner> : null}
            {results ? (results.length ? results.map((item) => <Row key={item.id} title={item.label} onPress={() => add(item)} disabled={outcomes.some((outcome) => outcome.id === item.id)} testID={`question-outcome-${item.id}`} />) : <Text tone="secondary">Eşleşen kazanım yok.</Text>) : null}
          </>
        ) : null}
        <Button mutation label="Kaydet" disabled={!command.online || !validPage || command.pending} loading={command.pending} onPress={() => void save()} testID="question-save" />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ pair: { gap: 8 }, inline: { flexDirection: 'row', gap: 6 } });
