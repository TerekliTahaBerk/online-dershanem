-- KPSS Görev 5: ticarileştirme — KPSS ticari ve yetki enum'larına eklenir.
--
-- `lib/commerce/product-mapping.ts` içindeki `Record<CommerceProduct, …>` /
-- `Record<ProductCode, …>` tanımları derleme zamanında her akış için açık karar
-- ister. Değer eklemek veri değiştirmez; mevcut OD/OK/ODK satırları aynı kalır.
--
-- `ADD VALUE` ile eklenen değer aynı transaction'da kullanılamaz; mevcut KPSS
-- üyeliklerinin `product` backfill'i bu yüzden ayrı migration'dadır (0108).

-- AlterEnum
ALTER TYPE "ProductCode" ADD VALUE 'KPSS';

-- AlterEnum
ALTER TYPE "CommerceProduct" ADD VALUE 'KPSS';
