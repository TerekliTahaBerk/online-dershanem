import type { MobileYonTask } from '@contracts/yon';
import { useState } from 'react';

import { EmptyState, PageHeader, Screen, SegmentedTabs, Text } from '@/design/primitives';
import { fetchYonPlan } from '@/lib/api/yon';

import { isDoneTask, isOpenTask } from './model';
import { QueryView, usePullToRefresh, useYonQuery } from './shared';
import { YonTaskRow } from './task-row';

/**
 * YÖN · ÇALIŞMALARIM — Yön çalışma alanındaki "Çalışmalar" menü öğesi.
 * Bu ekran OD ödev ekranı DEĞİLDİR ve OD ucunu çağırmaz: yalnız bu haftanın
 * yayında Yön plan görevlerini durumlarına göre listeler (veri Planım ile
 * aynı sorgu). OD ödevleri Yön görevi olarak kopyalanmaz; ödeve bağlı görev
 * sunucuda tek kayıttır.
 */
type Tab = 'open' | 'done' | 'missed';
const TAB_LABEL: Record<Tab, string> = { open: 'Açık', done: 'Tamamlanan', missed: 'Yapılamadı' };

function tabOf(task: MobileYonTask): Tab | null {
  if (isOpenTask(task)) return 'open';
  if (isDoneTask(task)) return 'done';
  if (task.status === 'COULD_NOT') return 'missed';
  return null;
}

export default function YonWorkScreen() {
  const query = useYonQuery('yon-plan', (api, signal) => fetchYonPlan(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  const [tab, setTab] = useState<Tab>('open');
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="yon-work">
      <PageHeader title="Çalışmalarım" description="Bu haftanın Yön Koçluk plan görevleri. Okul ödevlerin onlinedershanem. çalışma alanında." />
      <QueryView query={query} disabledTitle="Koçunla belirlediğiniz çalışmalar hazır olduğunda burada görünecek.">
        {(data) => {
          if (data.state === 'NO_PROFILE') return <EmptyState title="Profilin hazırlanıyor." />;
          const plan = data.plan;
          if (!plan || plan.tasks.length === 0) return <EmptyState title="Bu hafta için yayında bir çalışma yok." body="Koçun planı yayınladığında görevlerin burada görünecek." />;
          const groups: Record<Tab, MobileYonTask[]> = { open: [], done: [], missed: [] };
          for (const task of plan.tasks) {
            const key = tabOf(task);
            if (key) groups[key].push(task);
          }
          return (
            <>
              <SegmentedTabs label="Çalışma durumu" value={tab} onChange={setTab} options={(Object.keys(TAB_LABEL) as Tab[]).map((value) => ({ value, label: TAB_LABEL[value], count: groups[value].length }))} />
              {groups[tab].length ? groups[tab].map((task) => <YonTaskRow key={task.id} task={task} canOpen={plan.canComplete} showDate />) : <Text tone="secondary">Bu bölümde görev yok.</Text>}
            </>
          );
        }}
      </QueryView>
    </Screen>
  );
}
