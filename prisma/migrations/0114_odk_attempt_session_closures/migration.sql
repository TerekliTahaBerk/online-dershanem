-- Deneme Ligi oturumlu sınav (LGS Sözel → ara → Sayısal).
--
-- Yalnız öğrencinin bir oturumu ERKEN kapattığı an saklanır; süre dolunca
-- kapanış ve ara pencereleri deneme başlangıcı ile sürüm ayarlarındaki oturum
-- planından (`settings.sessions`) sunucuda hesaplanır. Oturum planı olmayan
-- sınavlar etkilenmez. Mevcut veri değişmez.

-- CreateTable
CREATE TABLE "odk_attempt_session_closures" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "session_key" TEXT NOT NULL,
    "closed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odk_attempt_session_closures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "odk_attempt_session_closures_attempt_id_session_key_key" ON "odk_attempt_session_closures"("attempt_id", "session_key");

-- AddForeignKey
ALTER TABLE "odk_attempt_session_closures" ADD CONSTRAINT "odk_attempt_session_closures_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "odk_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
