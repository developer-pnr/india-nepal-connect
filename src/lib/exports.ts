import jsPDF from "jspdf";

// Trilingual export library — generates PDF (and PNG via html2canvas) for tabular reports.
// Layout: header row has EN | HI | NE columns side-by-side per logical column.

export type Lang = "en" | "hi" | "ne" | "all";

export type ExportColumn = {
  key: string;
  // Header in 3 languages. If `all` is selected, all 3 are stacked in the header cell.
  labels: { en: string; hi: string; ne: string };
  align?: "left" | "right";
  width?: number; // optional width hint in pt
  format?: (v: any, row: any) => string;
};

export type ExportSpec = {
  title: { en: string; hi: string; ne: string };
  subtitle?: string;
  meta?: Array<{ label: { en: string; hi: string; ne: string }; value: string }>;
  columns: ExportColumn[];
  rows: any[];
  totals?: Array<{ label: { en: string; hi: string; ne: string }; value: string }>;
  filenameBase: string;
};

const fmtTitle = (t: ExportSpec["title"], lang: Lang) => {
  if (lang === "all") return `${t.en}  •  ${t.hi}  •  ${t.ne}`;
  return t[lang];
};

function buildHTML(spec: ExportSpec, lang: Lang): string {
  const showAll = lang === "all";
  const cellHeader = (c: ExportColumn) => {
    if (showAll) {
      return `<div class="thwrap"><div>${c.labels.en}</div><div class="alt">${c.labels.hi}</div><div class="alt">${c.labels.ne}</div></div>`;
    }
    return c.labels[lang];
  };
  const headers = spec.columns
    .map((c) => `<th style="text-align:${c.align ?? "left"}">${cellHeader(c)}</th>`)
    .join("");
  const body = spec.rows
    .map(
      (r) =>
        `<tr>${spec.columns
          .map((c) => {
            const v = c.format ? c.format(r[c.key], r) : (r[c.key] ?? "");
            return `<td style="text-align:${c.align ?? "left"}">${v}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  const meta = (spec.meta ?? [])
    .map(
      (m) =>
        `<div class="metarow"><span class="lbl">${
          showAll ? `${m.label.en} / ${m.label.hi} / ${m.label.ne}` : m.label[lang]
        }</span><span class="val">${m.value}</span></div>`
    )
    .join("");

  const totals = (spec.totals ?? [])
    .map(
      (t) =>
        `<div class="totrow"><span class="lbl">${
          showAll ? `${t.label.en} / ${t.label.hi} / ${t.label.ne}` : t.label[lang]
        }</span><span class="val">${t.value}</span></div>`
    )
    .join("");

  return `
<div id="export-doc" style="font-family:'Noto Sans','Noto Sans Devanagari',system-ui,sans-serif;color:#0a0a0a;background:#fff;width:1100px;padding:28px;box-sizing:border-box;">
  <style>
    #export-doc h1{font-size:20px;margin:0 0 4px;letter-spacing:.3px}
    #export-doc .sub{color:#555;font-size:11px;margin-bottom:14px}
    #export-doc .header{border-bottom:2px solid #0a0a0a;padding-bottom:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end}
    #export-doc .brand{display:flex;align-items:center;gap:10px}
    #export-doc .logo{width:30px;height:30px;background:#0070f3;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:6px;font-weight:800}
    #export-doc table{border-collapse:collapse;width:100%;font-size:11px;table-layout:auto}
    #export-doc th,#export-doc td{border:1px solid #d4d4d8;padding:6px 8px;vertical-align:top}
    #export-doc th{background:#f4f4f5;font-weight:600}
    #export-doc .thwrap div{font-size:11px;line-height:1.25}
    #export-doc .thwrap .alt{font-size:9.5px;color:#666;font-weight:500}
    #export-doc tbody tr:nth-child(even){background:#fafafa}
    #export-doc .metarow,#export-doc .totrow{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px dashed #e4e4e7}
    #export-doc .totrow{font-weight:700}
    #export-doc .lbl{color:#444}
    #export-doc .val{font-variant-numeric:tabular-nums}
    #export-doc .meta-block{margin:8px 0 14px}
    #export-doc .totals-block{margin-top:12px;border-top:2px solid #0a0a0a;padding-top:8px}
    #export-doc .footer{margin-top:18px;text-align:center;font-size:10px;color:#888}
    #export-doc .num{font-variant-numeric:tabular-nums;font-family:'IBM Plex Mono',ui-monospace,monospace}
  </style>

  <div class="header">
    <div class="brand">
      <div class="logo">S</div>
      <div>
        <h1>${fmtTitle(spec.title, lang)}</h1>
        <div class="sub">${spec.subtitle ?? ""} • Generated ${new Date().toLocaleString()}</div>
      </div>
    </div>
    <div class="sub">Project Setu</div>
  </div>

  ${meta ? `<div class="meta-block">${meta}</div>` : ""}

  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${body || `<tr><td colspan="${spec.columns.length}" style="text-align:center;padding:24px;color:#888">No data</td></tr>`}</tbody>
  </table>

  ${totals ? `<div class="totals-block">${totals}</div>` : ""}

  <div class="footer">Project Setu — Cross-Border Remittance • प्रोजेक्ट सेतु • प्रोजेक्ट सेतु</div>
</div>`;
}

async function renderToCanvas(html: string): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  try {
    const node = wrapper.querySelector("#export-doc") as HTMLElement;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
    return canvas;
  } finally {
    document.body.removeChild(wrapper);
  }
}

export async function exportReportPDF(spec: ExportSpec, lang: Lang) {
  const html = buildHTML(spec, lang);
  const canvas = await renderToCanvas(html);
  const orientation = lang === "all" ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = pageW / canvas.width;
  const imgH = canvas.height * ratio;
  const imgData = canvas.toDataURL("image/png");

  if (imgH <= pageH) {
    pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
  } else {
    // Multi-page: slice the canvas into page-sized chunks.
    const pageCanvasH = Math.floor(pageH / ratio);
    let y = 0;
    while (y < canvas.height) {
      const sliceH = Math.min(pageCanvasH, canvas.height - y);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceH;
      const ctx = slice.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const data = slice.toDataURL("image/png");
      if (y > 0) pdf.addPage();
      pdf.addImage(data, "PNG", 0, 0, pageW, sliceH * ratio);
      y += sliceH;
    }
  }
  pdf.save(`${spec.filenameBase}-${lang}.pdf`);
}

export async function exportReportImage(spec: ExportSpec, lang: Lang) {
  const html = buildHTML(spec, lang);
  const canvas = await renderToCanvas(html);
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${spec.filenameBase}-${lang}.png`;
  link.click();
}

export const fmtNum = (n: number) =>
  (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
