/**
 * Yamalı bağımlılık kopyalarının (mobile/vendor/npm) gerçekten kullanıldığını
 * ve açıkları kapattığını doğrular. Ayrıntı: docs/known-dependency-risks.md
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const braces = require('braces');
const decode = require('decode-uri-component');
const forge = require('node-forge');
const { sprintf } = require('sprintf-js');

describe('yamalı bağımlılıklar', () => {
  it('braces derin iç içe deseni yığını tüketmeden reddeder (GHSA-vfj7-8cjw-p6xm)', () => {
    const deep = '{'.repeat(4900) + '}'.repeat(4900);
    expect(() => braces.expand(deep)).toThrow(/max depth/);
    expect(braces.expand('a/{b,c}/d')).toEqual(['a/b/d', 'a/c/d']);
    expect(braces('src/**/*.{ts,tsx}')).toEqual(['src/**/*.(ts|tsx)']);
  });

  it('decode-uri-component bozuk girdide doğrusal sürede çalışır (GHSA-vcc3-ghjq-m6fr)', () => {
    const started = Date.now();
    decode('%C3'.repeat(1500) + '%');
    expect(Date.now() - started).toBeLessThan(1000);
    expect(decode('a%20b%C3%A5')).toBe('a bå');
    expect(decode('%')).toBe('%');
  });

  it('node-forge DigestAlgorithm içine eklenen çöp baytlı imzayı reddeder (GHSA-86w9-cpqp-85rv)', () => {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 3 });
    const md = forge.md.sha256.create(); md.update('mesaj');
    const digest = md.digest().getBytes();
    const { asn1 } = forge;
    const node = (type: number, value: string) => asn1.create(asn1.Class.UNIVERSAL, type, false, value);
    const digestInfo = (extra: boolean) => asn1.toDer(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [node(asn1.Type.OID, asn1.oidToDer(forge.oids.sha256).getBytes()), node(asn1.Type.NULL, ''), ...(extra ? [node(asn1.Type.OCTETSTRING, 'GARBAGE')] : [])]),
      node(asn1.Type.OCTETSTRING, digest),
    ])).getBytes();
    const sign = (bytes: string) => forge.pki.rsa.encrypt(bytes, keys.privateKey, 0x01);
    expect(keys.publicKey.verify(digest, sign(digestInfo(false)))).toBe(true);
    expect(() => keys.publicKey.verify(digest, sign(digestInfo(true)))).toThrow(/DigestInfo/);
  });

  it('sprintf-js aşırı hassasiyette RangeError fırlatmaz (GHSA-hp3w-g68c-fv3c)', () => {
    expect(() => sprintf('%.500f', 1.5)).not.toThrow();
    expect(sprintf('%.2f', 3.14159)).toBe('3.14');
  });
});
