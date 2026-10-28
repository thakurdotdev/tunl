import { FAQ_ITEMS } from "@/components/landing/faq-data";
import type { ReactNode } from "react";

function renderAnswer(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) =>
    part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="i">
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function Faq() {
  return (
    <section className="sec band" id="faq" aria-labelledby="faq-heading">
      <div className="wrap faq-grid">
        <h2 id="faq-heading">Questions before the first tunnel.</h2>
        <div>
          {FAQ_ITEMS.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{renderAnswer(item.answer)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
