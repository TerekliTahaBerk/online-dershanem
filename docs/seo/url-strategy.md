# URL kararı

Mevcut `/urunler/online-dershanem`, `/urunler/online-kocum`, `/urunler/online-deneme-kulubum` korunur. Yeni `/yon-kocluk` veya `/deneme-ligi` URL'si açılmadı. Mevcut canonical, iç bağlantı, kampanya ve backlink davranışını taşımanın kanıtlanmış getirisi yok; Search Console/backlink verisine erişilmedi.

`lib/public-legacy-redirects.ts` ve `next.config.ts` exact path kalıcı yönlendirmeleri korur; alt ödeme rotaları değiştirilmez. URL'ye eklenen kampanya parametreleri canonical'a girmez. Discovery bağlantıları üzerinde izinli UTM değerleri URL ile taşınır; çerez veya localStorage yazılmaz.

Sonraki değişiklik ancak indeks/backlink envanteriyle: tek adım permanent redirect, yeni canonical/sitemap/iç bağlantı uyumu, eski URL sorgu parametre testi. Sitemap'e duplicate branded ürün eklenmez. Robots `noindex` yerine geçmez; özel hesap sayfalarının mevcut metadata kuralları korunur.
