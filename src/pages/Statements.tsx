import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, FileDown } from "lucide-react";
import jsPDF from "jspdf";

const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function Statements() {
  const [kind, setKind] = useState<"sender" | "payer" | "receiver">("sender");
  const [partyId, setPartyId] = useState("");
  const [parties, setParties] = useState<any[]>([]);
  const [tx, setTx] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const table = kind === "sender" ? "senders" : kind === "payer" ? "payers" : "receivers";
      const { data } = await supabase.from(table as any).select("id,name").order("name");
      setParties(data ?? []); setPartyId(""); setTx([]); setSettlements([]);
    })();
  }, [kind]);

  useEffect(() => {
    if (!partyId) return;
    (async () => {
      const col = kind === "sender" ? "sender_id" : kind === "payer" ? "payer_id" : "receiver_id";
      const [t, s] = await Promise.all([
        supabase.from("transactions").select("*").eq(col, partyId).order("transaction_date"),
        supabase.from("settlements" as any).select("*").eq("party_kind", kind).eq("party_id", partyId).order("occurred_on"),
      ]);
      setTx(t.data ?? []); setSettlements((s.data as any) ?? []);
    })();
  }, [partyId, kind]);

  const rows = useMemo(() => {
    type Row = { date: string; description: string; debit: number; credit: number };
    const items: Row[] = [];
    tx.forEach(t => {
      const payable = Number(t.amount_npr) - Number(t.commission_npr);
      items.push({ date: t.transaction_date, description: `Tx ${t.slip_number ?? t.id.slice(0,6)} — payable`, debit: payable, credit: 0 });
      if (Number(t.paid_amount_npr) > 0) items.push({ date: t.transaction_date, description: `Tx ${t.slip_number ?? t.id.slice(0,6)} — paid`, debit: 0, credit: Number(t.paid_amount_npr) });
    });
    settlements.forEach(s => {
      const desc = `${s.kind.replace("_"," ")} ${s.reference ? "• " + s.reference : ""}`;
      if (s.kind === "advance_in" || s.kind === "refund") items.push({ date: s.occurred_on, description: desc, debit: 0, credit: Number(s.amount_npr) });
      else items.push({ date: s.occurred_on, description: desc, debit: Number(s.amount_npr), credit: 0 });
    });
    items.sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    return items.map(r => { bal += r.debit - r.credit; return { ...r, balance: bal }; });
  }, [tx, settlements]);

  const partyName = parties.find((p: any) => p.id === partyId)?.name ?? "";
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const closing = totalDebit - totalCredit;

  const exportCSV = () => {
    const lines = [["Date", "Description", "Debit", "Credit", "Balance"], ...rows.map(r => [r.date, r.description, r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2)])];
    const csv = lines.map(l => l.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `statement-${kind}-${partyName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    pdf.setFontSize(16); pdf.text("Account Statement", 40, 50);
    pdf.setFontSize(11); pdf.text(`${kind.toUpperCase()}: ${partyName}`, 40, 70);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 40, 86);
    pdf.setFontSize(9);
    let y = 110;
    pdf.text("Date", 40, y); pdf.text("Description", 110, y); pdf.text("Debit", 360, y); pdf.text("Credit", 430, y); pdf.text("Balance", 500, y);
    y += 4; pdf.line(40, y, 555, y); y += 12;
    rows.forEach(r => {
      if (y > 780) { pdf.addPage(); y = 50; }
      pdf.text(r.date, 40, y);
      pdf.text(r.description.slice(0, 40), 110, y);
      pdf.text(r.debit ? fmt(r.debit) : "", 360, y);
      pdf.text(r.credit ? fmt(r.credit) : "", 430, y);
      pdf.text(fmt(r.balance), 500, y);
      y += 14;
    });
    y += 8; pdf.line(40, y, 555, y); y += 14;
    pdf.setFontSize(10);
    pdf.text(`Totals — Debit: रू ${fmt(totalDebit)}   Credit: रू ${fmt(totalCredit)}   Closing: रू ${fmt(closing)}`, 40, y);
    pdf.save(`statement-${kind}-${partyName}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Party Statements</h1>
        <p className="text-sm text-muted-foreground">Account-style ledger for any sender, payer or receiver</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div><Label className="text-xs">Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as any)}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="sender">Sender</SelectItem><SelectItem value="payer">Payer</SelectItem><SelectItem value="receiver">Receiver</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Party</Label>
          <Select value={partyId} onValueChange={setPartyId}><SelectTrigger className="w-[260px]"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{parties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {partyId && (
          <>
            <Button variant="outline" size="sm" onClick={exportCSV}><FileDown className="h-4 w-4 mr-1" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
          </>
        )}
      </div>

      {partyId && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Total Debit</div><div className="font-mono text-lg">रू {fmt(totalDebit)}</div></div>
            <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Total Credit</div><div className="font-mono text-lg">रू {fmt(totalCredit)}</div></div>
            <div className="border rounded-md p-3"><div className="text-xs text-muted-foreground">Closing balance</div><div className={`font-mono text-lg ${closing > 0 ? "text-destructive" : "text-primary"}`}>रू {fmt(closing)}</div></div>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No activity</TableCell></TableRow> :
                  rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.date}</TableCell>
                      <TableCell className="text-sm">{r.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.debit ? fmt(r.debit) : ""}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.credit ? fmt(r.credit) : ""}</TableCell>
                      <TableCell className={`text-right font-mono text-sm ${r.balance > 0 ? "text-destructive" : "text-primary"}`}>{fmt(r.balance)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
