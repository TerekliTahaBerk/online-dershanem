# Product Entitlements

## Ürün kodları

```text
OD  — Online Dershanem
OK  — Online Koçum
ODK — Online Deneme Kulübü
```

## Erişim modelleri

| Ürün | Model |
| --- | --- |
| OD, OK | `ProductMembership` |
| ODK | `OdkEntitlement` (contract window) |

## Kombinasyonlar

Öğrenci yalnız OD, yalnız OK, yalnız ODK veya herhangi bir kombinasyon kullanabilir.

Automation entitlement'a göre davranır:

```ts
shouldCreateCoachingProjection(products)  // OK gerekli
shouldCreateCoachingRecommendation(products)  // OK gerekli
```

ODK sonucu + OK yok → coaching task oluşturulmaz; analysis gösterilir.

## Product removal

Koçum entitlement kaldırıldığında:

- Geçmiş plan verisi silinmez
- Yeni plan oluşturulması engellenir
- Read-only history policy

## Admin operasyon

Birleşik operasyon merkezi çapraz sorunları gösterir:

- Koçum planı yok
- Öğretmen ataması eksik
- ODK sonuç inceleme bekliyor
- Ödeme tamamlandı, erişim eksik

## Empty states

Student 360: "Online Koçum aktif değil" — aggressive upsell yok.
