import { Linking } from 'react-native';
import { act, fireEvent, waitFor, within } from 'expo-router/testing-library';

import { safeFileName, userDirectoryName } from '@/lib/files/material-files';

import { makeBootstrap } from './fixtures';
import { account, boot, go, jsonResponse, press, secureStore, signIn, WAIT } from './harness';
import { makeMaterial, makeMaterialList } from './od-fixtures';

const fsCalls: { downloads: { url: string; destination: string; headers: Record<string, string> }[]; deleted: string[] } = { downloads: [], deleted: [] };

jest.mock('expo-file-system', () => {
  const join = (...parts: unknown[]) => parts.map((part) => (typeof part === 'string' ? part : (part as { uri: string }).uri)).join('/');
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    get exists() {
      return true;
    }
    create() {}
    delete() {
      fsCalls.deleted.push(this.uri);
    }
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(...parts);
    }
    static async downloadFileAsync(url: string, destination: File, options: { headers: Record<string, string> }) {
      fsCalls.downloads.push({ url, destination: destination.uri, headers: options.headers });
      return destination;
    }
  }
  return { Directory, File, Paths: { cache: 'file:///cache' } };
});

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));

beforeEach(() => {
  secureStore.__store.clear();
  fsCalls.downloads.length = 0;
  fsCalls.deleted.length = 0;
});

const materials = makeMaterialList([
  makeMaterial(),
  makeMaterial({ id: 'm-video', kind: 'VIDEO', title: 'Kesir videosu', hasFile: false, fileName: null, mimeType: null, url: 'https://video.example.com/kesir', captionsAvailable: true, transcript: 'Kesir, bir bütünün eş parçalarıdır.', preferred: true }),
  makeMaterial({ id: 'm-bad', kind: 'LINK', title: 'Şüpheli bağlantı', hasFile: false, fileName: null, mimeType: null, url: 'javascript:alert(1)' }),
]);

async function openMaterials(email = 'ada@example.com') {
  const bootstrap = makeBootstrap({ userId: 'user-ada' });
  const h = await boot([account(email, bootstrap, { routes: { 'GET /api/panel/materials': () => jsonResponse(200, materials) } })]);
  await signIn(h, email);
  await h.screen.findByTestId('od-home', {}, WAIT);
  await go('/screen/materials');
  return { h, view: within(await h.screen.findByTestId('od-materials', {}, WAIT)) };
}

describe('M2.4 Kaynaklar', () => {
  it('liste: tür, tercih ve erişilebilirlik işaretleri; metin dökümü açılır', async () => {
    const { h, view } = await openMaterials();
    expect(await view.findByText('Kesirler özet', {}, WAIT)).toBeTruthy();
    expect(view.getByText('Sana uygun')).toBeTruthy();
    expect(view.getByText('Altyazı var')).toBeTruthy();
    await press(h, view.getByText('Metin dökümünü oku'));
    expect(view.getByText('Kesir, bir bütünün eş parçalarıdır.')).toBeTruthy();
  });

  it('kimlikli dosya: Bearer başlıkla indirilir, URL token taşımaz, kullanıcı önbellek dizinine güvenli adla yazılır', async () => {
    const Sharing = jest.requireMock('expo-sharing') as { shareAsync: jest.Mock };
    const { h, view } = await openMaterials();
    await press(h, await view.findByTestId('material-open-m-1', {}, WAIT));
    await waitFor(() => expect(fsCalls.downloads).toHaveLength(1), WAIT);
    const download = fsCalls.downloads[0];
    expect(download.url).toMatch(/\/api\/panel\/materials\/m-1\/file$/);
    expect(download.url).not.toMatch(/token|Bearer|[?&]/i);
    expect(download.headers.Authorization).toMatch(/^Bearer token-/);
    expect(download.headers['X-Od-Client']).toBe('mobile');
    expect(download.destination).toBe('file:///cache/od-materials/user-ada/m-1-kesirler.pdf');
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/od-materials/user-ada/m-1-kesirler.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
  });

  it('dış bağlantı yalnız http(s): video açılır; javascript: bağlantısına açma düğmesi yok', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { h, view } = await openMaterials();
    await press(h, await view.findByTestId('material-open-m-video', {}, WAIT));
    expect(open).toHaveBeenCalledWith('https://video.example.com/kesir');
    expect(view.queryByTestId('material-open-m-bad')).toBeNull();
    expect(fsCalls.downloads).toHaveLength(0);
    open.mockRestore();
  });

  it('çıkışta indirilmiş materyal dizini silinir', async () => {
    const { h } = await openMaterials();
    await go('/account');
    await act(async () => {
      fireEvent.press(await h.screen.findByTestId('account-sign-out', {}, WAIT));
    });
    await h.screen.findByTestId('sign-in-email', {}, WAIT);
    expect(fsCalls.deleted).toContain('file:///cache/od-materials');
  });

  it('dosya adı temizlenir: yol ayırıcı, üst dizin ve özel karakter yok', () => {
    expect(safeFileName({ id: 'm1', fileName: '../../etc/passwd', mimeType: null, kind: 'PDF' })).toBe('m1-passwd.pdf');
    expect(safeFileName({ id: 'm1', fileName: 'Çalışma Kağıdı (1).pdf', mimeType: 'application/pdf', kind: 'PDF' })).toBe('m1-Calisma_Kagidi__1_.pdf');
    expect(safeFileName({ id: 'm/../1', fileName: null, mimeType: 'application/pdf', kind: 'PDF' })).toBe('m1-materyal.pdf');
    expect(safeFileName({ id: 'm1', fileName: '..\\..\\a.exe', mimeType: null, kind: 'LINK' })).toBe('m1-a.exe');
    expect(userDirectoryName('../x')).toBe('___x');
  });
});
