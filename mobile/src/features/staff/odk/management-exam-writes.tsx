import { parseOdkExamCommandResult, type OdkExamCommand, type OdkExamWorkspaceView } from '@contracts/odk-management-exam';
import { useMutation } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Banner, Button, EmptyState, Row, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { FilterChips } from '@/features/admin/ui';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { confirmAction, DateTimeField, OfflineWriteNotice, useOnline, useStableKey, WriteBanner, writeError, type WriteState } from '../shared';

/**
 * K03b · DENEME HAZIRLIK YAZMALARI — web `/api/odk/admin/exams/[id]/**` ile
 * aynı servisler, mobil komut ucu `POST /api/panel/odk/management/exams/[id]`.
 * Her komut işlem anahtarı + okunan çalışma alanı `revision` taşır; belirsiz
 * ağ hatasında aynı gövdeyle aynı anahtar; 409'da görünüm yenilenir.
 */
const base = (examId: string) => `/api/panel/odk/management/exams/${encodeURIComponent(examId)}`;
type Result = Extract<ReturnType<typeof parseOdkExamCommandResult>, { ok: true }>['value'];

export function useExamCommand(examId: string, revision: string, onChanged: () => void) {
  const { api } = useSession();
  const online = useOnline();
  const [state, setState] = useState<WriteState>(null);
  const key = useStableKey<{ command: OdkExamCommand; revision: string }>((a, b) => JSON.stringify(a) === JSON.stringify(b));
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: async (command: OdkExamCommand) => {
      if (!online) throw new ApiError({ kind: 'network' });
      const input = { command, revision };
      try {
        const parsed = parseOdkExamCommandResult(await api.request(base(examId), { method: 'POST', body: command, headers: { 'X-Od-Idempotency-Key': key.keyFor(input), 'X-Od-Expected-Revision': revision } }));
        if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
        key.settle();
        return parsed.value;
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
      setState(writeError(error, 'Deneme başka bir işlemde değişti. Güncel çalışma alanı yüklendi; kontrol edip yeniden deneyin.'));
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
export function ScheduleWrites({ data, examId, onChanged }: { data: OdkExamWorkspaceView; examId: string; onChanged: () => void }) {
  const { exam, caps } = data;
  const schedule = data.schedule!;
  const command = useExamCommand(examId, data.revision, onChanged);
  const editable = caps.edit && (exam.status === 'DRAFT' || exam.status === 'READY');
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
    <>
      <OfflineWriteNotice online={command.online} />
      <WriteBanner state={command.state} />
      {editable ? (
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
      ) : null}
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

/** Oturumlar sekmesi: oturum süreleri ve aralar (yalnız taslak sürüm). */
export function SessionWrites({ data, examId, onChanged }: { data: OdkExamWorkspaceView; examId: string; onChanged: () => void }) {
  const sessions = data.sessions ?? [];
  const command = useExamCommand(examId, data.revision, onChanged);
  const [values, setValues] = useState(() => Object.fromEntries(sessions.map((item) => [item.key, { duration: String(item.durationMinutes), pause: String(item.breakAfterMinutes) }])));
  if (!data.caps.edit || !data.exam.draftEditable) return null;
  const parsed = sessions.map((item) => ({ key: item.key, durationMinutes: Number.parseInt(values[item.key]?.duration ?? '', 10), breakAfterMinutes: Number.parseInt(values[item.key]?.pause ?? '', 10) }));
  const valid = parsed.every((item) => Number.isInteger(item.durationMinutes) && Number.isInteger(item.breakAfterMinutes));
  return (
    <Section title="Süreleri düzenle">
      <WriteBanner state={command.state} />
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
      setState({ tone: 'success', message: 'PDF yüklendi.' });
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

const styles = StyleSheet.create({ pair: { gap: 8 } });
