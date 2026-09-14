# Veri sınıflandırma envanteri (heuristik)

> **Bu belge otomatik üretilmiştir ve KESİN BİR SINIFLANDIRMA DEĞİLDİR.**
> Alan adlarından tahmin eden bir heuristikle (`lib/data-governance/pii-heuristics.mjs`) oluşturulur;
> yanlış pozitif ve yanlış negatif içerir. Hukuk ekibi / veri sorumlusu tarafından gözden geçirilmesi
> gereken bir başlangıç noktasıdır. Elle düzenlemeyin: `npm run data:pii-inventory` ile yeniden üretin.

Sütunlar:

- **çocuk verisi**: `evet` = `StudentProfile`'a bağlı; `olası (tüm roller)` = `User`'a bağlı (öğrenci/veli olabilir); `hayır` = kişiye doğrudan bağ bulunamadı.
- **koruma**: `log/audit redaction anahtarı` yalnız log ve audit payload'larında maskelenir; veritabanında düz metindir.

## Özet

- Taranan model: 149
- Taranan scalar/enum alan: 1665
- Olası kişisel veri alanı: 276
- Çocuk verisi `evet`: 53; `olası`: 77

| Kategori | Alan sayısı |
|---|---:|
| akademik | 28 |
| finansal | 39 |
| iletişim | 12 |
| kimlik | 55 |
| kimlik doğrulama sırrı | 10 |
| serbest metin | 82 |
| yapılandırılmamış (Json) | 50 |

## Alanlar

| model | alan | tahmini kategori | güven | çocuk verisi | mevcut redaction/şifreleme |
|---|---|---|---|---|---|
| AdminMfa | totpSecretEncrypted | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | şifreli |
| AdminMfa | totpLastCounter | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | yok (DB'de düz) |
| AdminMfa | pendingTotpSecretEncrypted | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | şifreli |
| AIExecution | decision | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| AIPromptVersion | name | kimlik | düşük | hayır | yok (DB'de düz) |
| Assignment | description | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| Assignment | outcomeSkipReason | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| AssignmentSubmission | feedback | serbest metin | orta | evet | yok (DB'de düz) |
| Attendance | note | serbest metin | orta | evet | yok (DB'de düz) |
| AuditLog | summary | serbest metin | orta | hayır | yok (DB'de düz) |
| AuditLog | payload | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| AutomationExecution | details | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| AutomationRule | name | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| AutomationRule | conditions | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| AutomationRule | actions | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| BackgroundJob | payload | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| BusinessAdSet | name | kimlik | düşük | hayır | yok (DB'de düz) |
| BusinessAdSet | audienceDescription | serbest metin | orta | hayır | yok (DB'de düz) |
| BusinessAdSet | budgetCents | finansal | orta | hayır | yok (DB'de düz) |
| BusinessAdvertisement | name | kimlik | düşük | hayır | yok (DB'de düz) |
| BusinessAdvertisement | creativeName | kimlik | düşük | hayır | yok (DB'de düz) |
| BusinessAdvertisement | openingMessage | serbest metin | orta | hayır | yok (DB'de düz) |
| BusinessAdvertisement | spentCents | finansal | orta | hayır | yok (DB'de düz) |
| BusinessAdvertisement | messageStarts | serbest metin | orta | hayır | yok (DB'de düz) |
| BusinessAdvertisement | revenueCents | finansal | orta | hayır | yok (DB'de düz) |
| BusinessCampaign | name | kimlik | düşük | hayır | yok (DB'de düz) |
| BusinessCampaign | budgetCents | finansal | orta | hayır | yok (DB'de düz) |
| BusinessCampaign | spentCents | finansal | orta | hayır | yok (DB'de düz) |
| BusinessCampaign | utm | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| BusinessCampaign | description | serbest metin | orta | hayır | yok (DB'de düz) |
| BusinessConversation | username | kimlik | yüksek | hayır | yok (DB'de düz) |
| BusinessConversation | displayName | kimlik | yüksek | hayır | yok (DB'de düz) |
| BusinessConversation | profilePictureUrl | kimlik | yüksek | hayır | yok (DB'de düz) |
| BusinessConversation | summary | serbest metin | orta | hayır | yok (DB'de düz) |
| BusinessLead | firstName | kimlik | yüksek | hayır | yok (DB'de düz) |
| BusinessLead | lastName | kimlik | yüksek | hayır | yok (DB'de düz) |
| BusinessLead | phone | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| BusinessLead | normalizedPhone | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| BusinessLead | email | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| BusinessLead | normalizedEmail | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| BusinessLead | studentName | kimlik | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| BusinessLead | parentName | kimlik | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| BusinessLead | grade | akademik | orta | hayır | yok (DB'de düz) |
| BusinessLead | examType | akademik | orta | hayır | yok (DB'de düz) |
| BusinessLead | city | kimlik | orta | hayır | yok (DB'de düz) |
| BusinessLead | estimatedValueCents | finansal | orta | hayır | yok (DB'de düz) |
| BusinessLead | consentMetadata | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| BusinessLead | lostReason | serbest metin | orta | hayır | yok (DB'de düz) |
| BusinessLead | matchSuggestion | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| BusinessMessage | body | serbest metin | orta | hayır | yok (DB'de düz) |
| BusinessMessage | mediaMetadata | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| BusinessMessage | providerMetadata | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| BusinessUnit | name | kimlik | düşük | hayır | yok (DB'de düz) |
| BusinessUnit | settings | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| CoachingSession | sharedNote | serbest metin | orta | evet | yok (DB'de düz) |
| CoachingSession | privateNote | serbest metin | orta | evet | yok (DB'de düz) |
| CoachNote | body | serbest metin | orta | evet | yok (DB'de düz) |
| CommerceOrderLine | productName | kimlik | düşük | hayır | yok (DB'de düz) |
| CommerceOrderLine | productSnapshot | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| CommerceOrderLine | unitPriceCents | finansal | orta | hayır | yok (DB'de düz) |
| CommerceOrderLine | subtotalCents | finansal | orta | hayır | yok (DB'de düz) |
| CommerceOrderLine | discountCents | finansal | orta | hayır | yok (DB'de düz) |
| CommerceOrderLine | taxCents | finansal | orta | hayır | yok (DB'de düz) |
| CommerceOrderLine | totalCents | finansal | orta | hayır | yok (DB'de düz) |
| CommerceOrderLine | fulfillmentOwnerSnapshot | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| CommerceOrderLine | refundedQuantity | finansal | orta | hayır | yok (DB'de düz) |
| CommerceOrderLine | refundedCents | finansal | orta | hayır | yok (DB'de düz) |
| Coupon | description | serbest metin | orta | hayır | yok (DB'de düz) |
| Coupon | minOrderCents | finansal | orta | hayır | yok (DB'de düz) |
| Coupon | maxDiscountCents | finansal | orta | hayır | yok (DB'de düz) |
| CouponRedemption | discountCents | finansal | orta | hayır | yok (DB'de düz) |
| CrossProductEventOutbox | payload | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| CrossProductRecommendation | payload | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| CurriculumSkill | name | kimlik | düşük | hayır | yok (DB'de düz) |
| CurriculumSubject | name | kimlik | düşük | hayır | yok (DB'de düz) |
| CurriculumUnit | name | kimlik | düşük | hayır | yok (DB'de düz) |
| DataSubjectTombstone | blockers | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| DinoAnswer | questionKey | serbest metin | orta | evet | yok (DB'de düz) |
| DinoAnswer | modelName | kimlik | düşük | evet | yok (DB'de düz) |
| DinoAnswer | sourceRefs | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| DinoAnswer | answer | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| DinoAnswer | fallbackReason | serbest metin | orta | evet | yok (DB'de düz) |
| ExamFamily | name | kimlik | düşük | hayır | yok (DB'de düz) |
| ExpenseCategory | name | kimlik | düşük | hayır | yok (DB'de düz) |
| FinancialTransaction | description | serbest metin | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | grossCents | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | discountCents | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | netCents | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | vatCents | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | withholdingCents | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | otherTaxCents | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | commissionCents | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | invoiceNumber | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | attachmentMetadata | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| FinancialTransaction | notes | serbest metin | orta | hayır | yok (DB'de düz) |
| FinancialTransactionLine | description | serbest metin | orta | hayır | yok (DB'de düz) |
| FinancialTransactionLine | debitCents | finansal | orta | hayır | yok (DB'de düz) |
| FinancialTransactionLine | creditCents | finansal | orta | hayır | yok (DB'de düz) |
| Group | name | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| Group | capacity | kimlik | orta | olası (tüm roller) | yok (DB'de düz) |
| InstagramAccount | username | kimlik | yüksek | hayır | yok (DB'de düz) |
| InstagramWebhookEvent | payload | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| IntegrationConnection | displayName | kimlik | yüksek | hayır | yok (DB'de düz) |
| IntegrationConnection | config | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| IntegrationConnection | encryptedCredentials | kimlik doğrulama sırrı | yüksek | hayır | şifreli |
| InterventionCase | explanation | serbest metin | orta | evet | yok (DB'de düz) |
| InterventionCaseActivity | note | serbest metin | orta | evet | yok (DB'de düz) |
| KnowledgeBaseEntry | content | serbest metin | orta | hayır | yok (DB'de düz) |
| LeadActivity | metadata | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| LeadSubmission | fullName | kimlik | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| LeadSubmission | phone | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| LeadSubmission | classLevel | akademik | orta | hayır | yok (DB'de düz) |
| LeadSubmission | examType | akademik | orta | hayır | yok (DB'de düz) |
| LeadSubmission | targetGoal | serbest metin | orta | hayır | yok (DB'de düz) |
| LeadSubmission | currentNet | akademik | orta | hayır | yok (DB'de düz) |
| LeadSubmission | parentPhone | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| LeadSubmission | adminNotes | serbest metin | orta | hayır | yok (DB'de düz) |
| LeadTask | note | serbest metin | orta | hayır | yok (DB'de düz) |
| LearningMaterial | description | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| LearningMaterial | blobPathname | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| LearningMaterial | fileName | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| LearningMaterial | transcript | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| LearningOutcome | description | serbest metin | orta | hayır | yok (DB'de düz) |
| Lesson | outcomeSkipReason | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| LessonNote | note | serbest metin | orta | evet | yok (DB'de düz) |
| LessonNote | nextGoal | serbest metin | orta | evet | yok (DB'de düz) |
| MessageDelivery | providerResponse | serbest metin | orta | hayır | yok (DB'de düz) |
| MfaResetRequest | reason | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| MockExamSection | subjectName | kimlik | düşük | evet | yok (DB'de düz) |
| MockExamSection | questionCount | serbest metin | orta | evet | yok (DB'de düz) |
| MockExamSection | correctCount | akademik | orta | evet | yok (DB'de düz) |
| MockExamSection | incorrectCount | akademik | orta | evet | yok (DB'de düz) |
| MockExamSection | blankCount | akademik | orta | evet | yok (DB'de düz) |
| Notification | body | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkAnswerKeyRevision | reason | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkAnswerKeyRevision | previousAnswers | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkAnswerKeyRevision | nextAnswers | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkAttemptEvent | metadata | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| OdkAttemptOutcomeScore | questionCount | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkAttemptOutcomeScore | correctCount | akademik | orta | hayır | yok (DB'de düz) |
| OdkAttemptOutcomeScore | wrongCount | akademik | orta | hayır | yok (DB'de düz) |
| OdkAttemptOutcomeScore | blankCount | akademik | orta | hayır | yok (DB'de düz) |
| OdkAttemptQuestionResult | correctOption | akademik | orta | hayır | yok (DB'de düz) |
| OdkAttemptScore | correctCount | akademik | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkAttemptScore | wrongCount | akademik | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkAttemptScore | blankCount | akademik | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkAttemptScore | totalNet | akademik | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkAttemptScore | sectionBreakdown | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkEntitlement | contractSnapshot | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkExam | description | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkExam | settings | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkExamAssignment | snapshot | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkExamAttempt | clientMeta | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkExamAttempt | sessionTokenHash | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | tek yönlü hash |
| OdkExamAttempt | integrityReasons | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkExamFile | blobPathname | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| OdkExamFile | fileName | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| OdkExamQuestion | questionNumber | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkExamQuestion | bookletQuestionNumber | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkExamQuestion | canonicalQuestionNumber | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkExamQuestion | contentText | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkExamQuestion | correctOption | akademik | orta | hayır | yok (DB'de düz) |
| OdkExamSection | questionCount | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkExamSection | questionStart | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkExamSection | questionEnd | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkExamSeries | classLevel | akademik | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkExamVersion | extraTimePolicy | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkExamVersion | settings | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkImportAudit | rawPayload | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkImportAudit | previewSummary | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkOrder | subtotalCents | finansal | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkOrder | discountCents | finansal | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkOrder | totalCents | finansal | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkOrder | buyerInfo | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkOrder | contractSnapshot | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdkPackage | description | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkPackage | priceCents | finansal | orta | hayır | yok (DB'de düz) |
| OdkPackage | originalPriceCents | finansal | orta | hayır | yok (DB'de düz) |
| OdkPackage | ctaText | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkPackage | contractPolicy | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| OdkPayment | amountCents | finansal | orta | hayır | yok (DB'de düz) |
| OdkPayment | failureReason | serbest metin | orta | hayır | yok (DB'de düz) |
| OdkPilotRun | name | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| OdkScoringPolicy | wrongPenalty | akademik | orta | hayır | yok (DB'de düz) |
| OdOnboarding | blockerReason | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| OdOnboardingTransition | note | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| OdOnboardingTransition | metadata | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdOrder | packageName | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| OdOrder | subtotalCents | finansal | orta | olası (tüm roller) | yok (DB'de düz) |
| OdOrder | discountCents | finansal | orta | olası (tüm roller) | yok (DB'de düz) |
| OdOrder | totalCents | finansal | orta | olası (tüm roller) | yok (DB'de düz) |
| OdOrder | buyerInfo | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| OdPayment | amountCents | finansal | orta | hayır | yok (DB'de düz) |
| OdPayment | failureReason | serbest metin | orta | hayır | yok (DB'de düz) |
| Package | name | kimlik | düşük | hayır | yok (DB'de düz) |
| Package | description | serbest metin | orta | hayır | yok (DB'de düz) |
| Package | price | finansal | orta | hayır | yok (DB'de düz) |
| ParentStudent | relationship | kimlik | orta | evet | yok (DB'de düz) |
| ParentStudentHistory | relationship | kimlik | orta | evet | yok (DB'de düz) |
| PasskeyCredential | publicKey | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | yok (DB'de düz) |
| PasskeyCredential | name | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| PasswordResetToken | tokenHash | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | tek yönlü hash |
| Product | name | kimlik | düşük | hayır | yok (DB'de düz) |
| ProductEvent | name | kimlik | düşük | hayır | yok (DB'de düz) |
| ProductEvent | properties | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| PurchaseEvent | packageName | kimlik | düşük | hayır | yok (DB'de düz) |
| PurchaseEvent | payload | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| PurchaseIntent | packageName | kimlik | düşük | hayır | yok (DB'de düz) |
| PurchaseIntent | studentFullName | kimlik | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| PurchaseIntent | studentPhone | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| PurchaseIntent | studentEmail | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| PurchaseIntent | schoolName | kimlik | orta | hayır | yok (DB'de düz) |
| PurchaseIntent | city | kimlik | orta | hayır | yok (DB'de düz) |
| PurchaseIntent | classLevel | akademik | orta | hayır | yok (DB'de düz) |
| PurchaseIntent | examType | akademik | orta | hayır | yok (DB'de düz) |
| PurchaseIntent | currentNet | akademik | orta | hayır | yok (DB'de düz) |
| PurchaseIntent | parentFullName | kimlik | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| PurchaseIntent | parentPhone | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| PurchaseIntent | parentEmail | iletişim | yüksek | hayır | log/audit redaction anahtarı; DB'de düz |
| PurchaseIntent | notes | serbest metin | orta | hayır | yok (DB'de düz) |
| PurchaseIntent | adminNotes | serbest metin | orta | hayır | yok (DB'de düz) |
| ReconciliationRecord | expectedCents | finansal | orta | hayır | yok (DB'de düz) |
| ReconciliationRecord | actualCents | finansal | orta | hayır | yok (DB'de düz) |
| ReconciliationRecord | details | yapılandırılmamış (Json) | orta | hayır | yok (DB'de düz) |
| RecoveryPackage | summaryTopic | serbest metin | orta | evet | yok (DB'de düz) |
| RecoveryPackage | summaryNextStep | serbest metin | orta | evet | yok (DB'de düz) |
| ReviewItem | solutionNote | serbest metin | orta | evet | yok (DB'de düz) |
| Session | tokenHash | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | tek yönlü hash |
| Session | userAgent | kimlik | orta | olası (tüm roller) | yok (DB'de düz) |
| Session | ip | kimlik | orta | olası (tüm roller) | yok (DB'de düz) |
| StudentGoal | subjectName | kimlik | düşük | evet | yok (DB'de düz) |
| StudentGoal | nearTermNote | serbest metin | orta | evet | yok (DB'de düz) |
| StudentOutcomeMastery | explanation | serbest metin | orta | evet | yok (DB'de düz) |
| StudentPlanPreference | availableDays | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| StudentProfile | classLevel | akademik | orta | evet | yok (DB'de düz) |
| StudentProfile | schoolName | kimlik | orta | evet | yok (DB'de düz) |
| StudentProfile | targetGoal | serbest metin | orta | evet | yok (DB'de düz) |
| StudentProfile | examType | akademik | orta | evet | yok (DB'de düz) |
| StudentProfile | targetRank | akademik | orta | evet | yok (DB'de düz) |
| StudentProfile | weeklyGoal | serbest metin | orta | evet | yok (DB'de düz) |
| StudentProgressEvidence | summary | serbest metin | orta | evet | yok (DB'de düz) |
| StudentProgressEvidence | metrics | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| StudentTeacherAssignment | notes | serbest metin | orta | evet | yok (DB'de düz) |
| StudentTimelineEvent | summary | serbest metin | orta | evet | yok (DB'de düz) |
| StudentTimelineEvent | metadata | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| TaxProfile | name | kimlik | düşük | hayır | yok (DB'de düz) |
| TeacherAiDraft | modelName | kimlik | düşük | olası (tüm roller) | yok (DB'de düz) |
| TeacherAiDraft | sourceRefs | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherAiDraft | originalContent | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherAiDraft | reviewedContent | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherAiDraft | fallbackReason | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherHomeSnapshot | snapshot | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherNoteTemplate | note | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherNoteTemplate | nextGoal | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherProfile | internalNotes | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherProfile | coachCapacity | kimlik | orta | olası (tüm roller) | yok (DB'de düz) |
| TeacherProfile | maxStudentCapacity | kimlik | orta | olası (tüm roller) | yok (DB'de düz) |
| User | email | iletişim | yüksek | olası (tüm roller) | log/audit redaction anahtarı; DB'de düz |
| User | passwordHash | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | tek yönlü hash |
| User | inviteTokenHash | kimlik doğrulama sırrı | yüksek | olası (tüm roller) | tek yönlü hash |
| User | fullName | kimlik | yüksek | olası (tüm roller) | log/audit redaction anahtarı; DB'de düz |
| User | phone | iletişim | yüksek | olası (tüm roller) | log/audit redaction anahtarı; DB'de düz |
| WeeklyCoachSummary | studentVisibleText | serbest metin | orta | evet | yok (DB'de düz) |
| WeeklyCoachSummary | parentVisibleText | serbest metin | orta | evet | yok (DB'de düz) |
| WeeklyDigest | homeQuestion | serbest metin | orta | evet | yok (DB'de düz) |
| WeeklyPlanRevision | snapshot | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| WeeklyPlanRevision | changeSummary | serbest metin | orta | evet | yok (DB'de düz) |
| WeeklyPlanSuggestion | payload | yapılandırılmamış (Json) | orta | evet | yok (DB'de düz) |
| WeeklyPlanTask | description | serbest metin | orta | evet | yok (DB'de düz) |
| WeeklyPlanTask | actualQuestions | serbest metin | orta | evet | yok (DB'de düz) |
| WeeklyPlanTask | actualCorrect | akademik | orta | evet | yok (DB'de düz) |
| WeeklyPlanTask | actualIncorrect | akademik | orta | evet | yok (DB'de düz) |
| WeeklyPlanTask | actualBlank | akademik | orta | evet | yok (DB'de düz) |
| WeeklyPlanTask | studentNote | serbest metin | orta | evet | yok (DB'de düz) |
| WeeklyPlanTemplate | description | serbest metin | orta | olası (tüm roller) | yok (DB'de düz) |
| WeeklyPlanTemplate | taskDefs | yapılandırılmamış (Json) | orta | olası (tüm roller) | yok (DB'de düz) |
