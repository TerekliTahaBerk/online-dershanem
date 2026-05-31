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

---

## Phase 3 — Session 1 — Student Onboarding (2026-06)

> 14 smoke cases for the new student creation wizard, onboarding card and
> account action surface. Run as ADMIN against a clean DB (or a tenant whose
> deletion is allowed).

1.  **Wizard renders** — `/panel/admin/ogrenciler/yeni` shows 7 sections,
    sticky side TOC, all dropdowns populated (classrooms / parents /
    packages / tags).
2.  **Minimal create (no account)** — Submit with Ad Soyad + Telefon only,
    Hesap modu = `none`. Redirects to the new student detail page.
    No `User` row was created.
3.  **Full create with invite** — Submit with email + classroom + parent +
    package + tag + `accountMode=invite`. Detail page renders, onboarding
    card shows ALL required items ✓, and the invite link is visible on the
    parent's audit row.
4.  **Duplicate phone blocks create** — Try to create a second student with
    the same telephone. Toast shows the structured error ("Duplicate kayıt:
    Student "X" (phoneKey)…"). No partial student is left in DB.
5.  **Duplicate email blocks create** — Try to create a student with an email
    that already belongs to a `User`. Toast shows ("User "X" (user.email)…").
6.  **Onboarding card — required items** — On a student with no parent, no
    classroom, no package, the card shows correct `2/3` (or similar) required
    progress, ⚠️ warning chip on each missing required step.
7.  **Onboarding card — recommended items** — Recommended items render with
    "Önerilen" badge and don't block "Onboarding tamam" status as long as
    required items are done.
8.  **Account create from detail** — On a student created without account
    (#2), click "Davet linki üret". Server action runs, link is shown,
    "Panoya kopyala" copies it. Page re-renders showing INVITE_PENDING.
9.  **Temp password from detail** — Click "Geçici şifre ver" instead.
    Returned password is displayed with a "won't be shown again" warning,
    `mustChangePassword=true` is set on the user.
10. **Force password change** — Click "Şifre değişimi zorunlu kıl" on an
    active account. `mustChangePassword` flips to true; user is notified
    (check inbox).
11. **Disable account** — Click "Hesabı devre dışı bırak". `accountDisabledAt`
    is set; the user can no longer log in (try `/giris` in incognito —
    should fail silently).
12. **Re-enable account** — On the disabled account, click "Hesabı
    aktifleştir". `accountDisabledAt` cleared; user can log in again.
    Their `lastLoginAt` is updated after a successful login (verify by
    re-loading the student detail page — onboarding card shows ACTIVE).
13. **Bidirectional parent link** — On the student detail page, link a
    parent. The parent's detail page shows the student. Audit log on the
    student has STUDENT_PARENT_LINK; parent user (if any) has an inbox
    notification.
14. **Rate-limit enforcement** — Try to generate 31 invite links for the
    same student in <1h (use a script). The 31st call returns a rate-limit
    error from the mutation guard.

### Cleanup after Session 1 smoke

```sql
DELETE FROM "User"    WHERE email      LIKE 'smoke-phase3-%';
DELETE FROM "Student" WHERE "phoneKey" LIKE '+90555900%';
DELETE FROM "Parent"  WHERE phone      LIKE '+90555901%';
```

## Phase 3 — Session 2 — Invite acceptance + forced password change (2026-06)

> Run against a fresh user from Session 1 smoke (steps 8–10).

1.  **Invite happy path** — Admin clicks "Davet linki üret" on a fresh
    student. Open the link in incognito. The `/davet/[token]` page
    greets the student by name and shows the password setup form.
    Enter a strong password twice, submit. Page redirects to
    `/giris?callbackUrl=/panel/ogrenci`. Audit log gets
    `USER_INVITE_ACCEPT`; the student receives an `ANNOUNCEMENT`
    inbox notification ("Hesabınız aktif").
2.  **Invite single-use** — Open the same link in a second incognito
    tab BEFORE submitting in tab #1. Submit in tab #1 (succeeds), then
    submit in tab #2. Tab #2 shows "Davet bağlantısı geçersiz veya
    başka bir sekmede kullanıldı."
3.  **Invite expired** — Manually `UPDATE "User" SET
    "userInviteTokenExpiresAt" = NOW() - INTERVAL '1 day' WHERE …`.
    Visit the link. Page shows "Davet bağlantısının süresi dolmuş."
    plus a "Yöneticiden yeni davet isteyin" CTA.
4.  **Invite invalid token** — Visit `/davet/abc`. Page shows the
    generic invalid-token error (no token enumeration: same message
    as expired/not-found).
5.  **Invite for disabled account** — Disable the account from the
    admin panel. Visit the invite link. Page shows
    "Bu hesap devre dışı bırakılmış."
6.  **Login + forced change (temp password flow)** — Admin issues a
    temp password (step 9 from Session 1 smoke). Use that password to
    log in via `/giris`. After successful login, browser lands on
    `/panel/sifre-degistir` (not the role dashboard). Title says
    "Şifrenizi belirleyin".
7.  **Forced change happy path** — On `/panel/sifre-degistir`, enter
    the temp password as "Mevcut şifre" and a new strong password
    twice. Submit. Redirects to `/panel/ogrenci` (or the appropriate
    segment). Audit log gets `USER_PASSWORD_CHANGE`. The
    `mustChangePassword` column flips to false; `passwordChangedAt`
    is set.
8.  **Forced change — wrong current password** — Re-issue a temp
    password (admin), log in, enter a wrong "Mevcut şifre". Error
    shows "Mevcut şifre hatalı." User stays on the page.
9.  **Forced change — same as old rejected** — Log in with temp
    password, attempt to set the new password equal to the temp.
    Error: "Yeni şifre eskisiyle aynı olamaz."
10. **Forced change — weak password rejected** — Try `1234`. Error:
    "Şifre en az 8 karakter olmalı." (and HTML5 minLength also
    blocks).
11. **`mustChangePassword` bypass attempt** — While `mustChangePassword=true`,
    try to navigate to `/panel/ogrenci/odk` (or any panel route).
    Should redirect to `/panel/sifre-degistir`. Both middleware and
    `requirePanelSession()` enforce this; turning off either one
    should still leave the other gate active.
12. **Disabled account mid-session** — Log in (`mustChangePassword=false`).
    From the admin panel, disable the account. Reload any panel page.
    Within at most one request, the user is bounced to `/giris` (JWT
    callback drops `token.role` for disabled users).
13. **Voluntary change (no temp flow)** — As a normal active user with
    `mustChangePassword=false`, navigate manually to
    `/panel/sifre-degistir`. Page title reads "Şifreyi değiştir".
    Change succeeds; user is redirected to their role dashboard.


# Session 3 — Parent operational management

Run after Session 1 + 2 smoke. Cases 14–28. Each case starts from a clean
admin login at `/panel/admin/veliler` unless stated otherwise.

## Wizard (D2)

14. **Wizard happy path — invite flow** — Visit
    `/panel/admin/veliler/yeni`. Fill name + phone + email. Section
    "Hesap" → choose **"Davet linki gönder"**. Section "Öğrenciler" →
    add one student via combobox + relationship "Anne". Submit.
    Result panel shows the parent, the invite URL, and a
    "Velinin paneline git" link. Copy-once button works.
15. **Wizard happy path — temp password flow** — Same flow but in
    "Hesap" choose **"Geçici şifre üret"**. Result panel shows
    a one-time temp password + a "Kopyalandı" toast on click.
16. **Wizard happy path — no account** — Choose **"Hesap oluşturma"**.
    Parent is created without a `User`; result panel shows
    "Hesap oluşturulmadı" and a CTA to open the detail page.
17. **Wizard duplicate detection — phone** — Type a phone that already
    exists. Within ~350 ms a yellow info card surfaces with the
    matching parent's name + a link to their detail page. Submit
    button stays enabled but the warning is loud.
18. **Wizard duplicate detection — email** — Same, with email.
19. **Wizard validation** — Empty name → submit blocked with
    "Ad gerekli". Invalid email → "Geçerli bir e-posta girin".

## Detail cockpit (D3)

20. **Detail — link a child** — On `[id]/duzenle`, "Bağlı çocuklar"
    card → search a student via combobox → choose relationship →
    submit. Row appears immediately. `ParentStudent` row exists.
    Audit log gets `PARENT_STUDENT_LINK`.
21. **Detail — change relationship inline** — Click "Düzenle" on an
    existing row. Change "Anne" → "Vasi". Save. Badge updates.
    No page reload required.
22. **Detail — unlink child** — Click "Bağlantıyı kaldır". Confirm
    dialog appears. After confirm, row disappears. Audit log gets
    `PARENT_STUDENT_UNLINK`.
23. **Detail — issue invite from cockpit** — Right rail
    "Hesap" card → "Davet bağlantısı oluştur". Token + URL appear in
    a copy-once block. Status badge flips to "Davet bekliyor".
24. **Detail — disable / enable** — Click "Hesabı devre dışı bırak".
    Status badge → "Devre dışı". Re-enable. Status returns to prior
    derived state. Both produce audit rows.
25. **Detail — force password change** — Click "Şifre değişimi zorla".
    Confirm. Card shows a yellow note + temp password copy block.
    Next time that user logs in, they are routed through
    `/panel/sifre-degistir` (Session 2 case 6).

## List filters + saved views (D4)

26. **List filter — Hesabı olmayan veliler** — Click the saved view
    chip. URL now contains `?access=no`. Every visible row shows
    badge "Hesap yok". Counts update in pagination footer.
27. **List filter — Davet bekleyenler** — Click chip. Only rows with
    a non-expired invite token are shown. Badge "Davet bekliyor".
    "Hesap durumu" hint reads "Davet: DD.MM.YYYY sonuna kadar".
28. **List filter — Hiç giriş yapmayanlar** — Click chip. URL
    contains `?access=yes&lastLogin=never`. All rows have an account
    but `lastLoginAt` is null; meta hint says "Henüz giriş yapmadı".
29. **List filter — Çocuğu bağlanmamış veliler** — Click chip. Only
    rows whose parent has zero `ParentStudent` rows are shown. The
    "Bağlı çocuklar" cell is empty (em-dash).
30. **List search — phone** — Type `0532` (or a partial phone) into
    the search box. List narrows to matches in `phone`. Diacritic-
    insensitive match works for `email` / `fullName` too.
31. **List search — email** — Type `gmail` → list narrows to email
    matches. Combine with `?state=ACTIVE` chip → AND semantics: only
    active accounts whose email contains `gmail`.
32. **List → detail handoff** — Click any row. Lands on `[id]/duzenle`
    with the same parent. Back button preserves filters in the URL.
33. **List — invite expired row** — For a parent whose invite has
    expired, badge reads "Davet süresi doldu". Hint shows the
    expiry date in the past. Saved view "Daveti süresi dolanlar"
    surfaces only these rows.
34. **List — disabled account row** — For a parent with
    `accountDisabledAt` set, badge reads "Devre dışı". Hint shows
    "Devre dışı: DD.MM.YYYY". Saved view "Devre dışı hesaplar"
    surfaces only these rows.
35. **List — empty state copy** — Use a filter combination with no
    matches (e.g. `?state=DISABLED&missing=phone&q=zzz`). Empty
    state copy reads "Bu filtrelere uyan veli yok" (not the new-
    tenant copy). Clear the filters → list returns.


# Session 3 — D7 Student 360 inline parent management

Run from `/panel/admin/ogrenciler/[id]/duzenle` for an admin user.
Cases 36–43.

36. **Student → link existing parent** — Open the edit page of a
    student with no parents. The "Veli ata" panel is open by
    default. Stay on **"Mevcut veliyi bağla"**, search a parent,
    pick relationship "Anne", check "Birincil iletişim", click
    "Bağla". The parent card appears in the grid with the
    "Birincil iletişim" subtitle. The audit log gets
    `STUDENT_PARENT_LINK`.
37. **Student → create new parent without account** — Click
    "+ Veli ata" if closed, switch to **"Yeni veli oluştur ve
    bağla"** tab. Fill name + phone, leave email empty. Account
    section: leave "Hesap oluşturma". Choose relationship "Baba".
    Click "Oluştur ve bağla". Result panel shows
    "✓ {name} oluşturuldu ve bağlandı" with **no** invite URL and
    **no** temp password block. The parent card appears with badge
    "Hesap yok". Audit log: `PARENT_CREATE` + `PARENT_STUDENT_LINK_BATCH`.
38. **Student → create new parent with invite link** — Same flow
    but provide email and choose **"Davet bağlantısı oluştur"**.
    Submit. Result panel shows a copyable invite URL. Click
    "Kopyala" — value lands on the clipboard. Parent card badge
    reads "Davet bekliyor"; hint reads "Davet: DD.MM.YYYY sonuna
    kadar".
39. **Student → create new parent with temp password** — Same flow
    with **"Geçici şifre üret"**. Result panel shows a one-time
    password (8+ chars). Copy works. Parent card badge reads
    "Şifre değiştirmesi gerekli" once the parent first logs in
    (Session 2 forced-change flow takes over).
40. **Student → duplicate parent warning** — In create mode, type
    a phone or email that matches an existing parent. Within
    ~350 ms a yellow box shows "⚠ Aynı telefon ile veli mevcut"
    with the existing parent name + a "veliyi aç →" link and a
    "Mevcut veliyi seç" button. Clicking the button flips back to
    pick mode (no parent pre-selected). Submit while the warning
    is present is allowed only with different fields; the server
    will reject true duplicates with
    `Cakisan kayit mevcut: …`.
41. **Student → parent card account status** — A linked parent
    with a verified active account shows badge "Aktif" and the
    hint "Son giriş: N gün önce". A linked parent with
    `accountDisabledAt` shows "Devre dışı". A parent with no
    `User` row shows "Hesap yok".
42. **Student → open parent in detail cockpit** — Click the
    parent's name (link) or the "Veli detayı →" button on a
    card. Lands on `/panel/admin/veliler/{id}/duzenle` with the
    same parent loaded. Heavy actions (rotate invite, force
    change, disable) are available there.
43. **Student → edit relationship inline** — On a parent card,
    click "İlişkiyi düzenle". Inline editor shows current
    relationship + primary. Change "Anne" → "Vasi", uncheck
    primary, click "Kaydet". Card subtitle updates. Re-checking
    primary on a different parent transfers the marker (last
    write wins via the upsert; admin should be aware only one
    primary makes sense per student but the UI does not enforce
    a single-primary invariant — documented limitation).


---

## Phase 3 — Session 4 — Teacher onboarding (2026-06)

Run as a **panel admin** unless stated otherwise. Reset URL filter chips
between cases. Each case lists the route(s) involved.

### S4-01 — Create teacher without account
* Route: `/panel/admin/ogretmenler/yeni`.
* Fill name + branch (subjects), pick **Hesap oluşturma** = `Hesap oluşturma`,
  no classroom, no compensation rule.
* Submit. **Expected:** redirect to detail page; "Hesap durumu" card shows
  "Hesabı yok" with two "Hesap oluştur" buttons; audit log shows
  `TEACHER_CREATE`.

### S4-02 — Create teacher with invite link
* Wizard with **Hesap oluşturma** = `Davet bağlantısı`. Email is required.
* Submit. **Expected:** result panel reveals invite URL once with copy-once
  UX. Audit shows `TEACHER_CREATE` + `USER_CREATE_VIA_INVITE`. List filter
  "Davet bekleyenler" includes the new teacher.

### S4-03 — Create teacher with temporary password
* Wizard with **Hesap oluşturma** = `Geçici şifre`. Email is required.
* Submit. **Expected:** result panel reveals temp password once. Audit shows
  `TEACHER_CREATE` + `USER_CREATE_VIA_TEMP_PASSWORD`.

### S4-04 — Duplicate email is blocked
* Wizard with an email that already exists on a Teacher OR a User.
* **Expected:** the live duplicates panel shows the match before submit;
  if you submit anyway the action returns `Bu e-posta başka bir kayıtta…`
  and no Teacher/User row is created.

### S4-05 — Teacher uses `/davet/[token]` to set password
* Open the invite URL from S4-02 in a private window.
* Set a password. **Expected:** redirected to `/panel/ogretmen` (teacher
  panel) on success. The User row shows `userInviteTokenUsedAt` set;
  `mustChangePassword=false`.

### S4-06 — Temp-password teacher is forced to change password
* Log in as the S4-03 teacher with the revealed temp password.
* **Expected:** redirected to `/panel/sifre-degistir`; cannot reach
  `/panel/ogretmen` until password is changed; after change,
  `mustChangePassword=false`.

### S4-07 — Disabled teacher cannot access panel
* On a teacher with an active account, click **Hesabı devre dışı bırak**.
* **Expected:** confirm dialog → success toast; account state badge becomes
  "Devre dışı"; logging in as that teacher redirects out of the panel; audit
  shows `USER_ACCOUNT_DISABLE`.

### S4-08 — Assign teacher to classroom
* On detail, "Sınıf / ders ataması" card → pick a classroom + branch + lead.
* **Expected:** row appears in the table; `ClassroomTeacher` exists in DB;
  audit shows `TEACHER_CLASSROOM_ASSIGN`. Re-adding the same classroom
  updates instead of throwing (composite-PK upsert).

### S4-09 — Remove teacher from classroom
* Click **Kaldır** on an existing assignment row, confirm.
* **Expected:** row disappears; `ClassroomTeacher` row deleted;
  related `Lesson` rows are not touched (verify a sample lesson still
  exists with `teacherId` intact); audit shows `TEACHER_CLASSROOM_REMOVE`.

### S4-10 — Teacher can see assigned classroom only
* Log in as the assigned teacher.
* **Expected:** `/panel/ogretmen` lists only their assigned classrooms;
  unassigned classrooms are not visible. (Sanity for `panel-teacher.ts`
  scoping; nothing here has changed but session-4 changes assignment shape.)

### S4-11 — Teacher list filter "Hesabı olmayan"
* `/panel/admin/ogretmenler` → saved view "Hesabı olmayan öğretmenler".
* **Expected:** every row shows account state "Hesabı yok"; URL has
  `access=no`.

### S4-12 — Teacher list filter "Sınıf atanmamış"
* Saved view "Sınıf atanmamış öğretmenler".
* **Expected:** every row shows Sınıf = "0"; URL has `classroom=no`.

### S4-13 — Teacher list filter "Hakediş kuralı eksik"
* Saved view "Hakediş kuralı eksik".
* **Expected:** every row shows Hakediş = warn badge; URL has `compRule=no`.

### S4-14 — Compensation rule created and visible
* Detail → "Hakediş kuralları" card → inline form: rate (TRY), optional
  classroom/course scope, save.
* **Expected:** rule appears in active list with formatted ₺ rate; audit
  shows `PAYROLL_RULE_CREATE`; teacher list "Hakediş kuralı eksik" view no
  longer includes them. Adding a second identical active rule is rejected.

### S4-15 — Teacher detail payroll snapshot renders or honestly empty
* Detail → "Bordro özeti" KPI card.
* **Expected:** shows live counts (lessons / assignments / payroll items)
  for teachers with data; for fresh teachers shows "Henüz bordro kaydı yok"
  (no fake numbers). The "Bordroya git" link goes to
  `/panel/admin/ogretmen-hakedisleri?teacher={id}` and the page filters
  correctly.


---

## Phase 3 — Session 5 — Enrollment & Payment plan (2026-06)

Run as a **panel admin** unless stated otherwise. Each case lists the
route and the row(s) that should appear in DB / UI on success.

### S5-01 — Start enrollment from student detail
* Open `/panel/admin/ogrenciler/{id}` → click **+ Kayıt / Paket**.
* **Expected:** redirected to `/panel/admin/kayitlar/yeni?student={id}`;
  the "Öğrenci" section shows the student name pre-filled (no combobox);
  active enrollments + pending payment counts are visible underneath.

### S5-02 — Start enrollment from standalone route
* Go to `/panel/admin/kayitlar/yeni` directly.
* **Expected:** "Öğrenci" section shows a search combobox; selecting an
  existing student loads the snapshot block underneath (re-render fine
  via client state).

### S5-03 — Select package
* Pick any active package in the dropdown.
* **Expected:** plan amount auto-fills to the package price (in TRY,
  comma-decimal); type (Kurs/Sınav) and ders sayısı render as muted text.

### S5-04 — Select payer parent
* If the student has linked parents, pick one from the payer dropdown.
* If not, an info alert with a "Veli bağla →" CTA renders.
* **Expected:** dropdown lists parents primary-first, with "hesap yok"
  marker for parents without a User account.

### S5-05 — Create one-time payment plan
* Choose **Tek seferlik**, total = 1.500,00, due = today.
* **Expected:** preview shows 1 row "{Paket} ödemesi · {today} · 1.500,00 TL";
  on submit, exactly 1 `PaymentScheduleItem` row appears in DB with
  status=PENDING, amount=150000, paidAmount=0.

### S5-06 — Create installment payment plan
* Choose **Taksitli**, total = 1.500,00, 4 taksit, ilk vade = today.
* **Expected:** preview shows 4 rows, monthly intervals, sum = 1.500,00.
  Last row carries any kuruş remainder (so display sum equals total exactly).

### S5-07 — PaymentScheduleItem rows appear in admin payment page
* After S5-05 / S5-06, open `/panel/admin/odemeler/vadeler`.
* **Expected:** new rows are visible with the chosen titles and dueDates;
  status badge "Bekliyor"; package linked.

### S5-08 — Parent sees dues in parent finance page
* Log in as the payer parent; open `/panel/veli/odemeler`.
* **Expected:** the same rows appear in upcoming list with student name;
  there is **no** "ödendi olarak işaretle" button (parents cannot
  self-mark paid).

### S5-09 — Student detail finance tab reflects enrollment
* Reload `/panel/admin/ogrenciler/{id}?tab=finance`.
* **Expected:** new `StudentPackageEnrollment` row appears with package
  name + price; the existing AccountingEntry list is unchanged (no
  ledger entry created at enrollment time).

### S5-10 — Existing-active enrollment soft-warn
* Run wizard for the same student + package again.
* **Expected:** package dropdown row shows "⚠️ aktif kayıt var"; the
  Önizleme section shows a warning bullet "Bu paket için aktif/açık
  başka bir kayıt zaten var (mükerrer kayıt).". Submit is **allowed**
  (admin override) — verify a second `StudentPackageEnrollment` is
  written.

### S5-11 — Missing parent warning
* Pick a student with 0 linked parents and try to create a plan.
* **Expected:** payer section shows the info alert "Bu öğrenciye bağlı
  bir veli yok." with a "Veli bağla →" CTA. Önizleme bullet warns
  "Ödeme planı oluşturuluyor ama ödeyici veli seçilmedi.".

### S5-12 — Missing amount blocks submit
* Choose **Tek seferlik** but leave amount empty.
* **Expected:** the submit button stays disabled. Forcing the form
  (e.g. via DevTools removal of `disabled`) hits the server action and
  receives `Tek seferlik tutar geçersiz`.

### S5-13 — ODK access tag assignment works
* Pick a student with `userId` set. Tick one ODK access tag in section 3.
* **Expected:** on submit, `OdkUserAccessTag` row exists with
  `(userId=student.userId, accessTagId=…, revokedAt=null)`. Audit
  shows `ODK_ACCESS_TAG_GRANT_BATCH`. Re-running with the same tag is
  idempotent (upsert clears `revokedAt`).

### S5-14 — No payment marked paid automatically
* For all of S5-05 / S5-06 / S5-13, query
  `select status, paidAt, paidAmount from "PaymentScheduleItem"
   where "createdAt" > now() - interval '5 minutes'`.
* **Expected:** every row has status='PENDING', paidAt=null,
  paidAmount=0. No AccountingEntry rows referencing these items.

### S5-15 — Parent cannot self-mark paid
* As the payer parent, attempt to POST to any of
  `markPaymentScheduleItemPaidAction` / `markPaymentScheduleItemPartialAction` /
  `cancelPaymentScheduleItemAction`.
* **Expected:** rejected by `requirePanelRole("admin")` — no DB mutation
  occurs. The parent UI does not surface these actions.


---

## Phase 3 — Session 6 — Enrollment detail / lifecycle (2026-06)

Run as a **panel admin** unless stated otherwise.

### S6-01 — Open enrollment detail from list
* Open `/panel/admin/kayitlar` → click **Detay →** on any row.
* **Expected:** redirected to `/panel/admin/kayitlar/{id}`. Header shows
  breadcrumb, status badge, quick links (Öğrenci 360, Vadeler, Veli
  detayı, Paket).

### S6-02 — Open enrollment detail from Student 360
* Open `/panel/admin/ogrenciler/{id}?tab=finance`.
* In the "Paket kayıtları" table, click **Detay →** on a row.
* **Expected:** lands on `/panel/admin/kayitlar/{enrollmentId}`.

### S6-03 — Change ACTIVE → PAUSED
* On an ACTIVE enrollment, click **Duraklat** → confirm.
* **Expected:** badge becomes "Duraklatıldı"; row in DB has
  `status='PAUSED'`; audit row `ENROLLMENT_STATUS_UPDATE` with
  `payload.from='ACTIVE'`, `payload.to='PAUSED'`. **Zero**
  `PaymentScheduleItem` writes (verify by SELECT diff).

### S6-04 — Change PAUSED → ACTIVE
* On the same row, click **Devam ettir**.
* **Expected:** badge becomes "Aktif"; audit row records `PAUSED → ACTIVE`.
  Payment rows untouched.

### S6-05 — Cancel enrollment; payment rows remain unchanged
* On an enrollment with payment plan, click **İptal et** → confirm.
* **Expected:** status=CANCELLED; PaymentScheduleItem rows: same count,
  same status, same dueDate, same amount, same paidAmount.

### S6-06 — Complete enrollment; payment rows remain unchanged
* On an ACTIVE/PAUSED enrollment, click **Tamamla** → confirm.
* **Expected:** status=COMPLETED; PaymentScheduleItem rows untouched.

### S6-07 — Update start/end dates
* Edit "Tarihler" form: change startsAt and endsAt.
* **Expected:** values persist; submitting endsAt < startsAt rejects
  with "Bitiş tarihi başlangıçtan önce olamaz". Audit row
  `ENROLLMENT_DATES_UPDATE` with `payload.from`/`payload.to`.

### S6-08 — Update note
* Edit "Notlar" form: set billingPeriodLabel + notes.
* **Expected:** values persist; audit row `ENROLLMENT_NOTE_UPDATE`.

### S6-09 — Payment plan section shows pending rows
* For an enrollment with installments, the "Ödeme planı" table lists
  every row sorted by dueDate; status badge "Bekliyor" for unpaid
  future rows.

### S6-10 — Overdue rows show derived status
* For a PENDING row whose dueDate < today, the status badge becomes
  "Gecikmiş" (red). The DB column still reads `PENDING` (derived only).

### S6-11 — Payer section links to parent detail
* If all PaymentScheduleItem rows have the same `parentId`, the inferred
  payer subtitle shows their name; the parents table includes "Aç →"
  buttons opening `/panel/admin/veliler/{id}/duzenle`.

### S6-12 — ODK access tags display
* For an enrollment whose student has `userId` and active
  `OdkUserAccessTag` rows, the "ODK erişim etiketleri" card lists titles
  as purple badges + "ODK detayı →" link.
* Without userId: honest empty card.

### S6-13 — Audit rows appear after status update
* After S6-03/S6-04/S6-05/S6-06/S6-07/S6-08, scroll to "Son aktivite".
* **Expected:** the new actions appear at the top of the table with
  actor name/email and Turkish-formatted timestamps.

### S6-14 — Non-admin cannot open/modify enrollment detail
* Log in as a non-admin (parent or teacher) and visit the URL.
* **Expected:** `requirePanelRole("admin")` rejects → redirect /
  forbidden. POSTing any of the lifecycle actions returns auth error.

### S6-15 — No AccountingEntry is created by status change
* Capture `select count(*) from "AccountingEntry"` before S6-03/S6-05/S6-06.
* **Expected:** count is identical after each status change. The only
  ledger writes happen via the dedicated mark-paid action on
  `/panel/admin/odemeler/vadeler`, which Session 6 does not invoke.

---

## Sprint 8 — Bulk Actions / Import / Export

Pre-conditions: logged in as an admin user; at least 5 students, 3 parents
and 3 teachers in the database; at least one active `Classroom`; at least
one active `OdkAccessTag`.

### S8-01 — Selection primitive renders
* Open `/panel/admin/ogrenciler`.
* **Expected:** the leftmost column shows a "select-all" checkbox, every row
  shows a per-row checkbox. `BulkBar` is hidden until a row is selected.

### S8-02 — Select-all is page-scoped
* Click the header checkbox.
* **Expected:** all rows on the current page get checked; the bulk bar
  appears showing `<n> satır seçildi`. Going to page 2 shows zero selection
  for that page (selection state lives in the client and is preserved
  across pagination only when ids carry over).

### S8-03 — Generate invites idempotent
* Select 3 students that already have a User account.
* Click `✉️ Davet üret`.
* **Expected:** result panel shows `3/3 işlem tamamlandı` with the
  `Davet linklerini göster` `<details>` showing 3 URLs. Click again on the
  same selection: result is `3/3` again (rotation), and the `AuditLog`
  table has 3 new `USER_INVITE_GENERATE` rows + one
  `STUDENT_BULK_GENERATE_INVITES` summary row per click.

### S8-04 — Generate invites skips when no User
* Select a mixed set: one student with no User account, two with accounts.
* Click `✉️ Davet üret`.
* **Expected:** `2/3 tamamlandı (1 atlandı)`. The skipped row shows
  "Bu öğrencinin kullanıcı hesabı yok." in the warnings list.

### S8-05 — Force password change
* Select 3 active students.
* Click `🔑 Şifre değişimini zorla`.
* **Expected:** `3/3` succeeded; running the same action again immediately
  shows `0/3 tamamlandı (3 atlandı — Zaten zorunlu işaretli.)`.

### S8-06 — Disable then enable round-trip
* Select 2 students. Type "smoke" in the reason field. Click `⛔ Devre dışı bırak`.
* **Expected:** `2/2` succeeded; the `Hesap durumu` filter `state=DISABLED`
  shows both rows. Re-select them and click `✅ Aktifleştir`.
* **Expected:** `2/2` succeeded; both are removed from the `DISABLED` filter.
* Verify `AuditLog` rows for both `USER_ACCOUNT_DISABLE` (with
  `payload.reason = "smoke"`) and `USER_ACCOUNT_ENABLE` exist.

### S8-07 — Bulk classroom assignment is idempotent
* Select 4 students. Pick a classroom from the dropdown. Click `🏫 Sınıfa ekle`.
* **Expected:** `4/4` succeeded. Re-run the same action on the same
  selection.
* **Expected:** `0/4 tamamlandı (4 atlandı — "Bu sınıfta zaten kayıtlı")`.
  The `ClassroomStudent` join row count is unchanged (no duplicates).

### S8-08 — ODK access tag grant is idempotent
* Select 3 students with User accounts. Pick an active ODK tag. Set an
  `expiresAt` 7 days in the future. Click `🏷️ Etiket ver`.
* **Expected:** `3/3` succeeded; per-target `USER_ACCESS_TAG_GRANT` rows in
  `AuditLog`. Re-run: `0/3 (3 atlandı — Etiket zaten verilmiş)`.

### S8-09 — Selected-row export
* On `/panel/admin/ogrenciler`, search for a substring that returns 6 rows.
  Select 3 of them. Click `⬇ Seçilenleri indir`.
* **Expected:** browser downloads `ogrenciler-<date>.xlsx` containing
  exactly 3 rows (Ad Soyad column matches selection).

### S8-10 — Filter-aware export still works
* Filter `status=AT_RISK`. Click the toolbar `⬇ Excel` button (no rows selected).
* **Expected:** XLSX contains only `AT_RISK` rows; the `?q=` filter is
  honoured. (`ids=` is omitted by this path.)

### S8-11 — Parent list bulk actions
* Open `/panel/admin/veliler`. Select 2 parents that have a User account.
* Click `✉️ Davet üret`. **Expected:** `2/2`.
* Click `🔑 Şifre değişimini zorla`. **Expected:** `2/2`.
* Click `⛔ Devre dışı bırak`. **Expected:** `2/2`.
* Click `✅ Aktifleştir`. **Expected:** `2/2`.

### S8-12 — Teacher list bulk actions
* Open `/panel/admin/ogretmenler`. Select 2 teachers with User accounts.
* Run the four operations in turn. **Expected:** each `2/2`. The bar shows
  the disclaimer about classroom/comp-rule mutations being deferred.

### S8-13 — Import template download
* Click `📥 Şablon` on each of the three list pages.
* **Expected:** browser downloads
  `ogrenci-import-sablonu.csv`, `veli-import-sablonu.csv`,
  `ogretmen-import-sablonu.csv`. Each file opens in Excel as Turkish
  text without character corruption (BOM is in place). The first row is
  the header; the second row is a `# hint` line; no real data is leaked.

### S8-14 — Non-admin role cannot run bulk actions
* Re-login as a teacher account. Visit `/panel/admin/ogrenciler`.
* **Expected:** the page itself redirects/403s before reaching the bulk
  bar (admin-only via `requirePanelRole("admin")`). Manually `POST`ing to
  the bulk action endpoint also rejects.

### S8-15 — Bulk grant access tag respects User-less students
* Pick 4 students of which 2 have no User account. Grant a tag.
* **Expected:** `2/4 tamamlandı (2 atlandı — "Kullanıcı hesabı olmayan
  öğrenciye etiket verilmedi.")`. No orphan `OdkUserAccessTag` rows.

---

## Session 9 — Course / Subject / Curriculum

### Course list (`/panel/admin/dersler`)
1. Open list; verify default sort puts active courses first, then by subject/title.
2. Apply preset **Sınıfsız dersler** → only courses with no `defaultClassroom` are shown; "Default sınıf" column displays a yellow `Yok` badge.
3. Apply preset **Ödevsiz dersler** → only courses whose `subject` has zero PUBLISHED assignments are shown.
4. Apply preset **Materyalsiz dersler** → only courses with zero non-archived materials are shown.
5. Combine `q=mat` + `status=PUBLISHED` + `active=true` → result narrows correctly; URL keys round-trip.
6. Save current filter as a personal view → preset chip appears with the right filter and clicking restores it.
7. Click **Program** action on any row → navigates to `/panel/admin/ders-programi/yeni?courseId=…` with prefilled teacher/classroom when defaults exist.

### Course create (`/panel/admin/dersler/yeni`)
8. Submit form with title="Matematik" + subject="Matematik" → if a course with same `(title, subject)` exists, the action throws an Error with the duplicate id.
9. Tick **"Yine de oluştur"** and resubmit → record is created; `AuditLog` shows a fresh `COURSE_CREATE` row referencing the new course.
10. Submit with `defaultClassroomId` set to a non-existent id (e.g. by editing the form) → server throws "Seçilen default sınıf bulunamadı" (no DB write).

### Course detail cockpit (`/panel/admin/dersler/[id]`)
11. Open a course bound to a default classroom + default teacher with upcoming lessons and at least one PUBLISHED assignment with same `subject` → KPI cards show non-zero values; "Yakın 14 gün — planlanan dersler" lists the upcoming rows; "Son ödevler" lists assignments with that subject.
12. Open a course with no `defaultClassroomId` and no `defaultTeacherId` → "Operasyonel uyarı" callout renders both bullet points.
13. Click **"+ Ödev oluştur"** action → navigates to `/panel/admin/odevler/yeni?subject=<course.subject>`.
14. Click **"+ Ders planla"** action → navigates to `/panel/admin/ders-programi/yeni?courseId=…` with `teacherId`/`classroomId` query when defaults exist.

### Course edit + lifecycle (`/panel/admin/dersler/[id]/duzenle`)
15. Edit title to one that collides with another course's `(title, subject)` → server throws duplicate warning. Tick **"Yine de kaydet"** → save succeeds; `AuditLog` shows `COURSE_UPDATE` with `payload.diff.title` from→to.
16. Active course → **Arşivle (pasifleştir)** button visible. Click → course becomes `ARCHIVED + isActive=false`; `AuditLog` shows `COURSE_ARCHIVE`. Page now shows **Yeniden yayınla** button instead.
17. Click **Yeniden yayınla** → course becomes `PUBLISHED + isActive=true`; `AuditLog` shows `COURSE_REACTIVATE`.
18. Delete a course that has zero lessons / packages / modules / progress / materials → row is hard-deleted; `AuditLog` `COURSE_DELETE` with `payload.hard=true`. Delete a course bound to anything → soft-archive path; `AuditLog` `COURSE_SOFT_DELETE` with `payload.reason="in-use"` and the counts.

---

## Session 10 — Safe Import Wizard (`/panel/admin/import`)

### Access & navigation
1. Login as **non-admin** (öğretmen / veli / öğrenci) → navigating to `/panel/admin/import` redirects to that user's panel root. Admin sidebar shows the new **"İçe Aktar"** entry under Sistem.

### Templates
2. From the wizard pick **Öğrenciler** → click **"Şablonu indir"** → CSV downloads with header row `Ad Soyad,Telefon,Email,…` and a `# Zorunlu: …` hint line. Repeat for **Veliler** and **Öğretmenler**; each downloads its own template.

### Dry-run — happy path
3. Upload a clean students CSV (3 rows, fresh phones + emails). Click **"Önizle"** → all 3 rows show **Hazır**, summary `Toplam=3, Hazır=3`. **No DB writes** — verify Student count unchanged.

### Dry-run — schema errors
4. Upload a students CSV missing the **"Ad Soyad"** column entirely → wizard shows fatal error `Zorunlu sütun eksik: "Ad Soyad"`. No row table rendered.
5. Upload a students CSV with rows missing `Ad Soyad`, missing `Telefon`, invalid email format, garbage phone → each row shown as **Hata** with field-level message. Commit button disabled (or commits 0 rows when summary.ready=0).

### Dry-run — duplicates
6. Upload a students CSV where row 2 has the same phone as an existing Student → that row is **Atlandı (mükerrer)**. Row 3 has same phone as row 2 → row 3 is **Hata** "Bu telefon aynı dosyada satır 2'de zaten var".
7. Upload a teachers CSV where one row's email matches an existing User (different role, e.g. an admin) **with `Hesap Modu=invite`** → row is **Hata** "Aynı emaille User zaten var".

### Dry-run — warnings
8. Upload a students CSV where one row has `Sınıf` set to a name that doesn't match any active Classroom → row is **Uyarı** "Sınıf bulunamadı: … (atama yapılmayacak)". With **"Uyarılı satırları da içe aktar"** toggled OFF, commit count excludes that row; toggled ON, includes it but the unmatched classroom is silently not linked.

### Account modes
9. Students CSV with `Hesap Modu=invite` and a fresh email → after commit, a User row exists with role STUDENT, `userInviteToken` set, `userInviteSentAt` set; result page shows the `/davet/<token>` URL once. Refresh → token is **not** re-shown.
10. CSV with `Hesap Modu=tempPassword` → row marked **Hata** "Geçici şifre desteklenmiyor; bireysel öğrenci/öğretmen sayfasından kullanın". Never committed.
11. CSV with `Hesap Modu=disabled` and a fresh email → after commit, a User row exists with `accountDisabledAt` set and no invite token; login attempts with that email are blocked.
12. CSV with `Hesap Modu=invite` but **empty Email** → row marked **Hata** "Hesap oluşturmak için Email zorunlu".

### Commit safety
13. Run a successful commit of N students. Re-upload the **exact same CSV** → wizard now shows N rows as **Atlandı (mükerrer)**, summary.created=0 on commit. No double-creation.
14. While the dry-run preview is on screen, in another tab create a Student with the same phone as one of the preview rows. Click commit → that row fails with row-level error "Aynı telefonla öğrenci zaten var". Other rows still commit.

### Audit + observability
15. After dry-run, `AuditLog` shows `IMPORT_DRY_RUN` with `entityType=ImportBatch`, `entityId=students|parents|teachers`, summary string, and JSON payload with counts. After commit, `IMPORT_COMMIT` is logged with the per-row created/failed lists. Failed/sorunlu rows are downloadable as a CSV via **"Sorunlu satırları indir"** with a UTF-8 BOM and original column values plus a "Hatalar/Uyarılar" column.
