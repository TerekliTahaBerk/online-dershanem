# Self-host fontlar

`app/layout.tsx` bu dosyaları `next/font/local` ile yükler. Build sırasında
Google Fonts'a ağ isteği atılmaz; kısıtlı ağda build deterministiktir.

| Aile | Dosya | Sürüm | Eksen | Lisans |
|---|---|---|---|---|
| Manrope | `manrope/manrope-latin-ext-wght.woff2` | 4.504 | `wght` 200–800 | SIL OFL 1.1 (`manrope/OFL.txt`) |
| JetBrains Mono | `jetbrains-mono/jetbrains-mono-latin-ext-wght.woff2` | 2.211 | `wght` 100–800 | SIL OFL 1.1 (`jetbrains-mono/OFL.txt`) |

OFL, fontun uygulamayla birlikte gömülü dağıtımına ve alt kümelenmesine izin
verir; koşul, lisans metninin fontla birlikte tutulmasıdır. Dosya adları
"Reserved Font Name" içermez.

## Kaynak

`google/fonts` deposundaki değişken TTF'ler (Google Fonts'un sunduğu dosyaların
kaynağı):

- `ofl/manrope/Manrope[wght].ttf` — sha256 `d0639be45d0af36e798172419d7bd173c4bd4f29e2b76cbb69db1d11bf8b0a40`
- `ofl/jetbrainsmono/JetBrainsMono[wght].ttf` — sha256 `48715a42ec242c21e9f02692891e147d022299a52e48d5e413e1a942193ffeda`

## Yeniden üretim

Google Fonts CSS API'si her aileyi `latin` ve `latin-ext` olarak iki dosyaya
böler; `next/font/local` dosya başına `unicode-range` desteklemediği için iki
aralığın birleşimi tek dosyaya alt kümelenir (Türkçe `ğ ş ı İ` latin-ext'tedir,
her sayfada ikisi de gerekiyordu):

```bash
python3 -m venv .venv && .venv/bin/pip install fonttools brotli
RANGES="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
.venv/bin/pyftsubset "Manrope[wght].ttf" --unicodes="$RANGES" --layout-features='*' --flavor=woff2 --output-file=manrope-latin-ext-wght.woff2
.venv/bin/pyftsubset "JetBrainsMono[wght].ttf" --unicodes="$RANGES" --layout-features='*' --flavor=woff2 --output-file=jetbrains-mono-latin-ext-wght.woff2
```

## Doğrulama (2026-09-13)

Google Fonts'un `latin` + `latin-ext` WOFF2'leriyle fontTools karşılaştırması:

- Manrope: Google'daki 368 kod noktasının hepsi var, ilerleme genişliği farkı 0,
  `unitsPerEm`/ascent/descent aynı.
- JetBrains Mono: 405 kod noktasının hepsi var, ilerleme genişliği farkı 0,
  metrikler aynı. Google `wght` eksenini 400–800'e kırpıyor; burada 100–800
  kalır, ama `layout.tsx` yalnız 400 ve 600 yüzlerini tanımlar.
