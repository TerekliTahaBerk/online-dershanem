import assert from "node:assert/strict";
import { test } from "node:test";
import { netChange, previousComparable, reportSummarySentences } from "./parent-report";

const d = (day: number) => new Date(Date.UTC(2026, 9, day));
const exam = (id: string, family: string, day: number, totalNet: number) => ({ id, title: id, family, takenAt: d(day), totalNet });

test("karşılaştırma aynı türdeki bir önceki denemeyle yapılır", () => {
  const pair = previousComparable([exam("tyt1", "TYT", 1, 40), exam("ayt1", "AYT", 5, 20), exam("tyt2", "TYT", 9, 44.5)]);
  assert.equal(pair?.latest.id, "tyt2");
  assert.equal(pair?.previous?.id, "tyt1");
  assert.equal(netChange(pair!.latest, pair!.previous), 4.5);
  assert.equal(previousComparable([exam("a", "LGS", 1, 10)])?.previous, null);
  assert.equal(previousComparable([exam("a", "LGS", 1, 10), exam("b", "TYT", 2, 30)])?.previous?.id, "a", "aynı tür yoksa herhangi bir önceki");
  assert.equal(previousComparable([]), null);
  assert.equal(netChange(exam("a", "LGS", 1, 10), null), null);
});

test("özet cümleleri düz dil ve yargısız", () => {
  assert.deepEqual(reportSummarySentences([], []), []);
  const first = reportSummarySentences([exam("TYT-1", "TYT", 1, 40)], []);
  assert.equal(first[1], "Karşılaştırma için bir sonraki deneme beklenecek.");
  const up = reportSummarySentences([exam("TYT-1", "TYT", 1, 40), exam("TYT-2", "TYT", 9, 44.5)], [
    { latestAccuracy: 30, delta: null, questionCount: 4 },
    { latestAccuracy: 80, delta: 20, questionCount: 4 },
  ]);
  assert.equal(up[0], "Son denemede (TYT-2) 44,5 net yaptı.");
  assert.equal(up[1], "Bu, aynı türdeki bir önceki denemesine göre 4,5 net daha yüksek.");
  assert.equal(up[2], "1 kazanımda daha fazla çalışma faydalı olabilir; 1 kazanımda belirgin ilerleme var.");
  const down = reportSummarySentences([exam("A", "LGS", 1, 40), exam("B", "TYT", 9, 38)], [{ latestAccuracy: 90, delta: 15, questionCount: 3 }]);
  assert.equal(down[1], "Bu, bir önceki denemesine göre 2 net daha düşük.");
  assert.equal(down[2], "1 kazanımda belirgin ilerleme var.");
  const flat = reportSummarySentences([exam("A", "LGS", 1, 40), exam("B", "LGS", 9, 40.2)], []);
  assert.equal(flat[1], "Bu, aynı türdeki bir önceki denemesine göre benzer bir düzey.");
  assert.equal(flat.length, 2);
});
