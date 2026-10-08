// Varsayılan Expo Metro yapılandırması + paylaşılan mobil sözleşmeler.
// `../lib/mobile-contracts` bağımlılıksız TypeScript'tir (CI:
// `scripts/check-mobile-contracts.mjs`); yalnız bu dizin izlenir, sunucu
// kodunun geri kalanı (`../lib/**`) paketlenemez.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../lib/mobile-contracts')];

module.exports = config;
