import type { MobileBusinessLead, MobileBusinessRow, MobileBusinessSection } from '@contracts/business';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Button, Section, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { adminErrorText } from '@/features/admin/shared';
import { FilterChips, SearchPicker } from '@/features/admin/ui';
import { runOps, type OpsCommandInput, type OpsOutcome } from '@/lib/api/business';
import { useSession } from '@/lib/auth/session-provider';

import { useBusinessMutation } from './crm';

/**
 * İŞLETME PAZARLAMA + FİNANS (P2.7c) — web formlarıyla AYNI komutlar
 * (`POST /api/panel/business/ops`): kampanya, manuel reklam, manuel atıf,
 * Meta Ads senkronu, gelir / gider kaydı, ters kayıt, dönem kilidi ve
 * mutabakat. Finans kaydı, ters kayıt ve dönem kilidi sunucuda taze step-up
 * ister; geri alınamaz işlemler ayrıca onaylatılır.
 */

type Notice = { tone: 'info' | 'critical'; text: string } | null;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = (value: string) => (value.trim() === '' ? NaN : Number(value.replace(',', '.')));
const confirm = (title: string, body: string, label: string, action: () => void) => Alert.alert(title, body, [{ text: 'Vazgeç', style: 'cancel' }, { text: label, style: 'destructive', onPress: action }]);

export function useOps() {
  const { api } = useSession();
  return useBusinessMutation((command: OpsCommandInput, key): Promise<OpsOutcome> => runOps(api, command, key));
}

function useOpsRunner() {
  const ops = useOps();
  const [notice, setNotice] = useState<Notice>(null);
  async function run(command: OpsCommandInput, success: (outcome: OpsOutcome) => string) {
    setNotice(null);
    try {
      const outcome = await ops.mutateAsync(command);
      setNotice({ tone: 'info', text: success(outcome) });
      return true;
    } catch (cause) {
      setNotice({ tone: 'critical', text: adminErrorText(cause) ?? 'İşlemi şu an kaydedemedik. Lütfen tekrar dener misiniz?' });
      return false;
    }
  }
  return { run, notice, busy: ops.isPending };
}

/** Bölüm başlığındaki eylem + satır eylemlerinin yürütücüsü. */
export function SectionOps({ data, children }: { data: MobileBusinessSection; children: (onRowAction: (row: MobileBusinessRow, kind: 'reverse' | 'match' | 'correct') => void) => React.ReactNode }) {
  const { run, notice, busy } = useOpsRunner();
  const [sheet, setSheet] = useState<'campaign' | 'ad' | 'transaction' | 'period' | null>(null);
  const slug = data.slug;
  const can = data.can;

  function onRowAction(row: MobileBusinessRow, kind: 'reverse' | 'match' | 'correct') {
    if (!row.id) return;
    const id = row.id;
    if (kind === 'reverse') {
      confirm('Ters kayıt', `“${row.title}” için ters kayıt oluşturulacak; özgün kayıt iptal edilir. Bu işlem geri alınamaz.`, 'Ters kaydı oluştur', () => void run({ type: 'finance.reverse', transactionId: id }, () => 'Ters kayıt oluşturuldu.'));
      return;
    }
    void run({ type: 'reconciliation.resolve', id, status: kind === 'match' ? 'MANUALLY_MATCHED' : 'CORRECTED' }, () => 'Mutabakat kaydı çözüldü.');
  }

  return (
    <>
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      <View style={styles.actions}>
        {slug === 'kampanyalar' && can.campaignWrite ? <Button label="Kampanya ekle" variant="secondary" onPress={() => setSheet('campaign')} testID="ops-campaign-open" /> : null}
        {slug === 'reklamlar' && can.campaignWrite ? <Button label="Manuel reklam ekle" variant="secondary" disabled={!data.options.campaigns.length} onPress={() => setSheet('ad')} testID="ops-ad-open" /> : null}
        {(slug === 'gelirler' || slug === 'giderler') && can.financeWrite ? <Button label={slug === 'giderler' ? 'Gider ekle' : 'Gelir ekle'} variant="secondary" onPress={() => setSheet('transaction')} testID="ops-transaction-open" /> : null}
        {slug === 'vergiler' && can.financeReverse ? <Button label="Dönem kilitle" variant="secondary" onPress={() => setSheet('period')} testID="ops-period-open" /> : null}
        {slug === 'mutabakat' && can.financeWrite ? <Button label="PayTR · sipariş · ledger mutabakatını çalıştır" variant="secondary" disabled={busy} loading={busy} onPress={() => void run({ type: 'reconciliation.run' }, (outcome) => `Mutabakat tamamlandı: ${outcome.result.summary?.scanned ?? 0} kayıt tarandı, ${outcome.result.summary?.issues ?? 0} sorun.`)} testID="ops-reconcile" /> : null}
        {slug === 'entegrasyonlar' && can.integrationWrite ? <Button label="Meta Ads senkronize et" variant="secondary" disabled={busy} loading={busy} onPress={() => void run({ type: 'meta_ads.sync' }, (outcome) => `Meta Ads senkronize edildi: ${outcome.result.summary?.synced ?? 0} kayıt.`)} testID="ops-meta-sync" /> : null}
      </View>
      {children(onRowAction)}
      {sheet === 'campaign' ? <CampaignSheet data={data} onClose={() => setSheet(null)} run={run} /> : null}
      {sheet === 'ad' ? <AdSheet data={data} onClose={() => setSheet(null)} run={run} /> : null}
      {sheet === 'transaction' ? <TransactionSheet data={data} onClose={() => setSheet(null)} run={run} /> : null}
      {sheet === 'period' ? <PeriodSheet data={data} onClose={() => setSheet(null)} run={run} /> : null}
    </>
  );
}

type Run = (command: OpsCommandInput, success: (outcome: OpsOutcome) => string) => Promise<boolean>;

function UnitChips({ data, value, onChange }: { data: MobileBusinessSection; value: string; onChange: (value: string) => void }) {
  if (data.options.units.length <= 1) return null;
  return (
    <>
      <Text variant="label">İş birimi</Text>
      <FilterChips label="İş birimi" value={value} onChange={onChange} options={data.options.units} />
    </>
  );
}

const firstUnit = (data: MobileBusinessSection) => (data.options.units.length === 1 ? data.options.units[0].value : '');

function CampaignSheet({ data, onClose, run }: { data: MobileBusinessSection; onClose: () => void; run: Run }) {
  const [unit, setUnit] = useState(firstUnit(data));
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [budget, setBudget] = useState('0');
  const [interest, setInterest] = useState('ONLINE_DERSHANEM');
  const valid = unit && name.trim().length >= 2 && platform.trim().length >= 2 && num(budget) >= 0;
  return (
    <BottomSheet visible title="Kampanya ekle" onClose={onClose}>
      <UnitChips data={data} value={unit} onChange={setUnit} />
      <TextField label="Kampanya adı" value={name} onChangeText={setName} maxLength={160} testID="ops-campaign-name" />
      <TextField label="Platform" value={platform} onChangeText={setPlatform} maxLength={40} autoCapitalize="characters" />
      <TextField label="Bütçe (TL)" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" testID="ops-campaign-budget" />
      <Text variant="label">Ürün ilgisi</Text>
      <FilterChips label="Ürün ilgisi" value={interest} onChange={setInterest} options={data.options.productInterests} />
      <Button label="Kampanyayı kaydet" disabled={!valid} onPress={async () => { if (await run({ type: 'campaign.create', businessUnitId: unit, name: name.trim(), platform: platform.trim(), budgetTl: num(budget), productInterest: interest }, () => 'Kampanya eklendi.')) onClose(); }} testID="ops-campaign-save" />
    </BottomSheet>
  );
}

const AD_FIELDS = [
  ['spentTl', 'Harcama TL'],
  ['impressions', 'Gösterim'],
  ['clicks', 'Tıklama'],
  ['messageStarts', 'Mesaj'],
  ['leadCount', 'Lead'],
  ['saleCount', 'Satış'],
  ['revenueTl', 'Gelir TL'],
] as const;

function AdSheet({ data, onClose, run }: { data: MobileBusinessSection; onClose: () => void; run: Run }) {
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [adSetName, setAdSetName] = useState('');
  const [name, setName] = useState('');
  const [values, setValues] = useState<Record<(typeof AD_FIELDS)[number][0], string>>({ spentTl: '0', impressions: '0', clicks: '0', messageStarts: '0', leadCount: '0', saleCount: '0', revenueTl: '0' });
  const numbersOk = AD_FIELDS.every(([key]) => num(values[key]) >= 0 && (key.endsWith('Tl') || Number.isInteger(num(values[key]))));
  const valid = campaignId && adSetName.trim().length >= 2 && name.trim().length >= 2 && numbersOk;
  return (
    <BottomSheet visible title="Manuel reklam ekle" onClose={onClose}>
      <SearchPicker label="Kampanya" options={data.options.campaigns.map((item) => ({ id: item.value, name: item.label }))} value={campaignId} onChange={setCampaignId} testID="ops-ad-campaign" />
      <TextField label="Reklam seti" value={adSetName} onChangeText={setAdSetName} maxLength={160} testID="ops-ad-set" />
      <TextField label="Reklam adı" value={name} onChangeText={setName} maxLength={160} testID="ops-ad-name" />
      <View style={styles.grid}>
        {AD_FIELDS.map(([key, label]) => (
          <View key={key} style={styles.cell}>
            <TextField label={label} value={values[key]} onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))} keyboardType={key.endsWith('Tl') ? 'decimal-pad' : 'number-pad'} testID={`ops-ad-${key}`} />
          </View>
        ))}
      </View>
      <Button
        label="Reklamı kaydet"
        disabled={!valid}
        onPress={async () => {
          const n = (key: (typeof AD_FIELDS)[number][0]) => num(values[key]);
          if (await run({ type: 'advertisement.create', campaignId: campaignId!, adSetName: adSetName.trim(), name: name.trim(), spentTl: n('spentTl'), impressions: n('impressions'), clicks: n('clicks'), messageStarts: n('messageStarts'), leadCount: n('leadCount'), saleCount: n('saleCount'), revenueTl: n('revenueTl') }, () => 'Reklam eklendi.')) onClose();
        }}
        testID="ops-ad-save"
      />
    </BottomSheet>
  );
}

function TransactionSheet({ data, onClose, run }: { data: MobileBusinessSection; onClose: () => void; run: Run }) {
  const expense = data.slug === 'giderler';
  const [unit, setUnit] = useState(firstUnit(data));
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [vat, setVat] = useState('0');
  const [withholding, setWithholding] = useState('0');
  const [commission, setCommission] = useState('0');
  const [date, setDate] = useState('');
  const pct = (value: string) => num(value) >= 0 && num(value) <= 100;
  const valid = unit && description.trim().length >= 2 && category.trim().length >= 2 && num(amount) > 0 && pct(vat) && pct(withholding) && num(commission) >= 0 && (!date.trim() || DATE.test(date.trim()));
  return (
    <BottomSheet visible title={expense ? 'Gider ekle' : 'Gelir ekle'} onClose={onClose}>
      <UnitChips data={data} value={unit} onChange={setUnit} />
      <TextField label="Açıklama" value={description} onChangeText={setDescription} maxLength={300} testID="ops-tx-description" />
      <TextField label="Kategori" value={category} onChangeText={setCategory} maxLength={80} testID="ops-tx-category" />
      <TextField label="Tutar (TL, KDV dahil)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" testID="ops-tx-amount" />
      <View style={styles.grid}>
        <View style={styles.cell}><TextField label="KDV %" value={vat} onChangeText={setVat} keyboardType="decimal-pad" testID="ops-tx-vat" /></View>
        <View style={styles.cell}><TextField label="Stopaj %" value={withholding} onChangeText={setWithholding} keyboardType="decimal-pad" /></View>
        <View style={styles.cell}><TextField label="Komisyon (TL)" value={commission} onChangeText={setCommission} keyboardType="decimal-pad" /></View>
        <View style={styles.cell}><TextField label="Tarih (YYYY-AA-GG)" value={date} onChangeText={setDate} maxLength={10} autoCorrect={false} testID="ops-tx-date" /></View>
      </View>
      <Button
        label="Kaydet"
        disabled={!valid}
        onPress={async () => {
          if (await run({ type: 'finance.create', businessUnitId: unit, kind: expense ? 'EXPENSE' : 'MANUAL_INCOME', description: description.trim(), category: category.trim(), amountTl: num(amount), vatRate: num(vat), withholdingRate: num(withholding), commissionTl: num(commission), ...(date.trim() ? { transactionDate: date.trim() } : {}) }, () => (expense ? 'Gider kaydedildi.' : 'Gelir kaydedildi.'))) onClose();
        }}
        testID="ops-tx-save"
      />
      <Text tone="muted" variant="meta">Finans kaydı hassastır; kimliğini yeniden doğrulaman istenebilir. Kilitli dönemdeki tarihe kayıt açılamaz.</Text>
    </BottomSheet>
  );
}

function PeriodSheet({ data, onClose, run }: { data: MobileBusinessSection; onClose: () => void; run: Run }) {
  const [unit, setUnit] = useState(firstUnit(data));
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const valid = unit && DATE.test(startsAt.trim()) && DATE.test(endsAt.trim());
  return (
    <BottomSheet visible title="Dönem kilitle" onClose={onClose}>
      <UnitChips data={data} value={unit} onChange={setUnit} />
      <TextField label="Başlangıç (YYYY-AA-GG)" value={startsAt} onChangeText={setStartsAt} maxLength={10} autoCorrect={false} testID="ops-period-start" />
      <TextField label="Bitiş (YYYY-AA-GG)" value={endsAt} onChangeText={setEndsAt} maxLength={10} autoCorrect={false} testID="ops-period-end" />
      <Banner tone="warning">Kilitli dönemde sessiz değişiklik yapılamaz; yalnız ters / düzeltme kaydı kullanılır.</Banner>
      <Button
        label="Onayla ve kilitle"
        variant="destructive"
        disabled={!valid}
        onPress={() => confirm('Dönemi kilitle', `${startsAt} – ${endsAt} dönemi kilitlenecek.`, 'Kilitle', () => void run({ type: 'period.lock', businessUnitId: unit, startsAt: startsAt.trim(), endsAt: endsAt.trim() }, () => 'Dönem kilitlendi.').then((ok) => ok && onClose()))}
        testID="ops-period-save"
      />
    </BottomSheet>
  );
}

/** Aday detayında manuel kampanya / reklam atfı (web konuşma panelindeki form). */
export function AttributionForm({ data, lead }: { data: MobileBusinessSection; lead: MobileBusinessLead }) {
  const { run, notice, busy } = useOpsRunner();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [adId, setAdId] = useState<string | null>(null);
  if (!data.can.campaignWrite || (!data.options.campaigns.length && !data.options.ads.length)) return null;
  return (
    <Section title="Kampanya atfı">
      {notice ? <Banner tone={notice.tone}>{notice.text}</Banner> : null}
      <SearchPicker label="Kampanya" options={data.options.campaigns.map((item) => ({ id: item.value, name: item.label }))} value={campaignId} onChange={setCampaignId} testID="ops-attr-campaign" />
      <SearchPicker label="Reklam" options={data.options.ads.map((item) => ({ id: item.value, name: item.label }))} value={adId} onChange={setAdId} testID="ops-attr-ad" />
      <Button
        label="Manuel atıf oluştur"
        variant="secondary"
        disabled={busy || (!campaignId && !adId)}
        onPress={async () => {
          if (await run({ type: 'attribution.manual', leadId: lead.id, campaignId: campaignId ?? '', advertisementId: adId ?? '' }, () => 'Manuel atıf oluşturuldu.')) {
            setCampaignId(null);
            setAdId(null);
          }
        }}
        testID="ops-attr-save"
      />
    </Section>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  cell: { flexGrow: 1, flexBasis: '45%' },
});
