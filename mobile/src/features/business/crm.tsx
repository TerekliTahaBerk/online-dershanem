import type { MobileBusinessConversation, MobileBusinessLead, MobileBusinessSection } from '@contracts/business';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, Row, Section, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { useStepUp } from '@/features/auth/step-up';
import { adminErrorText } from '@/features/admin/shared';
import { runWithStepUp } from '@/features/admin/step-up-retry';
import { FilterChips, SearchPicker } from '@/features/admin/ui';
import { ApiError } from '@/lib/api/errors';
import { runCrm, sendBusinessReply, type CrmCommandInput } from '@/lib/api/business';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { newUuid } from '@/lib/ids';
import { queryKeys } from '@/lib/query/keys';

/**
 * İŞLETME CRM YAZMALARI (P2.7b) — web formlarıyla AYNI komutlar ve kurallar
 * (`POST /api/panel/business/crm`, yanıt için mevcut Instagram gönderim
 * ucu). Her gönderim yeni işlem anahtarı üretir; kaydı değiştiren komutlar
 * ekrandaki revizyonu taşır, 409'da görünüm yenilenir (sessiz üzerine yazma
 * yok). Başarı yalnız sunucu onayından sonra gösterilir.
 */

type Notice = { tone: 'info' | 'critical'; text: string } | null;

export function useBusinessMutation<V, R = void>(mutate: (variables: V, idempotencyKey: string) => Promise<R>) {
  const { requestStepUp } = useStepUp();
  const client = useQueryClient();
  const bootstrap = useReadyBootstrap();
  const invalidate = () => client.invalidateQueries({ queryKey: queryKeys.business(bootstrap.user.id) });
  return useMutation({
    mutationFn: (variables: V) => {
      const key = newUuid();
      return runWithStepUp(() => mutate(variables, key), requestStepUp);
    },
    onSuccess: () => invalidate(),
    onError: (error) => {
      if (error instanceof ApiError && error.kind === 'conflict') void invalidate();
    },
  });
}

export function useCrm() {
  const { api } = useSession();
  return useBusinessMutation((input: { command: CrmCommandInput; revision?: string }, idempotencyKey) => runCrm(api, input.command, { idempotencyKey, expectedRevision: input.revision }));
}

/** "YYYY-AA-GG SS:DD" (İstanbul) → ISO. Geçersizse null. */
export function istanbulDateTime(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2] ?? '09:00'}:00+03:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function useRunner() {
  const crm = useCrm();
  const [notice, setNotice] = useState<Notice>(null);
  async function run(command: CrmCommandInput, success: string, revision?: string) {
    setNotice(null);
    try {
      await crm.mutateAsync({ command, revision });
      setNotice({ tone: 'info', text: success });
      return true;
    } catch (cause) {
      setNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'İşlem kaydedilemedi.' });
      return false;
    }
  }
  return { run, notice, busy: crm.isPending };
}

/* ------------------------------------------------------------------ *
 * Konuşma
 * ------------------------------------------------------------------ */

export function ConversationActions({ data, conversation }: { data: MobileBusinessSection; conversation: MobileBusinessConversation }) {
  const { run, notice, busy } = useRunner();
  const { api } = useSession();
  const reply = useBusinessMutation((text: string, key) => sendBusinessReply(api, conversation.id, text, key));
  const [status, setStatus] = useState(conversation.status);
  const [aiMode, setAiMode] = useState(conversation.aiMode);
  const [assignee, setAssignee] = useState<string | null>(conversation.assignedUserId ?? '');
  const [tag, setTag] = useState('');
  const [text, setText] = useState('');
  const [replyNotice, setReplyNotice] = useState<Notice>(null);
  const [note, setNote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const id = conversation.id;
  // Sunucudan yeni revizyon gelince seçimler güncel kayda hizalanır (mesajlar korunur).
  useEffect(() => {
    setStatus(conversation.status);
    setAiMode(conversation.aiMode);
    setAssignee(conversation.assignedUserId ?? '');
  }, [conversation.revision, conversation.status, conversation.aiMode, conversation.assignedUserId]);

  async function send() {
    setReplyNotice(null);
    try {
      await reply.mutateAsync(text.trim());
      setText('');
      setReplyNotice({ tone: 'info', text: 'Yanıt gönderim kuyruğuna alındı.' });
    } catch (cause) {
      setReplyNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'Mesaj gönderilemedi.' });
    }
  }

  return (
    <>
      {data.can.conversationReply ? (
        <Section title="Yanıt">
          {replyNotice ? <Banner tone={replyNotice.tone}>{replyNotice.text}</Banner> : null}
          {conversation.aiSuggestion ? <Button label="AI önerisini kullan" variant="quiet" onPress={() => setText(conversation.aiSuggestion ?? '')} testID="crm-use-suggestion" /> : null}
          <TextField label="Mesaj" value={text} onChangeText={setText} multiline maxLength={1500} testID="crm-reply-text" />
          <Button label="Gönder" onPress={() => void send()} disabled={!text.trim() || reply.isPending} loading={reply.isPending} testID="crm-reply-send" />
        </Section>
      ) : null}
      <Section title="Konuşma işlemleri">
        {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
        {data.can.conversationRead ? <Button label="Okundu işaretle" variant="secondary" disabled={busy} onPress={() => void run({ type: 'conversation.read', conversationId: id }, 'Konuşma okundu olarak işaretlendi.')} testID="crm-read" /> : null}
        {data.can.conversationReply ? (
          <>
            <Text variant="label">Durum</Text>
            <FilterChips label="Konuşma durumu" value={status} onChange={setStatus} options={data.options.statuses} />
            <Text variant="label">AI modu</Text>
            <FilterChips label="AI modu" value={aiMode} onChange={setAiMode} options={data.options.aiModes} />
            <Button label="Denetimi kaydet" variant="secondary" disabled={busy || (status === conversation.status && aiMode === conversation.aiMode)} onPress={() => void run({ type: 'conversation.control', conversationId: id, status, aiMode }, 'Konuşma denetimi kaydedildi; sorumlu sen oldun.', conversation.revision)} testID="crm-control" />
            <Button label="AI önerisi üret" variant="quiet" disabled={busy} onPress={() => void run({ type: 'conversation.ai_suggest', conversationId: id }, 'AI önerisi üretildi.')} testID="crm-ai-suggest" />
            <SearchPicker label="Sorumlu personel" options={conversation.staff.filter((item) => item.value).map((item) => ({ id: item.value, name: item.label }))} value={assignee || null} onChange={(value) => setAssignee(value ?? '')} testID="crm-assignee" />
            <Button label={assignee ? 'Ata' : 'Atamayı kaldır'} variant="secondary" disabled={busy || (assignee ?? '') === (conversation.assignedUserId ?? '')} onPress={() => void run({ type: 'conversation.assign', conversationId: id, assignedUserId: assignee ?? '' }, 'Sorumlu güncellendi.', conversation.revision)} testID="crm-assign" />
            <TextField label="Etiket" value={tag} onChangeText={setTag} maxLength={40} testID="crm-tag" />
            <Button label="Etiket ekle" variant="quiet" disabled={busy || !tag.trim()} onPress={async () => { if (await run({ type: 'conversation.tag', conversationId: id, tag: tag.trim() }, 'Etiket eklendi.')) setTag(''); }} testID="crm-tag-add" />
          </>
        ) : null}
      </Section>
      {conversation.leadId && data.can.leadWrite ? (
        <Section title="Aday notu ve görev">
          <TextField label="Not" value={note} onChangeText={setNote} maxLength={2000} testID="crm-conv-note" />
          <Button label="Not ekle" variant="quiet" disabled={busy || note.trim().length < 2} onPress={async () => { if (await run({ type: 'lead.note', leadId: conversation.leadId!, note: note.trim() }, 'Not eklendi.')) setNote(''); }} testID="crm-conv-note-add" />
          <TextField label="Görev" value={taskTitle} onChangeText={setTaskTitle} maxLength={160} testID="crm-conv-task" />
          <TextField label="Son tarih (YYYY-AA-GG SS:DD, isteğe bağlı)" value={taskDue} onChangeText={setTaskDue} maxLength={16} autoCorrect={false} />
          <Button
            label="Görev oluştur"
            variant="quiet"
            disabled={busy || taskTitle.trim().length < 2 || (taskDue.trim() !== '' && !istanbulDateTime(taskDue))}
            onPress={async () => {
              if (await run({ type: 'lead.task', leadId: conversation.leadId!, title: taskTitle.trim(), ...(taskDue.trim() ? { dueAt: istanbulDateTime(taskDue)! } : {}) }, 'Görev oluşturuldu.')) {
                setTaskTitle('');
                setTaskDue('');
              }
            }}
            testID="crm-conv-task-add"
          />
        </Section>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Aday
 * ------------------------------------------------------------------ */

export function LeadActions({ data, lead }: { data: MobileBusinessSection; lead: MobileBusinessLead }) {
  const router = useRouter();
  const { run, notice, busy } = useRunner();
  const [stage, setStage] = useState(lead.stage);
  const [lostReason, setLostReason] = useState('');
  const [lostDetail, setLostDetail] = useState('');
  const [owner, setOwner] = useState<string | null>(lead.assignedUserId ?? '');
  const [priority, setPriority] = useState(lead.priority);
  const [followAt, setFollowAt] = useState('');
  const [followNote, setFollowNote] = useState('');
  const [followTask, setFollowTask] = useState('');
  const [note, setNote] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [orderProduct, setOrderProduct] = useState<'OD' | 'ODK'>('OD');
  const [orderId, setOrderId] = useState('');
  const [studentUserId, setStudentUserId] = useState('');
  const id = lead.id;
  useEffect(() => {
    setStage(lead.stage);
    setOwner(lead.assignedUserId ?? '');
    setPriority(lead.priority);
  }, [lead.revision, lead.stage, lead.assignedUserId, lead.priority]);
  const confirm = (title: string, body: string, action: () => void) => Alert.alert(title, body, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Onayla', style: 'destructive', onPress: action }]);

  return (
    <>
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      <Section title="Aşama">
        <FilterChips label="Aşama" value={stage} onChange={setStage} options={data.options.stages} />
        {stage === 'LOST' ? (
          <>
            <Text variant="label">Kayıp nedeni</Text>
            <FilterChips label="Kayıp nedeni" value={lostReason} onChange={setLostReason} options={data.options.lostReasons} />
            <TextField label="Açıklama (isteğe bağlı)" value={lostDetail} onChangeText={setLostDetail} maxLength={500} />
          </>
        ) : null}
        <Button label="Aşamayı güncelle" disabled={busy || stage === lead.stage || (stage === 'LOST' && !lostReason)} onPress={() => void run({ type: 'lead.stage', leadId: id, stage, ...(stage === 'LOST' ? { lostReasonCode: lostReason, ...(lostDetail.trim() ? { lostReasonDetail: lostDetail.trim() } : {}) } : {}) }, 'Aşama güncellendi.', lead.revision)} testID="crm-stage-save" />
      </Section>
      <Section title="Sorumlu ve öncelik">
        <SearchPicker label="Sorumlu" options={lead.owners.filter((item) => item.value).map((item) => ({ id: item.value, name: item.label }))} value={owner || null} onChange={(value) => setOwner(value ?? '')} testID="crm-owner" />
        <Button label={owner ? 'Sorumluyu kaydet' : 'Sorumluyu kaldır'} variant="secondary" disabled={busy || (owner ?? '') === (lead.assignedUserId ?? '')} onPress={() => void run({ type: 'lead.owner', leadId: id, assignedUserId: owner ?? '' }, 'Sorumlu güncellendi.', lead.revision)} testID="crm-owner-save" />
        <FilterChips label="Öncelik" value={priority} onChange={setPriority} options={data.options.priorities} />
        <Button label="Önceliği kaydet" variant="secondary" disabled={busy || priority === lead.priority} onPress={() => void run({ type: 'lead.priority', leadId: id, priority }, 'Öncelik güncellendi.', lead.revision)} testID="crm-priority-save" />
      </Section>
      <Section title="Takip planla">
        <TextField label="Takip zamanı (YYYY-AA-GG SS:DD)" value={followAt} onChangeText={setFollowAt} maxLength={16} autoCorrect={false} testID="crm-follow-at" />
        <TextField label="Not (isteğe bağlı)" value={followNote} onChangeText={setFollowNote} maxLength={2000} />
        <TextField label="Görev başlığı (isteğe bağlı)" value={followTask} onChangeText={setFollowTask} maxLength={160} />
        <Button
          label="Takibi kaydet"
          variant="secondary"
          disabled={busy || !istanbulDateTime(followAt)}
          onPress={async () => {
            if (await run({ type: 'lead.follow_up', leadId: id, nextFollowUpAt: istanbulDateTime(followAt)!, ...(followNote.trim() ? { note: followNote.trim() } : {}), ...(followTask.trim() ? { taskTitle: followTask.trim() } : {}) }, 'Takip planlandı.', lead.revision)) {
              setFollowAt('');
              setFollowNote('');
              setFollowTask('');
            }
          }}
          testID="crm-follow-save"
        />
      </Section>
      <Section title="Not ve görev">
        <TextField label="Not" value={note} onChangeText={setNote} maxLength={2000} testID="crm-note" />
        <Button label="Not ekle" variant="quiet" disabled={busy || note.trim().length < 2} onPress={async () => { if (await run({ type: 'lead.note', leadId: id, note: note.trim() }, 'Not eklendi.')) setNote(''); }} testID="crm-note-add" />
        <TextField label="Görev" value={taskTitle} onChangeText={setTaskTitle} maxLength={160} testID="crm-task" />
        <TextField label="Son tarih (YYYY-AA-GG SS:DD, isteğe bağlı)" value={taskDue} onChangeText={setTaskDue} maxLength={16} autoCorrect={false} testID="crm-task-due" />
        <Button
          label="Görev oluştur"
          variant="quiet"
          disabled={busy || taskTitle.trim().length < 2 || (taskDue.trim() !== '' && !istanbulDateTime(taskDue))}
          onPress={async () => {
            if (await run({ type: 'lead.task', leadId: id, title: taskTitle.trim(), ...(taskDue.trim() ? { dueAt: istanbulDateTime(taskDue)! } : {}) }, 'Görev oluşturuldu.')) {
              setTaskTitle('');
              setTaskDue('');
            }
          }}
          testID="crm-task-add"
        />
        {lead.tasks.filter((task) => !task.done).map((task) => (
          <Row key={task.id} title={task.title} subtitle={task.dueAt ? `Son: ${new Date(task.dueAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}` : null} trailing={<Button label="Tamamla" variant="quiet" disabled={busy} onPress={() => void run({ type: 'lead.task_complete', taskId: task.id }, 'Görev tamamlandı.')} testID={`crm-task-done-${task.id}`} />} />
        ))}
      </Section>
      {lead.duplicates.length || lead.suggestionLeadId ? (
        <Section title="Olası kopyalar">
          {lead.duplicates.map((dup) => (
            <Row key={dup.value} title={dup.label} onPress={() => router.push(`/business/lead/${encodeURIComponent(dup.value)}` as Href)} trailing={<Button label="Birleştir" variant="quiet" disabled={busy} onPress={() => confirm('Adayları birleştir', `Bu aday “${dup.label}” kaydına birleştirilecek; bu kayıt spam olarak kapanır.`, () => void run({ type: 'lead.merge', sourceId: id, targetId: dup.value }, 'Adaylar birleştirildi.', lead.revision))} testID={`crm-merge-${dup.value}`} />} />
          ))}
          {lead.suggestionLeadId ? <Button label="Kopya önerisini kapat" variant="quiet" disabled={busy} onPress={() => void run({ type: 'lead.duplicate_dismiss', leadId: id }, 'Kopya önerisi kapatıldı.')} testID="crm-dismiss-duplicate" /> : null}
        </Section>
      ) : null}
      <Section title="Satıştan erişime bağla">
        <FilterChips label="Sipariş ürünü" value={orderProduct} onChange={setOrderProduct} options={[{ value: 'OD', label: 'onlinedershanem.' }, { value: 'ODK', label: 'Deneme Ligi' }]} />
        <TextField label="Sipariş kimliği" value={orderId} onChangeText={setOrderId} autoCapitalize="none" autoCorrect={false} testID="crm-order-id" />
        <Button label="Siparişi bağla" variant="secondary" disabled={busy || orderId.trim().length < 20} onPress={() => void run({ type: 'lead.link_order', leadId: id, product: orderProduct, orderId: orderId.trim() }, 'Sipariş bağlandı.', lead.revision)} testID="crm-link-order" />
        <TextField label="Öğrenci hesabı kimliği" value={studentUserId} onChangeText={setStudentUserId} autoCapitalize="none" autoCorrect={false} testID="crm-student-user" />
        <Button label="Hesabı bağla" variant="quiet" disabled={busy || studentUserId.trim().length < 20} onPress={() => void run({ type: 'lead.link_lifecycle', leadId: id, userId: studentUserId.trim() }, 'Öğrenci hesabı bağlandı.', lead.revision)} testID="crm-link-user" />
        <Button label="Kimlik sinyali olmadan bağla (manuel onay)" variant="destructive" disabled={busy || studentUserId.trim().length < 20} onPress={() => confirm('Manuel bağlama', 'Kimlik eşleşmesi zayıf olsa da hesap bağlanacak ve denetim kaydına manuel onay olarak yazılacak.', () => void run({ type: 'lead.link_lifecycle', leadId: id, userId: studentUserId.trim(), force: true }, 'Öğrenci hesabı manuel onayla bağlandı.', lead.revision))} testID="crm-link-user-force" />
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Aday ekle (web "Aday ekle" formu; birden çok iş biriminde seçim zorunlu)
 * ------------------------------------------------------------------ */

export function CreateLeadSheet({ data, onClose, onCreated }: { data: MobileBusinessSection; onClose: () => void; onCreated: () => void }) {
  const crm = useCrm();
  const [unitId, setUnitId] = useState(data.options.units.length === 1 ? data.options.units[0].value : '');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('UNKNOWN');
  const [error, setError] = useState<string | null>(null);
  const emailOk = !email.trim() || /.+@.+\..+/.test(email.trim());
  return (
    <BottomSheet visible title="Aday ekle" onClose={onClose}>
      {error ? <Banner tone="critical">{error}</Banner> : null}
      {data.options.units.length > 1 ? (
        <>
          <Text variant="label">İş birimi</Text>
          <FilterChips label="İş birimi" value={unitId} onChange={setUnitId} options={data.options.units} />
        </>
      ) : null}
      <TextField label="Ad" value={firstName} onChangeText={setFirstName} maxLength={100} testID="crm-new-name" />
      <TextField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} testID="crm-new-phone" />
      <TextField label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" testID="crm-new-email" />
      <Text variant="label">Ürün ilgisi</Text>
      <FilterChips label="Ürün ilgisi" value={interest} onChange={setInterest} options={data.options.productInterests} />
      <View style={styles.actions}>
        <Button
          label="Adayı kaydet"
          loading={crm.isPending}
          disabled={crm.isPending || !firstName.trim() || !unitId || !emailOk}
          onPress={async () => {
            setError(null);
            try {
              await crm.mutateAsync({ command: { type: 'lead.create', businessUnitId: unitId, firstName: firstName.trim(), productInterest: interest, ...(phone.trim() ? { phone: phone.trim() } : {}), ...(email.trim() ? { email: email.trim() } : {}) } });
              onCreated();
            } catch (cause) {
              setError(adminErrorText(cause));
            }
          }}
          testID="crm-new-save"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ actions: { gap: space[2] } });
