# Meta Instagram kurulumu

Entegrasyon yeni uygulamalar için **Instagram API with Instagram Login** akışını hedefler. Professional Business/Creator hesap gerekir; `graph.instagram.com` ve `instagram_business_basic`, `instagram_business_manage_messages` izinleri kullanılır. Instagram Login ads verisine erişmez; reklam raporlama ayrıca Marketing API izinleri gerektirir.

1. Meta App Dashboard’da Business uygulaması ve Instagram ürünü oluşturup Professional hesabı bağlayın.
2. App’in güncel Graph API sürümünü `META_GRAPH_API_VERSION` olarak açıkça girin; kaynak kod varsayımı kullanmayın.
3. Callback: `https://www.onlinedershanem.com/api/integrations/instagram/webhook`; verify token `META_VERIFY_TOKEN` ile aynı olmalı.
4. `messages`; gerekiyorsa `messaging_seen`, `messaging_postbacks`, `message_reactions` ve referral alanlarına abone olun.
5. App secret, user token ve account id’yi Vercel server env’e ekleyin.
6. Development’ta app rolü/test hesabı kullanın. Başka hesaplar için Advanced Access, business verification ve App Review gerekir. İnceleme videosu inbound mesaj, inbox ve panel yanıtını göstermelidir.

GET doğrulaması `hub.mode`, `hub.verify_token`, `hub.challenge`; POST doğrulaması raw body üzerindeki `X-Hub-Signature-256` ile yapılır. Meta 5 saniye içinde 200 bekler ve başarısız teslimi tekrarlar; sistem event ID ile dedup yapar. Resmi kaynaklar: [Meta Instagram API koleksiyonu](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), [Meta webhook koleksiyonu](https://www.postman.com/meta/messenger-platform-api/folder/22794852-b5d97624-14d8-4e67-a2e4-529add49ca58).

Test event’inden sonra sırasıyla `InstagramWebhookEvent`, `BackgroundJob`, `BusinessConversation`, `BusinessMessage` kontrol edilir. 401 imza/app secret, 403 verify token, `META_SEND_*` token/izin/sürüm sorununa işaret eder.

