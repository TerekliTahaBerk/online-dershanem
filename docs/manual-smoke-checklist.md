# Manual Smoke Checklist — Production (Phase 2)

> Run this AFTER a deploy to verify the critical surface still works.
> Each box should be ticked on a real device against the production URL.
> Use a freshly created test account per role where possible (clean up
> at the end via `DELETE FROM "User" WHERE email LIKE 'smoke-%'`).

Last updated: Session 19 (2026-05-31).

---

## Executable order (Session 19 quick map)

Run sections in this order after deploy. Each maps to an existing
detailed section below.

| # | Phase | Detailed section |
|---|-------|------------------|
| 1 | Auth + anonymous | §1.1 |
| 2 | Admin smoke | §1.2 (+ §1.2.b finance reports, §1.2.c ODK builder) |
| 3 | Teacher smoke | §1.3 |
| 4 | Student smoke | §1.4 |
| 5 | Parent smoke | §1.5 |
| 6 | ODK end-to-end | §1.2.c + §1.4 (student attempt) |
| 7 | Finance flow | §1.6 |
| 8 | Cron / reminders | §1.7 + §5.6 |
| 9 | Security spot-checks | §4 + §5.5 |
| 10 | Cleanup | §5 |

---

## 0 · Prerequisites

- [ ] Have credentials for: 1× admin, 1× teacher, 1× student, 1× parent.
- [ ] Browser dev-tools open with Console + Network tabs visible.
- [ ] No browser extensions that block third-party cookies (Pusher).

---

## 1 · Critical path (release-blocking)

These MUST pass. If any fails, roll back per
`docs/production-deploy-checklist.md` §6.

### 1.1 Anonymous + auth

- [ ] `GET /` renders the homepage with no console errors.
- [ ] `GET /giris` shows the login form. Submitting an invalid password
      shows a Turkish error and does not 500.
- [ ] Login as **admin** → land on `/panel` without redirect loop.
- [ ] `Set-Cookie: next-auth.session-token` arrives with `Secure`,
      `HttpOnly`, `SameSite=Lax`.
- [ ] Logout from the panel returns you to `/` and the session
      cookie is cleared.

### 1.2 Admin core

- [ ] `/panel/admin` dashboard loads and shows non-zero KPIs.
- [ ] `/panel/admin/ogrenciler` student list paginates (≥ 1 page) without
      timeouts; search by name works.
- [ ] Open one student → tabs (Bilgiler / Sınıflar / Veliler / Ödemeler /
      Notlar / Mazeretler / Devam) all load without 500.
- [ ] `/panel/admin/odemeler` admin payment-schedule table renders;
      "Ödendi" / "Kısmi" actions update the row state.
- [ ] `/panel/admin/ogretmen-hakedisleri` payroll periods list loads;
      open one period and the per-teacher + per-item tables render.

### 1.2.b Admin finance reports (Session 14)

- [ ] `/panel/admin/finans/raporlar` opens for an admin without 500.
- [ ] All four range chips (Bu ay / Son 30 gün / Son 90 gün / Bu yıl)
      reload the page without crashing. Invalid `?range=garbage` falls
      back to "Bu ay".
- [ ] **Beklenen tahsilat** matches the sum of remaining amounts on
      `/panel/admin/odemeler` for `PENDING + PARTIAL` rows with
      `dueDate >= today`.
- [ ] **Geciken tahsilat** matches the same query restricted to
      `dueDate < today`.
- [ ] **Gerçekleşen gelir** matches the income sum on
      `/panel/admin/muhasebe?service=ALL` for the selected range.
- [ ] **Hakediş yükümlülüğü** card matches the count + total of
      APPROVED unpaid items inside `/panel/admin/ogretmen-hakedisleri`.
- [ ] Cross-link buttons in the header land on the correct legacy
      finance pages.
- [ ] Logged-in **teacher / parent / student** receive 403 / redirect
      when they try to open `/panel/admin/finans/raporlar` directly.
- [ ] No write actions exist on the report page (no "Sil", "Onayla",
      "Ödendi" buttons).

### 1.2.c Admin ODK exam builder (Session 15)

- [ ] `/panel/admin/odk/denemeler` opens for an admin and lists exams
      with the new "Hazırlık" column showing one of:
      Hazır (yeşil) / Uyarı var (sarı) / Eksik (kırmızı).
- [ ] The status filter dropdown narrows to DRAFT / PUBLISHED / ARCHIVED
      and the search box filters by title or slug.
- [ ] Open a DRAFT exam that is missing booklet PDF / answer key /
      outcomes / access tags. Readiness checklist marks each missing
      item with ✕ and the "Yayına al" button is **disabled**.
- [ ] Complete all required items via the editor; the readiness card
      flips to "Hazır" and "Yayına al" becomes enabled.
- [ ] Click "Yayına al" → confirm dialog → status badge becomes
      "Yayında", `publishedAt` populates in the Genel card.
- [ ] On a PUBLISHED exam, click "Yayından kaldır" → status returns to
      "Taslak"; existing attempt count is **unchanged**.
- [ ] Click "Arşivle" on any exam → status becomes "Arşiv"; the
      "Yayına al" / "Yayından kaldır" buttons disappear; "Arşivden
      çıkar" appears.
- [ ] "Arşivden çıkar" returns the exam to "Taslak" without touching
      `publishedAt`.
- [ ] Logged-in **teacher / parent / student** opening
      `/panel/admin/odk/denemeler` or any `/api/v1/odk/admin/exams/*`
      endpoint receives a 401/403.
- [ ] An exam with attempts > 0 still cannot be DELETEd via
      `DELETE /api/v1/odk/admin/exams/[id]` (409). Archive should be
      used instead.

### 1.3 Teacher core

- [ ] Login as **teacher** → land on `/panel` without 500.
- [ ] Today's lessons widget shows current-day lessons or an empty state.
- [ ] Open one lesson → attendance grid renders only students in that
      lesson; saving attendance toasts success.
- [ ] `/panel/ogretmen/odevler` homework list filters by status.
- [ ] `/panel/ogretmen/mazeretler` shows pending excuses for this
      teacher's classrooms only (no leakage from other teachers).

### 1.4 Student core

- [ ] Login as **student** → land on `/panel` (student dashboard).
- [ ] Roadmap card and upcoming-lesson card render.
- [ ] Open one assigned homework → submit a short answer → success toast.
- [ ] `/panel/ogrenci/derslerim` lesson history loads.

### 1.5 Parent core

- [ ] Login as **parent** → child switcher visible if the parent has ≥ 2
      children; selecting a child re-renders the dashboard.
- [ ] `/panel/veli/odemeler` shows due / paid tabs with correct totals
      in TRY (₺) — kuruş ↔ TL conversion correct.
- [ ] `/panel/veli/mazeret` allows submitting a new excuse for a child;
      cancelling a PENDING excuse works.

### 1.6 Finance / payment flow

- [ ] Add a paid course to the cart from a public course page.
- [ ] Reach `/sepet` and proceed to checkout.
- [ ] PayTR iframe loads (no mixed-content warnings).
- [ ] Cancel the payment → return to `/sepet` with the order intact.
      (Do NOT actually charge a real card during smoke; use PayTR test
      mode if available, otherwise stop at iframe load.)

### 1.7 Cron health

- [ ] Vercel Dashboard → Cron Jobs → no job has "last run failed" within
      the past 24 h.

---

## 2 · Important but non-blocking

- [ ] `/blog` and 1 blog post render.
- [ ] `/sss` FAQ accordion expands.
- [ ] `/iletisim` contact form submits and shows success state.
- [ ] Mobile app (Expo Go pointed at production) can log in as
      student/parent and fetch the dashboard.
- [ ] Push notification arrives on at least one registered device when
      a teacher creates a homework assignment.

---

## 3 · Realtime / sockets

- [ ] In two browser tabs (admin + student), creating a homework in
      admin causes the student tab's notification badge to update
      within ~ 5 s.
- [ ] Browser Network → WS connection to Pusher stays open with no
      `4xx`/`5xx` close codes.

---

## 4 · Security spot-check (must remain failing for non-owners)

- [ ] Logged-in **student A** cannot fetch student B's data:
      `GET /api/student/<B-id>` → 403 / 404.
- [ ] Logged-in **teacher X** cannot mutate attendance for a lesson
      they do not own (Session 12 fix #2):
      attempt POST → 403.
- [ ] Logged-in **parent** cannot read a child they are not linked to:
      direct ID in URL → 404.
- [ ] Anonymous request to `/api/admin/*` → 401.

---

## 5 · Cleanup

- [ ] Delete any smoke-only `User`, `Order`, `PaymentScheduleItem`
      records created above:
      ```sql
      DELETE FROM "User" WHERE email LIKE 'smoke-%';
      ```
- [ ] Confirm no stray push subscriptions or sessions remain for the
      smoke users.

---

## 5.5 · Security guardrails (Session 17)

> Verifies the rate-limit + same-origin guards on high-risk mutations.
> All checks should pass without affecting normal flows.

- [ ] **Homework submit flood** — as a student, click "Gönder" 31× within
      one minute. First ~30 succeed; the next returns the Turkish "Çok
      fazla istek..." error. Wait 60s → next submit works again.
- [ ] **Attendance bulk flood** — as a teacher, save `recordClassroomAttendanceAction`
      31× within a minute. 31st blocked with friendly Turkish error.
- [ ] **Parent excuse flood** — as a parent, submit 11 excuses in 10
      minutes. The 11th is rejected with the rate-limit message.
- [ ] **ODK student submit replay** — call
      `POST /api/v1/odk/student/attempts/:id/submit` 6× in a minute (use
      browser devtools to repeat). After the legitimate first submit
      returns 200, repeats return **409** ("Çözüm zaten tamamlandı").
      Independently, hammering >5/min on different attempts of the same
      user returns **429**.
- [ ] **ODK admin publish role gate** — as a non-admin authenticated user,
      `POST /api/v1/odk/admin/exams/:id/publish` returns **403** (handled
      by `middleware.ts`, not the new guard).
- [ ] **Cross-origin POST** — from `curl` simulating a foreign Origin,
      `curl -H "Origin: https://evil.example" -H "Cookie: <session>" -X POST .../publish` →
      response is **403** with "İstek reddedildi (kaynak doğrulanamadı)".
- [ ] **Same-origin from app** — same call with `Origin: <NEXT_PUBLIC_APP_URL>` →
      proceeds normally (subject to rate-limit).
- [ ] **Payment double-mark** — admin clicks "Ödendi olarak işaretle"
      twice on the same row in quick succession → second click is a
      no-op (idempotent status check). No duplicate AccountingEntry rows.
- [ ] **Payroll mark-paid flood** — admin clicks mark-paid 61× within an
      hour → 61st blocked with rate-limit message.
- [ ] **Localhost dev** — same-origin guard does not block any normal
      browser traffic during local dev (`http://localhost:3000`).
- [ ] **No env regression** — with `NEXT_PUBLIC_APP_URL` and
      `NEXTAUTH_URL` set, no warnings appear in production logs about
      missing allowed origins.

---

## 5.6 · Scheduled reminders (Session 18)

> Verifies the inbox-creating cron job. All checks must produce **inbox
> rows** (visible in `/panel/<role>/inbox`) without mutating business
> records.

- [ ] **Auth gate (prod)** — call without bearer:
      ```bash
      curl -X POST https://<host>/api/cron/scheduled-reminders -i
      ```
      Expect **401 Unauthorized**.
- [ ] **Auth ok** — call with the secret:
      ```bash
      curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
        https://<host>/api/cron/scheduled-reminders
      ```
      Expect 200 with JSON `{ ok, totals, jobs:[…] }`. The 8 job names
      must all appear: `upcoming-lesson`, `homework-due-soon`,
      `homework-overdue`, `homework-review-pending`, `payment-due-soon`,
      `payment-overdue`, `absence-excuse-pending`,
      `payroll-review-pending`.
- [ ] **Idempotency** — call the endpoint twice within a minute. Second
      response shows `created: 0` for every job and `skipped` ≥ first
      call's `created`.
- [ ] **Inbox surfaces** — open `/panel/ogrenci/inbox`,
      `/panel/ogretmen/inbox`, `/panel/veli/inbox`, `/panel/admin/inbox`
      — newly-created reminder cards are visible (Türkçe başlıklar:
      "Yaklaşan ders", "Ödev teslim yaklaşıyor", "Yaklaşan ödeme", vb.).
- [ ] **No DB mutation** — confirm via spot-check:
      `PaymentScheduleItem.status` for an overdue row is still
      `PENDING/PARTIAL`; `AbsenceExcuse.status` for old-pending rows is
      still `PENDING`; `TeacherPayrollPeriod.status` unchanged.
- [ ] **No spam path** — cancelled lessons, paid items, graded
      submissions, archived assignments are NOT in any reminder.

---

## 6 · Sign-off

| Role | Name | Date | Notes |
| ---- | ---- | ---- | ----- |
| Engineer | | | |
| Reviewer | | | |

End.
