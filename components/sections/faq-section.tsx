"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { faq } from "@/lib/content";

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="sss" className="pd-section">
      <div className="pd-section-header" style={{ justifyContent: "center", textAlign: "center" }}>
        <div className="pd-section-head-txt" style={{ margin: "0 auto" }}>
          <span className="pd-eyebrow">Sık Sorulanlar</span>
          <h2>Merak edilenler</h2>
        </div>
      </div>
      <div className="pd-faq">
        {faq.map((f, i) => {
          const open = openIndex === i;
          return (
            <div
              key={f.q}
              className={`pd-faq-item ${open ? "open" : ""}`}
              onClick={() => setOpenIndex(open ? -1 : i)}
            >
              <div className="pd-faq-q">
                {f.q}
                <span className="pd-faq-toggle">
                  <Plus size={12} />
                </span>
              </div>
              <div className="pd-faq-a">{f.a}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
