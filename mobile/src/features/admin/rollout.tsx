import { MOCK_EXAM_MAX_REASONS, parseMockExamPaste, type MobileMockExams, type MobilePilot, type MockExamErrorCode, type MockExamTypeCode } from '@contracts/admin-rollout';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { createMockExam, createPilotCohort, fetchAdminMockExams, fetchPilot, reviseMockExam, transitionPilotCohort, type MockExamEntry } from '@/lib/api/admin-rollout';
import { formatDayMonth, formatShortDateTime, istanbulDateKey } from '@/lib/format/istanbul';

import { adminErrorText, QueryView, useAdminMutation, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips, SearchPicker } from './ui';

type Notice = { tone: 'info' | 'critical'; text: string } | null;

/* ================================================================== *
 * KONTROLLÜ YAYIN (Y25) — web `yonetim/pilot` ile AYNI yükleyici ve
 * `pilot-cohorts*` uçları. Kohort oluşturmak erişimi açmaz; aktivasyon
 * kapıları sunucuda denetlenir. İzinli geçişler sunucudan gelir.
 * ================================================================== */

export function PilotScreen() {
  const query = useAdminQuery('pilot', (api, signal) => fetchPilot(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-pilot">
      <QueryView query={query}>{(data) => <PilotBody data={data} />}</QueryView>
    </Screen>
  );
}

const CHECK_TONE = { PASS: 'success', BLOCK: 'critical', WAIT: 'warning' } as const;

function PilotBody({ data }: { data: MobilePilot }) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [stopReason, setStopReason] = useState(data.stopReasons[0]?.value ?? 'OPERATIONAL');
  const [notice, setNotice] = useState<Notice>(null);
  const create = useAdminMutation((api, id: string, { idempotencyKey }) => createPilotCohort(api, id, idempotencyKey));
  const transition = useAdminMutation((api, input: Parameters<typeof transitionPilotCohort>[1], { idempotencyKey }) => transitionPilotCohort(api, input, idempotencyKey));
  const busy = create.isPending || transition.isPending;

  async function run(action: () => Promise<unknown>, success: string) {
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'info', text: success });
    } catch (cause) {
      setNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'İşlem kaydedilemedi.' });
    }
  }

  function onTransition(cohort: MobilePilot['cohorts'][number], item: MobilePilot['cohorts'][number]['actions'][number]) {
    const success = item.action === 'ACTIVATE' || item.action === 'RESUME' ? 'Pilot erişimi etkinleştirildi.' : item.action === 'COMPLETE' ? 'Pilot tamamlandı; kayıtlar korundu.' : 'Pilot erişimi güvenle durduruldu; kayıtlar korunuyor.';
    const perform = () => void run(() => transition.mutateAsync({ cohortId: cohort.id, action: item.action, expectedVersion: cohort.version, ...(item.needsReason ? { stopReason } : {}) }), success);
    Alert.alert(`${cohort.groupName}: ${item.label}`, item.needsReason ? `Durdurma nedeni: ${data.stopReasons.find((reason) => reason.value === stopReason)?.label ?? stopReason}` : 'Bu geçiş pilot üyelerinin erişimini etkiler.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: item.label, style: item.destructive ? 'destructive' : 'default', onPress: perform },
    ]);
  }

  return (
    <>
      <PageHeader title="Kontrollü yayın" description="Önce küçük kohort, sonra kanıtlı genişleme." context={<StatusBadge label={data.meta} tone={data.readiness.canExpand ? 'success' : data.readiness.canActivate ? 'info' : 'warning'} />} />
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      <Section title="Yayın hazırlık kapıları" first>
        <Text tone="muted" variant="meta">“Veri bekliyor” pilotu başlatmaya engel değildir; genişletmeden önce gerçek örneklemle hedefe dönüşmelidir.</Text>
        {data.readiness.checks.map((item) => (
          <Row key={item.key} title={item.label} subtitle={item.detail} trailing={<StatusBadge label={item.statusLabel} tone={CHECK_TONE[item.status]} />} testID={`pilot-check-${item.key}`} />
        ))}
      </Section>
      <Section title="Gruptan pilot kohortu oluştur">
        <Text tone="muted" variant="meta">Öğretmen, aktif öğrenciler, bağlı veliler ve işlemi yapan yönetici tek kohorta alınır. Eksik rol varsa pilot oluşmaz.</Text>
        <SearchPicker label="Aktif grup" options={data.groups.map((group) => ({ id: group.id, name: `${group.name} · ${group.detail}` }))} value={groupId} onChange={setGroupId} testID="pilot-group" />
        <Button label="Pilot taslağı oluştur" onPress={() => groupId && void run(() => create.mutateAsync(groupId).then(() => setGroupId(null)), 'Dört rollü pilot taslağı oluşturuldu; aktivasyon kapılarını kontrol edin.')} disabled={!groupId || busy} loading={create.isPending} testID="pilot-create" />
        <Text tone="muted" variant="meta">Kohort oluşturmak erişimi açmaz. Aktivasyon; ortam, güvenlik, restore, dört rol ve SLO kapılarından geçer.</Text>
      </Section>
      <Section title="Yayın yaşam döngüsü">
        <Text tone="muted" variant="meta">Sürüm kontrolü eski görünümün yeni kararı ezmesini engeller.</Text>
        <Text variant="label">Durdurma nedeni</Text>
        <FilterChips label="Durdurma nedeni" value={stopReason} onChange={setStopReason} options={data.stopReasons} />
        {data.cohorts.length ? (
          data.cohorts.map((cohort) => (
            <View key={cohort.id} style={styles.card} testID={`pilot-cohort-${cohort.id}`}>
              <Row
                title={cohort.groupName}
                subtitle={`${cohort.memberCount} üye · Yönetici ${cohort.coverage.ADMIN} · Öğretmen ${cohort.coverage.TEACHER} · Öğrenci ${cohort.coverage.STUDENT} · Veli ${cohort.coverage.PARENT}`}
                meta={`v${cohort.version} · ${formatShortDateTime(cohort.createdAt)}`}
                trailing={<StatusBadge label={cohort.statusLabel} tone={cohort.tone} />}
              />
              {cohort.actions.length ? (
                <View style={styles.actions}>
                  {cohort.actions.map((item) => (
                    <Button key={item.action} label={item.label} variant={item.destructive ? 'destructive' : item.action === 'ACTIVATE' || item.action === 'RESUME' ? 'primary' : 'secondary'} disabled={busy} onPress={() => onTransition(cohort, item)} testID={`pilot-${item.action}-${cohort.id}`} />
                  ))}
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <EmptyState title="Henüz pilot kohortu yok" />
        )}
      </Section>
    </>
  );
}

/* ================================================================== *
 * DIŞ DENEMELER (Y18) — web `yonetim/denemeler` (`MockExamWorkspace`) ile
 * AYNI veri ve kurallar: hızlı giriş (elle / toplu yapıştırma), kişisel
 * hata eğilimi, tek "sonraki küçük eylem" onayı ve neden revizyonu.
 * ================================================================== */

export function MockExamsScreen() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const query = useAdminQuery('mock-exams', (api, signal) => fetchAdminMockExams(api, studentId, signal), { params: { ogrenci: studentId ?? '' } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-mock-exams">
      <PageHeader title="Sonuç analizi" description="Deneme sonucunu nedene ve eyleme bağla; sınıf sırası veya yüzdelik üretilmez." />
      <QueryView query={query}>{(data) => <MockExamsBody data={data} onStudent={setStudentId} />}</QueryView>
    </Screen>
  );
}

function MockExamsBody({ data, onStudent }: { data: MobileMockExams; onStudent: (id: string | null) => void }) {
  const [notice, setNotice] = useState<Notice>(null);
  const [editing, setEditing] = useState<MobileMockExams['exams'][number] | null>(null);
  const [picking, setPicking] = useState(false);
  const revise = useAdminMutation((api, input: { examId: string; body: Parameters<typeof reviseMockExam>[2] }, { idempotencyKey }) => reviseMockExam(api, input.examId, input.body, idempotencyKey));
  const labels = Object.fromEntries(data.errorCategories.map((item) => [item.value, item.label])) as Record<MockExamErrorCode, string>;
  const student = data.students.find((item) => item.id === data.studentId) ?? null;
  const approvalExam = data.approval ? data.exams.find((exam) => exam.id === data.approval!.examId) : undefined;

  async function approve() {
    if (!data.approval || !approvalExam) return;
    setNotice(null);
    try {
      await revise.mutateAsync({ examId: approvalExam.id, body: { reasons: approvalExam.sections.map((section) => ({ sectionId: section.id, categories: section.errors })), nextAction: data.approval.action, expectedRevision: approvalExam.revision } });
      setNotice({ tone: 'info', text: 'Sonraki küçük eylem öğretmen tarafından onaylandı.' });
    } catch (cause) {
      setNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'Eylem onaylanamadı.' });
    }
  }

  return (
    <>
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      <Section title="Öğrenci" first>
        {data.students.length ? (
          <SearchPicker
            label="Öğrenci"
            options={data.students}
            value={picking ? null : (student?.id ?? null)}
            onChange={(id) => {
              // Seçimi kaldırmak yalnız aramayı açar; görünüm yeni öğrenci seçilince değişir.
              setPicking(!id);
              if (id) onStudent(id);
            }}
            testID="mock-student"
          />
        ) : (
          <EmptyState title="Aktif öğrenci yok" />
        )}
      </Section>
      {student ? <EntryForm data={data} studentId={student.id} onSaved={(text) => setNotice({ tone: 'info', text })} /> : null}
      <Section title="Kişisel hata eğilimi">
        <Text tone="muted" variant="meta">Sonuçlar yalnız öğrencinin kendi denemeleriyle karşılaştırılır.</Text>
        {data.trend.heatmap.length ? (
          data.trend.heatmap.map((row) => {
            const marks = row.counts.map((count, index) => (count ? `${data.errorCategories[index].label} ${count}` : null)).filter(Boolean);
            return <Row key={row.key} title={row.subject} subtitle={marks.length ? marks.join(' · ') : 'İşaret yok'} testID={`mock-heat-${row.key}`} />;
          })
        ) : (
          <Text tone="muted">İlk deneme kaydedildiğinde eğilim oluşacak.</Text>
        )}
      </Section>
      <Section title="Sonraki küçük eylem">
        {data.trend.recurring ? (
          <Banner tone="warning" title={`${data.trend.recurring.label} · son 3 denemede ${data.trend.recurring.count} işaret`}>
            {data.trend.recurring.action}
          </Banner>
        ) : (
          <Text tone="muted">Tekrarlayan bir neden oluştuğunda burada yalnız bir uygulanabilir adım gösterilecek.</Text>
        )}
        {data.approval && approvalExam ? <Button label="Öğretmen olarak onayla" onPress={() => void approve()} disabled={revise.isPending} loading={revise.isPending} testID="mock-approve" /> : null}
      </Section>
      <Section title="Son denemeler">
        {data.exams.length ? (
          data.exams.map((exam) => (
            <View key={exam.id} style={styles.card} testID={`mock-exam-${exam.id}`}>
              <Row
                title={`${exam.title || 'Adsız deneme'}${exam.publisher ? ` · ${exam.publisher}` : ''}`}
                subtitle={`${exam.exam} · ${formatDayMonth(exam.takenAt)} · ${exam.correct} doğru · ${exam.incorrect} yanlış · ${exam.blank} boş${exam.durationMinutes ? ` · ${exam.durationMinutes} dk` : ''}`}
                meta={exam.sections.flatMap((section) => section.errors.map((error) => `${section.subjectName}: ${labels[error]}`)).join(' · ') || null}
                trailing={<StatusBadge label={`${exam.net.toLocaleString('tr-TR')} net`} tone="info" />}
              />
              {exam.nextAction ? <Banner tone="success">Öğretmen onaylı adım: {exam.nextAction}</Banner> : null}
              <Button label="Hata nedenlerini gözden geçir" variant="quiet" onPress={() => setEditing(exam)} testID={`mock-reasons-${exam.id}`} />
            </View>
          ))
        ) : (
          <Text tone="muted">Henüz deneme kaydı yok.</Text>
        )}
      </Section>
      {editing ? <ReasonSheet exam={editing} categories={data.errorCategories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice({ tone: 'info', text: 'Hata nedenleri kaydedildi; değişiklik audit izine alındı.' }); }} /> : null}
    </>
  );
}

type SectionDraft = { code: string; name: string; questions: number; correct: string; incorrect: string; blank: string; duration: string; reasons: MockExamErrorCode[] };
const toNumber = (value: string) => (/^\d{1,3}$/.test(value.trim()) ? Number(value.trim()) : NaN);
const draftFor = (template: MobileMockExams['templates'][number]): SectionDraft[] => template.sections.map((section) => ({ code: section.code, name: section.name, questions: section.questions, correct: '0', incorrect: '0', blank: String(section.questions), duration: '', reasons: [] }));

function EntryForm({ data, studentId, onSaved }: { data: MobileMockExams; studentId: string; onSaved: (text: string) => void }) {
  const [exam, setExam] = useState<MockExamTypeCode>(data.templates[0]?.exam ?? 'LGS');
  const template = data.templates.find((item) => item.exam === exam) ?? data.templates[0];
  const [sections, setSections] = useState<SectionDraft[]>(() => draftFor(template));
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [date, setDate] = useState(() => istanbulDateKey(new Date()));
  const [duration, setDuration] = useState(String(template.defaultDuration));
  const [paste, setPaste] = useState('');
  const [pasted, setPasted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<number | null>(null);
  const save = useAdminMutation((api, input: MockExamEntry, { idempotencyKey }) => createMockExam(api, input, idempotencyKey));
  const reasonCount = sections.reduce((sum, section) => sum + section.reasons.length, 0);
  const sectionValid = (section: SectionDraft) => [section.correct, section.incorrect, section.blank].every((value) => Number.isInteger(toNumber(value))) && toNumber(section.correct) + toNumber(section.incorrect) + toNumber(section.blank) === section.questions && (!section.duration.trim() || Number.isInteger(toNumber(section.duration)));
  const totalMinutes = toNumber(duration);
  const valid = sections.every(sectionValid) && /^\d{4}-\d{2}-\d{2}$/.test(date) && (!duration.trim() || Number.isInteger(totalMinutes));

  const touch = () => {
    if (startedAt.current === null) startedAt.current = Date.now();
  };
  function changeExam(next: MockExamTypeCode) {
    touch();
    const nextTemplate = data.templates.find((item) => item.exam === next)!;
    setExam(next);
    setSections(draftFor(nextTemplate));
    setDuration(String(nextTemplate.defaultDuration));
    setPasted(false);
  }
  function patch(index: number, value: Partial<SectionDraft>) {
    touch();
    setSections((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)));
  }
  function toggleReason(index: number, category: MockExamErrorCode) {
    const has = sections[index].reasons.includes(category);
    if (!has && reasonCount >= MOCK_EXAM_MAX_REASONS) return setError('Bir deneme için en fazla üç hata nedeni seçebilirsiniz.');
    setError(null);
    patch(index, { reasons: has ? sections[index].reasons.filter((item) => item !== category) : [...sections[index].reasons, category] });
  }
  function applyPaste() {
    touch();
    const result = parseMockExamPaste(paste, sections.map((section) => section.questions));
    if (!result.ok) return setError(result.message);
    setError(null);
    setSections((current) => current.map((section, index) => ({ ...section, correct: String(result.rows[index].correctCount), incorrect: String(result.rows[index].incorrectCount), blank: String(result.rows[index].blankCount), duration: result.rows[index].durationMinutes ? String(result.rows[index].durationMinutes) : '' })));
    setPasted(true);
  }
  async function submit() {
    setError(null);
    try {
      await save.mutateAsync({
        studentId,
        exam,
        title: title.trim(),
        publisher: publisher.trim(),
        // Web formu gibi günün öğlesi (İstanbul) — tarih kayması olmaz.
        takenAt: new Date(`${date}T12:00:00+03:00`).toISOString(),
        durationMinutes: duration.trim() ? totalMinutes : null,
        entryDurationMs: startedAt.current ? Math.min(Date.now() - startedAt.current, 30 * 60 * 1000) : 0,
        source: pasted ? 'PASTE' : 'MANUAL',
        sections: sections.map((section) => ({ subjectCode: section.code, correctCount: toNumber(section.correct), incorrectCount: toNumber(section.incorrect), blankCount: toNumber(section.blank), durationMinutes: section.duration.trim() ? toNumber(section.duration) : null, errorCategories: section.reasons })),
      });
      setTitle('');
      setPublisher('');
      setSections(draftFor(template));
      setPasted(false);
      startedAt.current = null;
      onSaved('Deneme kaydedildi. Analiz yeni kayıtla güncellendi.');
    } catch (cause) {
      setError(adminErrorText(cause) ?? 'Deneme kaydedilemedi.');
    }
  }

  return (
    <Section title="Hızlı deneme girişi">
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <FilterChips label="Sınav" value={exam} onChange={changeExam} options={data.templates.map((item) => ({ value: item.exam, label: item.label }))} />
      <TextField label="Deneme adı (isteğe bağlı)" value={title} onChangeText={setTitle} maxLength={120} testID="mock-title" />
      <TextField label="Yayınevi (isteğe bağlı)" value={publisher} onChangeText={setPublisher} maxLength={120} />
      <TextField label="Tarih (YYYY-AA-GG)" value={date} onChangeText={setDate} maxLength={10} autoCorrect={false} testID="mock-date" />
      <TextField label="Toplam süre (dk)" value={duration} onChangeText={setDuration} keyboardType="number-pad" maxLength={3} />
      <TextField label="Toplu yapıştır" value={paste} onChangeText={setPaste} multiline hint={`${sections.length} satır: doğru yanlış boş [süre]`} testID="mock-paste" />
      <Button label="Toplu değerleri uygula" variant="quiet" onPress={applyPaste} disabled={!paste.trim()} testID="mock-paste-apply" />
      {sections.map((section, index) => {
        const ok = sectionValid(section);
        return (
          <View key={section.code} style={styles.card}>
            <Text variant="bodyStrong">
              {section.name} · {section.questions} soru
            </Text>
            <View style={styles.grid}>
              <View style={styles.cell}><TextField label="Doğru" value={section.correct} onChangeText={(value) => patch(index, { correct: value })} keyboardType="number-pad" maxLength={3} testID={`mock-${section.code}-correct`} /></View>
              <View style={styles.cell}><TextField label="Yanlış" value={section.incorrect} onChangeText={(value) => patch(index, { incorrect: value })} keyboardType="number-pad" maxLength={3} testID={`mock-${section.code}-incorrect`} /></View>
              <View style={styles.cell}><TextField label="Boş" value={section.blank} onChangeText={(value) => patch(index, { blank: value })} keyboardType="number-pad" maxLength={3} testID={`mock-${section.code}-blank`} /></View>
              <View style={styles.cell}><TextField label="Süre" value={section.duration} onChangeText={(value) => patch(index, { duration: value })} keyboardType="number-pad" maxLength={3} /></View>
            </View>
            {ok ? null : <StatusBadge label={`Toplam ${section.questions} soru olmalı`} tone="critical" />}
            <FilterChips label={`${section.name} hata nedenleri`} value={'' as MockExamErrorCode} onChange={(category) => toggleReason(index, category)} options={data.errorCategories.map((item) => ({ value: item.value, label: section.reasons.includes(item.value) ? `✓ ${item.label}` : item.label }))} />
          </View>
        );
      })}
      <Button label="Denemeyi kaydet" onPress={() => void submit()} disabled={!valid || save.isPending} loading={save.isPending} testID="mock-submit" />
      <Text tone="muted" variant="meta">Yönetici kaydı hassastır; kimliğini yeniden doğrulaman istenebilir.</Text>
    </Section>
  );
}

function ReasonSheet({ exam, categories, onClose, onSaved }: { exam: MobileMockExams['exams'][number]; categories: MobileMockExams['errorCategories']; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, MockExamErrorCode[]>>(() => Object.fromEntries(exam.sections.map((section) => [section.id, section.errors])));
  const [error, setError] = useState<string | null>(null);
  const revise = useAdminMutation((api, body: Parameters<typeof reviseMockExam>[2], { idempotencyKey }) => reviseMockExam(api, exam.id, body, idempotencyKey));
  const count = Object.values(values).reduce((sum, list) => sum + list.length, 0);
  function toggle(sectionId: string, category: MockExamErrorCode) {
    const has = values[sectionId].includes(category);
    if (!has && count >= MOCK_EXAM_MAX_REASONS) return setError('En fazla üç neden seçilebilir.');
    setError(null);
    setValues((current) => ({ ...current, [sectionId]: has ? current[sectionId].filter((item) => item !== category) : [...current[sectionId], category] }));
  }
  return (
    <BottomSheet visible title={exam.title || 'Adsız deneme'} onClose={onClose}>
      {error ? <Banner tone="critical">{error}</Banner> : null}
      {exam.sections.map((section) => (
        <View key={section.id} style={styles.card}>
          <Text variant="label">{section.subjectName}</Text>
          <FilterChips label={`${section.subjectName} nedenleri`} value={'' as MockExamErrorCode} onChange={(category) => toggle(section.id, category)} options={categories.map((item) => ({ value: item.value, label: values[section.id].includes(item.value) ? `✓ ${item.label}` : item.label }))} />
        </View>
      ))}
      <Button
        label="Nedenleri kaydet"
        loading={revise.isPending}
        disabled={revise.isPending}
        onPress={async () => {
          setError(null);
          try {
            await revise.mutateAsync({ reasons: exam.sections.map((section) => ({ sectionId: section.id, categories: values[section.id] })), expectedRevision: exam.revision });
            onSaved();
          } catch (cause) {
            setError(adminErrorText(cause));
          }
        }}
        testID="mock-reasons-save"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[2], paddingVertical: space[2] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  cell: { flexGrow: 1, flexBasis: '45%' },
});
