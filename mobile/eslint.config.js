const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Web reposundaki (`../eslint.config.mjs`) aynı gerekçeyle kapatıldı:
    // "veri yükle" efekti (`useEffect(() => { load() }, [...])`) her zaman
    // dolaylı olarak setState çağırır — bu üç kural o meşru deseni bile
    // hata sayıyor. Aynı ekip, aynı tercih; iki yerde ayrı karar YOK.
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];
