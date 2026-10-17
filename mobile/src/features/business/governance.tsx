import type { MobileBusinessSection } from '@contracts/business';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Banner, BottomSheet, Button, Section, TextField } from '@/design/primitives';
import { FilterChips, SearchPicker } from '@/features/admin/ui';
import { useOps } from './ops';
import { adminErrorText } from '@/features/admin/shared';
import type { OpsCommandInput } from '@/lib/api/business';

type Data = MobileBusinessSection;
type Run = (command: OpsCommandInput) => Promise<boolean>;
type Knowledge = Data['governance']['knowledge'][number];
const activeOptions = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Pasif' }];

export function GovernanceActions({ data }: { data: Data }) {
  const mutation = useOps();
  const [notice, setNotice] = useState<{ tone: 'info' | 'critical'; text: string } | null>(null);
  const [sheet, setSheet] = useState<'knowledge' | 'prompt' | 'automation' | 'role' | 'retention' | null>(null);
  const [editing, setEditing] = useState<Knowledge | null>(null);
  const [dryRule, setDryRule] = useState<Data['governance']['rules'][number] | null>(null);
  const can = data.can;
  const run: Run = async (command) => {
    if (mutation.isPending) return false;
    setNotice(null);
    try {
      const outcome = await mutation.mutateAsync(command);
      setNotice({ tone: 'info', text: command.type === 'automation.dry_run' ? `Deneme: ${outcome.result.summary?.failed ? 'başarısız' : 'tamamlandı'} · ${outcome.result.summary?.matched ? 'eşleşti' : 'eşleşmedi'} · ${outcome.result.summary?.planned ?? 0} planlanan işlem.` : 'İşlem kaydedildi.' });
      return true;
    } catch (error) {
      setNotice({ tone: 'critical', text: adminErrorText(error) ?? 'İşlemi şu an kaydedemedik. Lütfen tekrar dener misiniz?' });
      return false;
    }
  };
  const close = () => { setSheet(null); setEditing(null); setDryRule(null); };
  return <>
    {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
    {data.slug === 'ai-bilgi-merkezi' && can.knowledgeWrite ? <Section title="Bilgi merkezi işlemleri">
      <Button label="Bilgi kaydı ekle" onPress={() => setSheet('knowledge')} />
      <Button label="Prompt sürümü ekle" variant="secondary" onPress={() => setSheet('prompt')} />
      {data.governance.knowledge.map((entry) => <Button key={entry.id} label={`${entry.title} · yeni sürüm`} variant="quiet" onPress={() => setEditing(entry)} />)}
    </Section> : null}
    {data.slug === 'otomasyon-kurallari' && can.automationWrite ? <Section title="Kural işlemleri">
      <Button label="Otomasyon kuralı oluştur" onPress={() => setSheet('automation')} />
      {data.governance.rules.map((rule) => <Section key={rule.id} title={rule.name}>
        <Button label={rule.isActive ? 'Kapat' : 'Aç'} variant="secondary" disabled={mutation.isPending} onPress={() => void run({ type: 'automation.toggle', id: rule.id, isActive: !rule.isActive, expectedRevision: rule.revision })} />
        <Button label="Deneme çalıştırması" variant="quiet" onPress={() => setDryRule(rule)} />
      </Section>)}
    </Section> : null}
    {data.slug === 'ayarlar' ? <Section title="İşletme ayarları">
      {can.settingsWrite ? <Button label="Saklama süresini değiştir" onPress={() => setSheet('retention')} /> : null}
      {can.roleWrite ? <>
        <Button label="İşletme rolü ver" variant="secondary" onPress={() => setSheet('role')} />
        {data.cards.find((card) => card.id === 'roles')?.rows.map((row) => <Button key={row.id} label={`${row.title} · ${row.subtitle ?? ''} · ${row.badge?.label ?? ''} · rolü kaldır`} variant="destructive" disabled={mutation.isPending} onPress={() => Alert.alert('Rolü kaldır', 'Bu kullanıcının tüm oturumları kapatılacak.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Kaldır', style: 'destructive', onPress: () => row.id && void run({ type: 'role.revoke', id: row.id }) }])} />)}
      </> : null}
    </Section> : null}
    {(sheet === 'knowledge' || editing) ? <KnowledgeSheet key={editing?.id ?? 'new'} data={data} entry={editing} run={run} close={close} busy={mutation.isPending} notice={notice} /> : null}
    {sheet === 'prompt' ? <PromptSheet data={data} run={run} close={close} busy={mutation.isPending} notice={notice} /> : null}
    {sheet === 'automation' ? <AutomationSheet data={data} run={run} close={close} busy={mutation.isPending} notice={notice} /> : null}
    {sheet === 'role' ? <RoleSheet data={data} run={run} close={close} busy={mutation.isPending} notice={notice} /> : null}
    {sheet === 'retention' ? <RetentionSheet run={run} close={close} busy={mutation.isPending} notice={notice} /> : null}
    {dryRule ? <DryRunSheet rule={dryRule} run={run} close={close} busy={mutation.isPending} notice={notice} /> : null}
  </>;
}

type Props = { data: Data; run: Run; close: () => void; busy: boolean; notice: { tone: 'info' | 'critical'; text: string } | null };
function Unit({ data, value, set }: { data: Data; value: string; set: (value: string) => void }) {
  return <FilterChips label="İş birimi" value={value} onChange={set} options={data.options.units} />;
}
const firstUnit = (data: Data) => data.options.units.length === 1 ? data.options.units[0].value : '';
function KnowledgeSheet({ data, entry, run, close, busy, notice }: Props & { entry: Knowledge | null }) {
  const [unit, setUnit] = useState(firstUnit(data));
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState(entry?.content ?? '');
  const [active, setActive] = useState(String(entry?.isActive ?? true));
  const [interest, setInterest] = useState<'ONLINE_DERSHANEM' | 'ONLINE_DENEME_KULUBU' | 'UNKNOWN'>('UNKNOWN');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  return <BottomSheet visible title={entry ? `${entry.title} · yeni sürüm` : 'Bilgi kaydı oluştur'} onClose={close}>
    {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
    {!entry ? <>
      <Unit data={data} value={unit} set={setUnit} />
      <TextField label="Başlık" value={title} onChangeText={setTitle} maxLength={160} />
      <TextField label="Kategori" value={category} onChangeText={setCategory} maxLength={80} />
      <FilterChips label="Ürün ilgisi" value={interest} onChange={(value) => setInterest(value as typeof interest)} options={data.options.productInterests} />
      <TextField label="Geçerlilik başlangıcı (YYYY-AA-GG, isteğe bağlı)" value={from} onChangeText={setFrom} maxLength={10} />
      <TextField label="Geçerlilik bitişi (YYYY-AA-GG, isteğe bağlı)" value={until} onChangeText={setUntil} maxLength={10} />
    </> : <FilterChips label="Durum" value={active} onChange={setActive} options={activeOptions} />}
    <TextField testID="governance-content" label="İçerik" value={content} onChangeText={setContent} multiline maxLength={10000} />
    <Button testID="governance-knowledge-save" label="Kaydet" loading={busy} disabled={busy || content.trim().length < 10 || (!entry && (!unit || title.trim().length < 2 || category.trim().length < 2))} onPress={async () => {
      const command: OpsCommandInput = entry ? { type: 'knowledge.version', id: entry.id, content, isActive: active === 'true', expectedRevision: entry.revision } : { type: 'knowledge.create', businessUnitId: unit, title, category, content, productInterest: interest, validFrom: from, validUntil: until };
      if (await run(command)) close();
    }} />
  </BottomSheet>;
}
function PromptSheet({ data, run, close, busy, notice }: Props) {
  const [unit, setUnit] = useState(firstUnit(data));
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  return <BottomSheet visible title="Prompt sürümü oluştur" onClose={close}>
    {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
    <Unit data={data} value={unit} set={setUnit} />
    <TextField label="Ad" value={name} onChangeText={setName} maxLength={80} />
    <TextField label="Sistem prompt'u" value={prompt} onChangeText={setPrompt} maxLength={8000} multiline />
    <Button label="Yeni sürümü etkinleştir" disabled={busy || !unit || name.trim().length < 2 || prompt.trim().length < 20} loading={busy} onPress={async () => { if (await run({ type: 'prompt.create', businessUnitId: unit, name, systemPrompt: prompt })) close(); }} />
  </BottomSheet>;
}
function RetentionSheet({ run, close, busy, notice }: Omit<Props, 'data'>) {
  const [days, setDays] = useState('730');
  const value = Number(days);
  return <BottomSheet visible title="KVKK saklama süresi" onClose={close}>
    {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
    <Banner tone="info">Bu süre yetkili olduğun tüm iş birimlerine uygulanır.</Banner>
    <TextField label="Gün (30–3650)" value={days} onChangeText={setDays} keyboardType="number-pad" />
    <Button label="Kaydet" disabled={busy || !Number.isInteger(value) || value < 30 || value > 3650} loading={busy} onPress={async () => { if (await run({ type: 'retention.update', retentionDays: value })) close(); }} />
  </BottomSheet>;
}
function RoleSheet({ data, run, close, busy, notice }: Props) {
  const [unit, setUnit] = useState(firstUnit(data));
  const [userId, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<'SUPER_ADMIN' | 'ADMIN' | 'SALES' | 'SUPPORT' | 'ACCOUNTING' | 'VIEWER'>('VIEWER');
  return <BottomSheet visible title="İşletme rolü ver" onClose={close}>
    {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
    <Unit data={data} value={unit} set={setUnit} />
    <SearchPicker testID="governance-role-user" label="Kullanıcı" value={userId} onChange={setUser} options={data.governance.users.map((x) => ({ id: x.value, name: x.label }))} />
    <FilterChips label="Rol" value={role} onChange={(value) => setRole(value as typeof role)} options={data.governance.roles} />
    <Banner tone="warning">Kullanıcının tüm oturumları kapatılır. İşlem yeniden kimlik doğrulaması gerektirir.</Banner>
    <Button label="Rolü ver" disabled={busy || !unit || !userId} loading={busy} onPress={async () => { if (userId && await run({ type: 'role.assign', userId, businessUnitId: unit, role })) close(); }} />
  </BottomSheet>;
}
function AutomationSheet({ data, run, close, busy, notice }: Props) {
  const [unit, setUnit] = useState(firstUnit(data));
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('lead_created');
  const [action, setAction] = useState('create_task');
  const [active, setActive] = useState('false');
  const [source, setSource] = useState('');
  const [product, setProduct] = useState('');
  const [severity, setSeverity] = useState('');
  const [stage, setStage] = useState('');
  const [temperature, setTemperature] = useState('');
  const [ownerEmpty, setOwnerEmpty] = useState('');
  const [value, setValue] = useState('');
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('TEACHER_OBSERVED');
  const [template, setTemplate] = useState('automation_ops_alert');
  return <BottomSheet visible title="Otomasyon kuralı oluştur" onClose={close}>
    {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
    <Unit data={data} value={unit} set={setUnit} />
    <TextField label="Kural adı" value={name} onChangeText={setName} maxLength={160} />
    <FilterChips label="Tetikleyici" value={trigger} onChange={setTrigger} options={data.governance.triggers} />
    <TextField label="Kaynak koşulu (isteğe bağlı)" value={source} onChangeText={setSource} maxLength={60} />
    <TextField label="Ürün koşulu (isteğe bağlı)" value={product} onChangeText={setProduct} maxLength={60} />
    <FilterChips label="Önem koşulu" value={severity} onChange={setSeverity} options={['', 'low', 'medium', 'high'].map((value) => ({ value, label: value || 'Hepsi' }))} />
    <TextField label="Aşama koşulu (isteğe bağlı)" value={stage} onChangeText={setStage} maxLength={40} />
    <FilterChips label="Sıcaklık koşulu" value={temperature} onChange={setTemperature} options={['', 'COLD', 'WARM', 'HOT'].map((value) => ({ value, label: value || 'Hepsi' }))} />
    <FilterChips label="Sorumlu koşulu" value={ownerEmpty} onChange={setOwnerEmpty} options={[{ value: '', label: 'Hepsi' }, { value: 'true', label: 'Sorumlu yok' }, { value: 'false', label: 'Sorumlu var' }]} />
    <FilterChips label="İşlem" value={action} onChange={setAction} options={data.governance.actions} />
    {['create_task', 'CREATE_TASK', 'add_tag', 'ADD_TAG', 'send_internal_notification', 'create_intervention', 'assign_owner'].includes(action) ? <TextField label={action === 'assign_owner' ? 'Sorumlu kullanıcı kimliği (isteğe bağlı)' : action === 'create_intervention' ? 'Önerilen işlem' : 'Başlık / etiket'} value={value} onChangeText={setValue} maxLength={action === 'create_intervention' ? 300 : 160} /> : null}
    {action === 'send_internal_notification' ? <TextField label="Bildirim metni" value={body} onChangeText={setBody} maxLength={500} multiline /> : null}
    {action === 'create_intervention' ? <FilterChips label="Neden" value={reason} onChange={setReason} options={['ATTENDANCE_PATTERN', 'OVERDUE_WORK', 'REPEATED_REVIEW_DIFFICULTY', 'PLAN_STALLED', 'TEACHER_OBSERVED'].map((value) => ({ value, label: value }))} /> : null}
    {action === 'send_approved_template_email' ? <FilterChips label="Onaylı e-posta şablonu" value={template} onChange={setTemplate} options={['automation_ops_alert', 'automation_invite_reminder', 'automation_intervention_alert'].map((value) => ({ value, label: value }))} /> : null}
    <FilterChips label="Durum" value={active} onChange={setActive} options={activeOptions} />
    <Button label="Kuralı oluştur" disabled={busy || !unit || name.trim().length < 2} loading={busy} onPress={async () => {
      const payload = action === 'add_tag' || action === 'ADD_TAG' ? { type: action, tag: value || 'otomasyon' } : action === 'create_task' || action === 'CREATE_TASK' ? { type: action, title: value || 'Otomasyon görevi' } : action === 'send_internal_notification' ? { type: action, title: value || 'Otomasyon bildirimi', body: body || 'Bir otomasyon kuralı tetiklendi.' } : action === 'create_intervention' ? { type: action, reasonCode: reason, suggestedAction: value || 'Otomasyon sinyali — inceleme gerekli.' } : action === 'assign_owner' ? { type: action, ...(value ? { userId: value } : {}) } : action === 'send_approved_template_email' ? { type: action, templateKey: template } : { type: action };
      const command = { type: 'automation.create', businessUnitId: unit, name, triggerType: trigger, conditions: { ...(source ? { source } : {}), ...(product ? { product } : {}), ...(severity ? { severity } : {}), ...(stage ? { stage } : {}), ...(temperature ? { temperature } : {}), ...(ownerEmpty ? { ownerEmpty: ownerEmpty === 'true' } : {}) }, actions: [payload], isActive: active === 'true' };
      if (await run(command as Extract<OpsCommandInput, { type: 'automation.create' }>)) close();
    }} />
  </BottomSheet>;
}
function DryRunSheet({ rule, run, close, busy, notice }: Omit<Props, 'data'> & { rule: Data['governance']['rules'][number] }) {
  const [source, setSource] = useState('');
  const [product, setProduct] = useState('');
  const [stage, setStage] = useState('');
  const [severity, setSeverity] = useState('');
  const [ownerEmpty, setOwnerEmpty] = useState('true');
  return <BottomSheet visible title={`${rule.name} · deneme`} onClose={close}>
    {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
    <Banner tone="info">İşlemler planlanır; canlı aksiyon çalıştırılmaz.</Banner>
    <TextField label="Örnek kaynak" value={source} onChangeText={setSource} maxLength={60} />
    <TextField label="Örnek ürün" value={product} onChangeText={setProduct} maxLength={60} />
    <TextField label="Örnek aşama" value={stage} onChangeText={setStage} maxLength={40} />
    <TextField label="Örnek önem" value={severity} onChangeText={setSeverity} maxLength={60} />
    <FilterChips label="Sorumlu yok" value={ownerEmpty} onChange={setOwnerEmpty} options={[{ value: 'true', label: 'Evet' }, { value: 'false', label: 'Hayır' }]} />
    <Button label="Denemeyi çalıştır" loading={busy} disabled={busy} onPress={async () => { if (await run({ type: 'automation.dry_run', id: rule.id, triggerType: rule.triggerType as Extract<OpsCommandInput, { type: 'automation.dry_run' }>['triggerType'], entityType: 'lead', entityId: 'dry-run-sample', source, product, stage, severity, ownerEmpty: ownerEmpty === 'true' })) close(); }} />
  </BottomSheet>;
}
