import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText } from "lucide-react";
import { TransactionDetail } from "@/components/TransactionDetail";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"] & { payer_id?: string | null; paid_amount_npr?: number; slip_number?: string | null };
type Sender = Database["public"]["Tables"]["senders"]["Row"];
type Receiver = Database["public"]["Tables"]["receivers"]["Row"];
type Payer = { id: string; name: string; shop_name: string | null };
type PaymentMethod = Database["public"]["Enums"]["payment_method"];
type TxStatus = Database["public"]["Enums"]["transaction_status"];

const paymentMethods: PaymentMethod[] = ["cash", "bank_transfer", "esewa", "khalti", "ime", "other"];
const statuses = ["pending", "partially_paid", "paid", "cancelled"] as const;

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [events, setEvents] = useState<{ id: string; name: string; color: string | null }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [todayRate, setTodayRate] = useState<number>(0);
  const [commissionRatePerK, setCommissionRatePerK] = useState<number>(30);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    sender_id: "", receiver_id: "", payer_id: "", event_id: "", amount_inr: "",
    commission_inr: "", commission_npr: "",
    commission_mode: "auto" as "auto" | "manual_inr" | "manual_npr",
    payment_method: "cash" as PaymentMethod, notes: "",
  });

  const amountNpr = todayRate && form.amount_inr ? parseFloat(form.amount_inr) * todayRate : 0;

  // Commission calculation logic
  const getCommission = () => {
    if (form.commission_mode === "manual_inr" && form.commission_inr) {
      const inr = parseFloat(form.commission_inr);
      return { inr, npr: todayRate ? inr * todayRate : 0 };
    }
    if (form.commission_mode === "manual_npr" && form.commission_npr) {
      const npr = parseFloat(form.commission_npr);
      return { inr: todayRate ? npr / todayRate : 0, npr };
    }
    // Auto: rate per 1000 NPR
    if (amountNpr > 0 && commissionRatePerK > 0) {
      const npr = (amountNpr / 1000) * commissionRatePerK;
      return { inr: todayRate ? npr / todayRate : 0, npr };
    }
    return { inr: 0, npr: 0 };
  };

  const commission = getCommission();
  const payableNpr = amountNpr - commission.npr;

  const fetchAll = async () => {
    const [t, s, r, p, rate] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }),
      supabase.from("senders").select("*").order("name"),
      supabase.from("receivers").select("*").order("name"),
      supabase.from("payers" as any).select("id,name,shop_name").eq("is_active", true).order("name"),
      supabase.from("daily_rates").select("inr_to_npr, commission_rate_npr_per_1000").order("rate_date", { ascending: false }).limit(1).single(),
    ]);
    setTxns((t.data as any) ?? []);
    setSenders(s.data ?? []);
    setReceivers(r.data ?? []);
    setPayers((p.data as any) ?? []);
    setTodayRate(rate.data?.inr_to_npr ?? 0);
    setCommissionRatePerK(rate.data?.commission_rate_npr_per_1000 ?? 30);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!form.sender_id || !form.receiver_id || !form.amount_inr) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    if (!todayRate) {
      toast({ title: "No exchange rate set", description: "Admin must set today's rate first.", variant: "destructive" }); return;
    }

    const { error } = await supabase.from("transactions").insert({
      sender_id: form.sender_id,
      receiver_id: form.receiver_id,
      payer_id: form.payer_id || null,
      amount_inr: parseFloat(form.amount_inr),
      exchange_rate: todayRate,
      amount_npr: amountNpr,
      commission: parseFloat(commission.inr.toFixed(2)),
      commission_npr: parseFloat(commission.npr.toFixed(2)),
      payment_method: form.payment_method,
      notes: form.notes || null,
      created_by: user?.id,
    } as any);

    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }

    setOpen(false);
    setForm({ sender_id: "", receiver_id: "", payer_id: "", amount_inr: "", commission_inr: "", commission_npr: "", commission_mode: "auto", payment_method: "cash", notes: "" });
    fetchAll();
    toast({ title: "Transaction created" });
  };



  const senderMap = Object.fromEntries(senders.map((s) => [s.id, s.name]));
  const receiverMap = Object.fromEntries(receivers.map((r) => [r.id, r.name]));

  const filtered = txns.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    const s = senderMap[t.sender_id]?.toLowerCase() ?? "";
    const r = receiverMap[t.receiver_id]?.toLowerCase() ?? "";
    const q = search.toLowerCase();
    return s.includes(q) || r.includes(q) || t.id.includes(q);
  });

  const statusColor = (s: string) => s === "paid" ? "default" : s === "partially_paid" ? "outline" : s === "pending" ? "secondary" : "destructive";
  const payerMap = Object.fromEntries(payers.map(p => [p.id, p.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {txns.length} transactions • Rate: {todayRate ? `1 INR = ${todayRate} NPR` : "Not set"}
            {commissionRatePerK > 0 && ` • Commission: रू${commissionRatePerK}/1000`}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Transaction</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Sender *</Label>
                <Select value={form.sender_id} onValueChange={(v) => setForm({ ...form, sender_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select sender" /></SelectTrigger>
                  <SelectContent>{senders.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Receiver *</Label>
                <Select value={form.receiver_id} onValueChange={(v) => setForm({ ...form, receiver_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select receiver" /></SelectTrigger>
                  <SelectContent>{receivers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payer / Mediator</Label>
                <Select value={form.payer_id || "none"} onValueChange={(v) => setForm({ ...form, payer_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {payers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.shop_name ? ` (${p.shop_name})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (INR) *</Label>
                <Input type="number" value={form.amount_inr} onChange={(e) => setForm({ ...form, amount_inr: e.target.value })} placeholder="10000" />
              </div>

              {/* Exchange & Amount NPR */}
              <div className="bg-muted/50 p-3 rounded-md border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="font-mono">{todayRate || "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount (NPR)</span>
                  <span className="font-mono font-bold text-primary text-lg">
                    {amountNpr > 0 ? `रू${amountNpr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
                  </span>
                </div>
              </div>

              {/* Commission Section */}
              <div className="space-y-2">
                <Label>Commission Mode</Label>
                <Select value={form.commission_mode} onValueChange={(v) => setForm({ ...form, commission_mode: v as any, commission_inr: "", commission_npr: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (रू{commissionRatePerK}/1000 NPR)</SelectItem>
                    <SelectItem value="manual_inr">Manual (INR)</SelectItem>
                    <SelectItem value="manual_npr">Manual (NPR)</SelectItem>
                  </SelectContent>
                </Select>

                {form.commission_mode === "manual_inr" && (
                  <div>
                    <Label>Commission (INR)</Label>
                    <Input type="number" value={form.commission_inr} onChange={(e) => setForm({ ...form, commission_inr: e.target.value })} placeholder="500" />
                  </div>
                )}
                {form.commission_mode === "manual_npr" && (
                  <div>
                    <Label>Commission (NPR)</Label>
                    <Input type="number" value={form.commission_npr} onChange={(e) => setForm({ ...form, commission_npr: e.target.value })} placeholder="800" />
                  </div>
                )}

                {/* Commission summary */}
                <div className="bg-muted/50 p-3 rounded-md border space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission (INR)</span>
                    <span className="font-mono">₹{commission.inr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission (NPR)</span>
                    <span className="font-mono">रू{commission.npr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Payable Amount */}
              {amountNpr > 0 && (
                <div className="bg-primary/10 p-3 rounded-md border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Payable (NPR)</span>
                    <span className="font-mono font-bold text-primary text-xl">
                      रू{payableNpr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">After commission deduction</p>
                </div>
              )}

              <div>
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethod })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ").toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleCreate} className="w-full">Create Transaction</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map((s) => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slip</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Sender → Payer → Receiver</TableHead>
              <TableHead className="text-right">INR</TableHead>
              <TableHead className="text-right">Payable (रू)</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No transactions</TableCell></TableRow>
            ) : filtered.map((t) => {
              const commNpr = Number(t.commission_npr) || (Number(t.commission) * Number(t.exchange_rate));
              const payable = Number(t.amount_npr) - commNpr;
              const paid = Number(t.paid_amount_npr || 0);
              const outstanding = payable - paid;
              return (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedId(t.id)}>
                  <TableCell className="font-mono text-xs flex items-center gap-1"><FileText className="h-3 w-3 text-muted-foreground" />{t.slip_number ?? t.id.slice(0,6)}</TableCell>
                  <TableCell className="font-mono text-xs">{t.transaction_date}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{senderMap[t.sender_id] ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{payerMap[t.payer_id ?? ""] ?? "no payer"} → {receiverMap[t.receiver_id] ?? "—"}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">₹{Number(t.amount_inr).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-primary">रू{payable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-accent">रू{paid.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className={`text-right font-mono text-sm ${outstanding > 0 ? "text-destructive" : "text-muted-foreground"}`}>रू{outstanding.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</TableCell>
                  <TableCell><Badge variant={statusColor(t.status) as any}>{t.status.replace("_", " ")}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {txns.length} • Click any row for details, payments, edit & slip</p>

      <TransactionDetail txId={selectedId} open={!!selectedId} onClose={() => setSelectedId(null)} onChange={fetchAll} />
    </div>
  );
}
