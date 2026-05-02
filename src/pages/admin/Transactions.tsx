import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Pencil, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Sender = Database["public"]["Tables"]["senders"]["Row"];
type Receiver = Database["public"]["Tables"]["receivers"]["Row"];
type PaymentMethod = Database["public"]["Enums"]["payment_method"];
type TxStatus = Database["public"]["Enums"]["transaction_status"];

const methods: PaymentMethod[] = ["cash", "bank_transfer", "esewa", "khalti", "ime", "other"];
const statuses: TxStatus[] = ["pending", "partially_paid", "paid", "cancelled"];

export default function AdminTransactions() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [payers, setPayers] = useState<{ id: string; name: string; shop_name: string | null }[]>([]);
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const fetchAll = async () => {
    const [t, s, r, p, e] = await Promise.all([
      supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("senders").select("*").order("name"),
      supabase.from("receivers").select("*").order("name"),
      supabase.from("payers" as any).select("id,name,shop_name").order("name"),
      supabase.from("events" as any).select("id,name").order("name"),
    ]);
    setTxns(t.data ?? []);
    setSenders(s.data ?? []);
    setReceivers(r.data ?? []);
    setPayers((p.data as any) ?? []);
    setEvents((e.data as any) ?? []);
  };

  useEffect(() => { fetchAll(); }, []);

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm({
      sender_id: tx.sender_id,
      receiver_id: tx.receiver_id,
      payer_id: (tx as any).payer_id ?? "",
      event_id: (tx as any).event_id ?? "",
      amount_inr: String(tx.amount_inr),
      amount_npr: String(tx.amount_npr),
      exchange_rate: String(tx.exchange_rate),
      commission_npr: String(tx.commission_npr),
      payment_method: tx.payment_method,
      status: tx.status,
      transaction_date: tx.transaction_date,
      slip_number: (tx as any).slip_number ?? "",
      notes: tx.notes ?? "",
    });
    setReason("");
  };

  const save = async () => {
    if (!editing || !form) return;
    if (!reason.trim()) return toast({ title: "Edit reason required", variant: "destructive" });

    const update: any = {
      sender_id: form.sender_id,
      receiver_id: form.receiver_id,
      payer_id: form.payer_id || null,
      event_id: form.event_id || null,
      amount_inr: parseFloat(form.amount_inr) || 0,
      amount_npr: parseFloat(form.amount_npr) || 0,
      exchange_rate: parseFloat(form.exchange_rate) || 0,
      commission_npr: parseFloat(form.commission_npr) || 0,
      payment_method: form.payment_method,
      status: form.status,
      transaction_date: form.transaction_date,
      slip_number: form.slip_number || null,
      notes: form.notes || null,
      edit_reason: reason,
    };

    const { error } = await supabase.from("transactions").update(update).eq("id", editing.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });

    // Force audit log entry
    await supabase.from("audit_logs").insert({
      action: "ADMIN_EDIT",
      entity: "transaction",
      entity_id: editing.id,
      payload: { reason, changes: update },
    });

    toast({ title: "Transaction updated" });
    setEditing(null);
    fetchAll();
  };

  const cancelTx = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("transactions").update({ status: "cancelled", edit_reason: "Admin cancelled" }).eq("id", confirmDelete.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    await supabase.from("audit_logs").insert({
      action: "ADMIN_CANCEL", entity: "transaction", entity_id: confirmDelete.id, payload: { previous_status: confirmDelete.status },
    });
    toast({ title: "Transaction cancelled" });
    setConfirmDelete(null);
    fetchAll();
  };

  const filtered = txns.filter((t) =>
    (statusFilter === "all" || t.status === statusFilter) &&
    (!search ||
      (t as any).slip_number?.toLowerCase().includes(search.toLowerCase()) ||
      senders.find((s) => s.id === t.sender_id)?.name.toLowerCase().includes(search.toLowerCase()) ||
      receivers.find((r) => r.id === t.receiver_id)?.name.toLowerCase().includes(search.toLowerCase()))
  );

  const statusColor = (s: TxStatus) =>
    s === "paid" ? "default" : s === "partially_paid" ? "secondary" : s === "cancelled" ? "destructive" : "outline";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transaction Administration</h1>
        <p className="text-sm text-muted-foreground">Full edit access — every change is logged</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium">All Transactions ({filtered.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Slip / sender / receiver…" className="pl-8 h-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Slip</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead className="text-right">INR</TableHead>
                <TableHead className="text-right">NPR</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.transaction_date}</TableCell>
                  <TableCell className="font-mono text-xs">{(t as any).slip_number ?? "—"}</TableCell>
                  <TableCell className="text-sm">{senders.find((s) => s.id === t.sender_id)?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{payers.find((p) => p.id === (t as any).payer_id)?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{receivers.find((r) => r.id === t.receiver_id)?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(t.amount_inr).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{Number(t.amount_npr).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={statusColor(t.status) as any} className="font-mono text-[10px] uppercase">{t.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setConfirmDelete(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Edit Transaction {(editing as any)?.slip_number ?? ""}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <Label>Sender</Label>
                <Select value={form.sender_id} onValueChange={(v) => setForm({ ...form, sender_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{senders.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Receiver</Label>
                <Select value={form.receiver_id} onValueChange={(v) => setForm({ ...form, receiver_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{receivers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payer / Shop</Label>
                <Select value={form.payer_id || "none"} onValueChange={(v) => setForm({ ...form, payer_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {payers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.shop_name ? ` (${p.shop_name})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Event</Label>
                <Select value={form.event_id || "none"} onValueChange={(v) => setForm({ ...form, event_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Date</Label><Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Slip Number</Label><Input value={form.slip_number} onChange={(e) => setForm({ ...form, slip_number: e.target.value })} /></div>
              <div className="space-y-1"><Label>Amount INR</Label><Input type="number" value={form.amount_inr} onChange={(e) => setForm({ ...form, amount_inr: e.target.value })} /></div>
              <div className="space-y-1"><Label>Amount NPR</Label><Input type="number" value={form.amount_npr} onChange={(e) => setForm({ ...form, amount_npr: e.target.value })} /></div>
              <div className="space-y-1"><Label>Exchange Rate</Label><Input type="number" step="0.0001" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} /></div>
              <div className="space-y-1"><Label>Commission NPR</Label><Input type="number" value={form.commission_npr} onChange={(e) => setForm({ ...form, commission_npr: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="col-span-2 space-y-1">
                <Label className="text-destructive">Edit Reason (required) *</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this change being made?" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel Transaction?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will mark the transaction as <code>cancelled</code>. Records cannot be hard-deleted to preserve audit trail.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Keep</Button>
            <Button variant="destructive" onClick={cancelTx}>Cancel Transaction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
