# `main` dalı koruma standardı

Bu belge hedef GitHub ayarını tanımlar. Ayarların gerçekten etkin olduğu repo
dosyalarından kanıtlanamaz; yönetici yetkili bir hesapla GitHub Rulesets veya
branch protection ekranından uygulanmalı ve doğrulanmalıdır.

## Mevcut doğrulanmış durum (14 Eylül 2026)

GitHub API sorgusunda `main` protection endpoint'i `404 Branch not protected`,
repository ruleset listesi ise `[]` döndürdü. Dolayısıyla aşağıdaki korumaların
hiçbiri şu anda etkin değildir: required `Quality Gate`, review onayı, güncel dal
zorunluluğu, force-push yasağı ve deletion yasağı. Repo yöneticisi bu belgeyi
uyguladıktan sonra API ve deneme PR'ı ile yeniden doğrulamalıdır.

## Zorunlu kurallar

- Hedef dal: `main`.
- Değişiklikler pull request üzerinden gelmeli.
- En az 1 approving review gerekli olmalı.
- Yeni commit geldiğinde eski onaylar düşürülmeli (dismiss stale approvals).
- Son push başka bir onaylayan tarafından onaylanmalı.
- Code owner review, yalnız `CODEOWNERS` sahipliği ayrıca tanımlandığında zorunlu
  yapılmalı.
- Tüm review konuşmaları çözülmeden merge engellenmeli.
- Required status check: CI workflow'undaki `quality-gate` job'ının görünen check
  context'i olan **`Quality Gate`**.
- Merge öncesi dalın güncel olması zorunlu olmalı (strict/up-to-date branch).
- Force push ve branch deletion engellenmeli.
- Kurallar yöneticiler dahil bypass edilmemeli; acil bypass gerekiyorsa yalnız
  sınırlı bir break-glass ekibi actor olarak tanımlanmalı ve kullanımı denetlenmeli.

`Quality Gate`, lint, typecheck, unit coverage, integration, production build,
fresh database, Playwright ve Storybook accessibility işlerinin tümünü `needs`
ile toplar. Tek tek alt işleri required yapmak yerine bu kararlı son check'i
required yapmak job matrisi değişirken ruleset drift'ini azaltır.

## GitHub Rulesets ile uygulama

1. GitHub'da repository'yi açın ve **Settings → Rules → Rulesets** yoluna gidin.
2. **New ruleset → New branch ruleset** seçin.
3. Adı `main protection` yapın, enforcement status'u **Active** seçin.
4. **Target branches → Include default branch** (veya pattern olarak `main`)
   ekleyin.
5. Bypass list'i boş bırakın ya da yalnız denetlenen break-glass ekibini ekleyin.
6. **Require a pull request before merging** seçeneğini açın; required approvals
   değerini `1` yapın, stale approvals ve approval of the most recent reviewable
   push seçeneklerini açın.
7. **Require conversation resolution before merging** seçeneğini açın.
8. **Require status checks to pass** seçeneğini açın. Önce CI'ın en az bir PR'da
   çalışmış olması gerekir; aramada `Quality Gate` check'ini seçin.
9. **Require branches to be up to date before merging** seçeneğini açın.
10. **Block force pushes** ve **Restrict deletions** kurallarını açın.
11. Ruleset'i kaydedin ve hedef dal eşleşmesini ruleset özetinden kontrol edin.

Klasik ekran kullanılıyorsa **Settings → Branches → Add branch protection rule**
yolunda branch name pattern `main` seçilir ve aynı seçenekler işaretlenir.

## Yönetici doğrulaması

Ayar sonrası yönetici yetkili `gh` oturumuyla aşağıdakileri çalıştırmalıdır:

```bash
gh api repos/TerekliTahaBerk/online-dershanem/rulesets
gh api repos/TerekliTahaBerk/online-dershanem/branches/main/protection
```

Çıktıda `Quality Gate` required check'i, strict/up-to-date koşulu, en az bir
approval, force-push yasağı ve deletion yasağı görülmelidir. Ayrıca zararsız bir
deneme PR'ında check tamamlanmadan merge düğmesinin kapalı olduğu doğrulanmalıdır.
