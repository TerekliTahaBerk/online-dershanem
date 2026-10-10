import type { MobileMaterial } from '@contracts/student';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking } from 'react-native';

import { materialFilePath } from '@/lib/api/student';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { downloadMaterialFile } from '@/lib/files/material-files';
import { isSafeExternalUrl } from '@/lib/links';

export type OpenableMaterial = Pick<MobileMaterial, 'id' | 'hasFile' | 'url' | 'fileName' | 'mimeType' | 'kind' | 'title'>;

export function canOpenMaterial(material: Pick<OpenableMaterial, 'hasFile' | 'url'>): boolean {
  return material.hasFile || isSafeExternalUrl(material.url);
}

/**
 * Materyal açma (Kaynaklar ve Telafi ortak): kimlikli dosya Bearer
 * başlığıyla indirilir ve paylaşım / önizleme ekranında açılır; dış
 * bağlantı yalnız http(s) ise açılır. Token hiçbir zaman URL'e girmez.
 */
export function useMaterialOpener() {
  const { api } = useSession();
  const bootstrap = useReadyBootstrap();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  async function open(material: OpenableMaterial) {
    setOpeningId(material.id);
    setError(null);
    try {
      if (!material.hasFile) {
        if (isSafeExternalUrl(material.url)) await Linking.openURL(material.url);
        return;
      }
      if (!api.baseUrl) return;
      const file = await downloadMaterialFile({ baseUrl: api.baseUrl, path: materialFilePath(material.id), headers: api.authHeaders(), userId: bootstrap.user.id, material });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, material.mimeType ? { mimeType: material.mimeType, dialogTitle: material.title } : { dialogTitle: material.title });
      } else {
        setError({ id: material.id, message: 'Bu dosyayı açabilecek bir uygulama telefonunda bulamadık.' });
      }
    } catch {
      setError({ id: material.id, message: 'Kaynağı açamadık. Bağlantını kontrol edip bir daha dener misin?' });
    } finally {
      setOpeningId(null);
    }
  }

  return { open, openingId, errorFor: (id: string) => (error?.id === id ? error.message : null) };
}
