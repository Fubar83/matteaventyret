import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

/** LaTeX, typeset. `block` for a formula on its own line (bigger, centered). */
export function Tex({ latex, block = false, className }: { latex: string; block?: boolean; className?: string }) {
  const html = useMemo(() => katex.renderToString(latex, { throwOnError: false, displayMode: block }), [latex, block]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
