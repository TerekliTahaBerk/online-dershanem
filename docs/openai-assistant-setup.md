# OpenAI satış asistanı kurulumu

Asistan OpenAI Responses API ve `text.format` altındaki strict JSON Schema Structured Outputs kullanır. OpenAI bu yaklaşımı JSON mode yerine önerir: [Structured Outputs rehberi](https://developers.openai.com/api/docs/guides/structured-outputs).

`OPENAI_API_KEY`, `OPENAI_MODEL`, `INSTAGRAM_AI_CONFIDENCE_THRESHOLD` değerlerini Vercel server env’e ekleyin. Varsayılan `gpt-5.6-luna` yüksek hacimli sınıflandırma içindir; temsilî konuşmalarla eval yapın. `INSTAGRAM_AI_ENABLED=true` olmadan çağrı yapılmaz; ilk production modu `SUGGESTION` olmalıdır.

Kullanıcı mesajı veri, sistem kuralları ve bilgi merkezi ayrı bölümlerdir. Provider structured karar döndürür; Zod tekrar doğrular. AI doğrudan DB aracı çalıştırmaz. Düşük güven veya güvenli olmayan intent otomatik yanıtı kapatır.

