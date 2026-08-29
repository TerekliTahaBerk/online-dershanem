/**
 * Metro varlık modülleri için tip bildirimi. `expo/types` yalnız CSS için
 * bildirim taşıyor (`node_modules/expo/types/global.d.ts`) — resimler için
 * yok, bu yüzden proje `require(...)` kullanıyordu. ESLint `no-require-imports`
 * kuralı bunu yasakladığı için statik `import` tercih edildi; bu dosya onu
 * tip-güvenli yapar.
 */
declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.jpg' {
  const value: number;
  export default value;
}

declare module '*.jpeg' {
  const value: number;
  export default value;
}
