/**
 * Lead ↔ User güvenli kimlik eşleştirme.
 * Otomatik merge yalnız yüksek güvende; aksi halde öneri üretilir.
 */

import { leadMatchConfidence, type LeadIdentity } from "@/lib/business/deduplication";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";

export type IdentityMatchCandidate = {
  userId: string;
  role: string;
  status: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
};

export type IdentityMatchResult = {
  decision: "LINK" | "SUGGEST" | "BLOCK" | "NONE";
  confidence: number;
  reasons: string[];
  candidate: IdentityMatchCandidate | null;
  message: string;
};

export function evaluateLeadUserMatch(
  lead: { email?: string | null; phone?: string | null; relatedUserId?: string | null },
  candidates: IdentityMatchCandidate[],
): IdentityMatchResult {
  const leadIdentity: LeadIdentity = {
    email: lead.email,
    phone: lead.phone,
    relatedUserId: lead.relatedUserId,
  };

  if (!candidates.length) {
    return {
      decision: "NONE",
      confidence: 0,
      reasons: [],
      candidate: null,
      message: "Eşleşen mevcut kullanıcı yok; provisioning yeni hesap açabilir.",
    };
  }

  const scored = candidates
    .map((candidate) => {
      const match = leadMatchConfidence(leadIdentity, {
        email: candidate.email,
        phone: candidate.phone,
        relatedUserId: candidate.userId,
      });
      return { candidate, ...match };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  if (!best || best.confidence <= 0) {
    return {
      decision: "NONE",
      confidence: 0,
      reasons: [],
      candidate: null,
      message: "Güvenli eşleşme sinyali yok.",
    };
  }

  if (best.candidate.role !== "STUDENT") {
    return {
      decision: "BLOCK",
      confidence: best.confidence,
      reasons: [...best.reasons, "ROLE"],
      candidate: best.candidate,
      message: "Eşleşen hesap öğrenci değil; otomatik bağlanmaz.",
    };
  }
  if (best.candidate.status !== "ACTIVE") {
    return {
      decision: "BLOCK",
      confidence: best.confidence,
      reasons: [...best.reasons, "STATUS"],
      candidate: best.candidate,
      message: "Eşleşen öğrenci hesabı aktif değil.",
    };
  }

  // Birden fazla eşit yüksek skor → belirsizlik
  const ties = scored.filter((row) => row.confidence === best.confidence && row.confidence >= 0.78);
  if (ties.length > 1) {
    return {
      decision: "BLOCK",
      confidence: best.confidence,
      reasons: ["AMBIGUOUS"],
      candidate: best.candidate,
      message: "Birden fazla eşdeğer aday var; manuel seçim gerekli.",
    };
  }

  if (best.autoMerge) {
    return {
      decision: "LINK",
      confidence: best.confidence,
      reasons: best.reasons,
      candidate: best.candidate,
      message: "Yüksek güvenli eşleşme; mevcut öğrenci hesabına bağlanmalı.",
    };
  }

  return {
    decision: "SUGGEST",
    confidence: best.confidence,
    reasons: best.reasons,
    candidate: best.candidate,
    message: "Olası mevcut hesap; onay sonrası bağlayın (duplicate öğrenci yaratmayın).",
  };
}

export function leadIdentityFilters(input: { email?: string | null; phone?: string | null }) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const filters: Array<{ email?: string; phone?: string }> = [];
  if (normalizedEmail) filters.push({ email: normalizedEmail });
  if (normalizedPhone) filters.push({ phone: normalizedPhone });
  return { normalizedEmail, normalizedPhone, filters };
}
