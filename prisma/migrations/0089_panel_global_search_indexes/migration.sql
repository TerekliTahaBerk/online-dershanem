-- Panel global search: equality/prefix yardımcı btree indeksleri.
-- ILIKE '%x%' tam GIN/trgm olmadan yine seq scan yapabilir; 5k kullanıcı
-- ölçeğinde take-limit + rol filtresi yeterlidir. Telefon ve ad indeksleri
-- daha seçici sorguları hızlandırır.

CREATE INDEX IF NOT EXISTS "users_full_name_idx" ON "users"("full_name");
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users"("phone");
CREATE INDEX IF NOT EXISTS "groups_name_idx" ON "groups"("name");
CREATE INDEX IF NOT EXISTS "lessons_title_idx" ON "lessons"("title");
