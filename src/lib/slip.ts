import jsPDF from "jspdf";
import QRCode from "qrcode";

export type SlipData = {
  slip_number: string;
  date: string;
  sender: { name: string; phone?: string | null; address?: string | null };
  payer?: { name: string; shop_name?: string | null; phone?: string | null } | null;
  receiver: { name: string; phone?: string | null; address?: string | null; district?: string | null };
  amount_inr: number;
  exchange_rate: number;
  amount_npr: number;
  commission_npr: number;
  payable_npr: number;
  paid_npr: number;
  outstanding_npr: number;
  payment_method: string;
  status: string;
  notes?: string | null;
};

const L = {
  en: {
    title: "Remittance Payment Slip",
    slip: "Slip No",
    date: "Date",
    sender: "Sender (India)",
    payer: "Payer / Mediator",
    receiver: "Receiver (Nepal)",
    amount_inr: "Amount (INR)",
    rate: "Exchange Rate",
    amount_npr: "Amount (NPR)",
    commission: "Commission (NPR)",
    payable: "Payable (NPR)",
    paid: "Paid (NPR)",
    outstanding: "Outstanding (NPR)",
    method: "Method",
    status: "Status",
    notes: "Notes",
    sig_sender: "Sender Signature",
    sig_receiver: "Receiver Signature",
    footer: "Project Setu — Cross-Border Remittance",
  },
  hi: {
    title: "प्रेषण भुगतान पर्ची",
    slip: "पर्ची संख्या",
    date: "दिनांक",
    sender: "प्रेषक (भारत)",
    payer: "भुगतानकर्ता / मध्यस्थ",
    receiver: "प्राप्तकर्ता (नेपाल)",
    amount_inr: "राशि (INR)",
    rate: "विनिमय दर",
    amount_npr: "राशि (NPR)",
    commission: "कमीशन (NPR)",
    payable: "देय (NPR)",
    paid: "भुगतान (NPR)",
    outstanding: "बकाया (NPR)",
    method: "माध्यम",
    status: "स्थिति",
    notes: "टिप्पणी",
    sig_sender: "प्रेषक हस्ताक्षर",
    sig_receiver: "प्राप्तकर्ता हस्ताक्षर",
    footer: "प्रोजेक्ट सेतु — सीमा-पार प्रेषण",
  },
  ne: {
    title: "रेमिट्यान्स भुक्तानी पर्ची",
    slip: "पर्ची नं.",
    date: "मिति",
    sender: "पठाउने (भारत)",
    payer: "भुक्तानीकर्ता / मध्यस्थ",
    receiver: "प्राप्तकर्ता (नेपाल)",
    amount_inr: "रकम (INR)",
    rate: "विनिमय दर",
    amount_npr: "रकम (NPR)",
    commission: "कमिसन (NPR)",
    payable: "भुक्तानी योग्य (NPR)",
    paid: "भुक्तानी (NPR)",
    outstanding: "बाँकी (NPR)",
    method: "माध्यम",
    status: "स्थिति",
    notes: "टिप्पणी",
    sig_sender: "पठाउनेको हस्ताक्षर",
    sig_receiver: "प्राप्तकर्ताको हस्ताक्षर",
    footer: "प्रोजेक्ट सेतु — सिमापार रेमिट्यान्स",
  },
};

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export async function buildSlipHTML(data: SlipData): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(data.slip_number, { width: 140, margin: 1 });
  const trans = (key: keyof typeof L.en) =>
    `<div class="lang-row"><span>${L.en[key]}</span><span>${L.hi[key]}</span><span>${L.ne[key]}</span></div>`;

  return `
<div id="slip-print" style="font-family: 'Noto Sans', 'Noto Sans Devanagari', system-ui, sans-serif; color:#0a0a0a; background:#fff; width:780px; padding:28px; box-sizing:border-box;">
  <style>
    #slip-print h1{font-size:22px;margin:0 0 4px;letter-spacing:.5px}
    #slip-print .muted{color:#555;font-size:11px}
    #slip-print .row{display:flex;justify-content:space-between;gap:16px;margin:6px 0;font-size:13px}
    #slip-print .label{color:#444}
    #slip-print .value{font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
    #slip-print .lang-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:10px;color:#666;margin-top:1px}
    #slip-print .card{border:1px solid #d4d4d8;border-radius:8px;padding:12px;margin:8px 0;background:#fafafa}
    #slip-print .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
    #slip-print .party{border:1px solid #e4e4e7;border-radius:6px;padding:10px;background:#fff}
    #slip-print .party h3{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#0070f3}
    #slip-print .party p{margin:2px 0;font-size:12px}
    #slip-print .totals{background:#0a0a0a;color:#fff;border-radius:8px;padding:14px;margin-top:10px}
    #slip-print .totals .row{font-size:14px}
    #slip-print .totals .value{color:#fff}
    #slip-print .pay-line{font-size:18px;font-weight:700;border-top:1px dashed #fff;padding-top:8px;margin-top:6px}
    #slip-print .sig{display:flex;justify-content:space-between;margin-top:36px;font-size:11px;color:#444}
    #slip-print .sig div{border-top:1px solid #999;padding-top:4px;width:200px;text-align:center}
    #slip-print .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0a0a0a;padding-bottom:10px;margin-bottom:10px}
    #slip-print .brand{display:flex;align-items:center;gap:10px}
    #slip-print .brand .logo{width:36px;height:36px;background:#0070f3;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:6px;font-weight:800}
    #slip-print img.qr{width:90px;height:90px}
  </style>

  <div class="header">
    <div class="brand">
      <div class="logo">S</div>
      <div>
        <h1>${L.en.title}</h1>
        <div class="muted">${L.hi.title} • ${L.ne.title}</div>
      </div>
    </div>
    <div style="text-align:right">
      <img class="qr" src="${qrDataUrl}" alt="qr" />
      <div class="muted" style="font-family:monospace">${data.slip_number}</div>
    </div>
  </div>

  <div class="row"><span class="label">${L.en.slip} / ${L.hi.slip} / ${L.ne.slip}</span><span class="value" style="font-family:monospace">${data.slip_number}</span></div>
  <div class="row"><span class="label">${L.en.date} / ${L.hi.date} / ${L.ne.date}</span><span class="value">${data.date}</span></div>

  <div class="grid">
    <div class="party">
      <h3>${L.en.sender}</h3>
      <p style="font-size:10px;color:#888">${L.hi.sender} • ${L.ne.sender}</p>
      <p><strong>${data.sender.name}</strong></p>
      ${data.sender.phone ? `<p>${data.sender.phone}</p>` : ""}
      ${data.sender.address ? `<p>${data.sender.address}</p>` : ""}
    </div>
    <div class="party">
      <h3>${L.en.payer}</h3>
      <p style="font-size:10px;color:#888">${L.hi.payer} • ${L.ne.payer}</p>
      <p><strong>${data.payer?.name ?? "—"}</strong></p>
      ${data.payer?.shop_name ? `<p>${data.payer.shop_name}</p>` : ""}
      ${data.payer?.phone ? `<p>${data.payer.phone}</p>` : ""}
    </div>
    <div class="party">
      <h3>${L.en.receiver}</h3>
      <p style="font-size:10px;color:#888">${L.hi.receiver} • ${L.ne.receiver}</p>
      <p><strong>${data.receiver.name}</strong></p>
      ${data.receiver.phone ? `<p>${data.receiver.phone}</p>` : ""}
      ${data.receiver.district ? `<p>${data.receiver.district}</p>` : ""}
      ${data.receiver.address ? `<p>${data.receiver.address}</p>` : ""}
    </div>
  </div>

  <div class="card">
    <div class="row"><span class="label">${L.en.amount_inr}</span><span class="value">₹ ${fmt(data.amount_inr)}</span></div>
    ${trans("amount_inr")}
    <div class="row"><span class="label">${L.en.rate}</span><span class="value">1 INR = ${data.exchange_rate} NPR</span></div>
    ${trans("rate")}
    <div class="row"><span class="label">${L.en.amount_npr}</span><span class="value">रू ${fmt(data.amount_npr)}</span></div>
    ${trans("amount_npr")}
    <div class="row"><span class="label">${L.en.commission}</span><span class="value">- रू ${fmt(data.commission_npr)}</span></div>
    ${trans("commission")}
  </div>

  <div class="totals">
    <div class="row pay-line"><span>${L.en.payable} / ${L.hi.payable} / ${L.ne.payable}</span><span class="value">रू ${fmt(data.payable_npr)}</span></div>
    <div class="row"><span>${L.en.paid} / ${L.hi.paid} / ${L.ne.paid}</span><span class="value">रू ${fmt(data.paid_npr)}</span></div>
    <div class="row"><span>${L.en.outstanding} / ${L.hi.outstanding} / ${L.ne.outstanding}</span><span class="value">रू ${fmt(data.outstanding_npr)}</span></div>
  </div>

  <div class="row" style="margin-top:10px"><span class="label">${L.en.method} / ${L.hi.method} / ${L.ne.method}</span><span class="value">${data.payment_method.replace("_", " ").toUpperCase()}</span></div>
  <div class="row"><span class="label">${L.en.status} / ${L.hi.status} / ${L.ne.status}</span><span class="value">${data.status.toUpperCase()}</span></div>
  ${data.notes ? `<div class="row"><span class="label">${L.en.notes} / ${L.hi.notes} / ${L.ne.notes}</span><span class="value">${data.notes}</span></div>` : ""}

  <div class="sig">
    <div>${L.en.sig_sender}<br/><span style="font-size:10px;color:#888">${L.hi.sig_sender} • ${L.ne.sig_sender}</span></div>
    <div>${L.en.sig_receiver}<br/><span style="font-size:10px;color:#888">${L.hi.sig_receiver} • ${L.ne.sig_receiver}</span></div>
  </div>

  <div style="text-align:center;margin-top:24px;font-size:10px;color:#888">
    ${L.en.footer} • ${L.hi.footer} • ${L.ne.footer}
  </div>
</div>`;
}

export async function downloadSlipPDF(data: SlipData) {
  const html2canvas = (await import("html2canvas")).default;
  const html = await buildSlipHTML(data);
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  try {
    const node = wrapper.querySelector("#slip-print") as HTMLElement;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const ratio = pageW / canvas.width;
    const h = canvas.height * ratio;
    pdf.addImage(imgData, "PNG", 0, 0, pageW, h);
    pdf.save(`${data.slip_number}.pdf`);
  } finally {
    document.body.removeChild(wrapper);
  }
}

export async function downloadSlipImage(data: SlipData) {
  const html2canvas = (await import("html2canvas")).default;
  const html = await buildSlipHTML(data);
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  try {
    const node = wrapper.querySelector("#slip-print") as HTMLElement;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${data.slip_number}.png`;
    link.click();
  } finally {
    document.body.removeChild(wrapper);
  }
}

export function printSlip(html: string) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return;
  w.document.write(`<html><head><title>Slip</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    </head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}
