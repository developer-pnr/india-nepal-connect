import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Plus, FileDown, Image as ImageIcon, Printer, Trash2 } from "lucide-react";
import { downloadSlipPDF, downloadSlipImage, buildSlipHTML, printSlip, type SlipData } from "@/lib/slip";

type Tx = any;
const channels = ["cash", "bank_transfer", "esewa", "khalti", "ime", "other"] as const;

export function TransactionDetail({ txId, open, onClose, onChange }: { txId: string | null; open: boolean; onClose: () => void; onChange: () => void }) {
  const [tx, setTx] = useState<Tx | null>(null);
  const [installments, setInstallments] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editReason, setEditReason] = useState("");
  const [inst, setInst] = useState({ amount_npr: "", channel: "cash" as any, paid_on: new Date().toISOString().slice(0,10), payer_id: "", reference: "", notes: "" });
  const { user, hasRole } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    if (!txId) return;
    const [t, i, a, p] = await Promise.all([
      supabase.from("transactions").select("*, sender:senders(*), receiver:receivers(*)").eq("id", txId).single(),
      supabase.from("payment_installments" as any).select("*").eq("transaction_id", txId).order("paid_on", { ascending: false }),
      supabase.from("transaction_activity" as any).select("*").eq("transaction_id", txId).order("created_at", { ascending: false }),
      supabase.from("payers" as any).select("*").eq("is_active", true).order("name"),
    ]);
    const tdata: any = t.data;
    if (tdata?.payer_id) {
      const { data: pdata } = await supabase.from("payers" as any).select("*").eq("id", tdata.payer_id).maybeSingle();
      tdata.payer = pdata;
    }
    setTx(tdata); setInstallments((i.data as any) ?? []); setActivity((a.data as any) ?? []); setPayers((p.data as any) ?? []);
    setEditForm({
      amount_inr: tdata?.amount_inr, exchange_rate: tdata?.exchange_rate, amount_npr: tdata?.amount_npr,
      commission_npr: tdata?.commission_npr, payment_method: tdata?.payment_method, status: tdata?.status,
      payer_id: tdata?.payer_id ?? "", notes: tdata?.notes ?? "",
    });
  };

  useEffect(() => { if (open && txId) load(); }, [open, txId]);

  if (!tx) return <Sheet open={open} onOpenChange={onClose}><SheetContent /></Sheet>;

  const payable = Number(tx.amount_npr) - Number(tx.commission_npr);
  const paid = Number(tx.paid_amount_npr || 0);
  const outstanding = payable - paid;

  const addInstallment = async () => {
    const amt = parseFloat(inst.amount_npr);
    if (!amt || amt <= 0) { toast({ title: "Enter valid amount", variant: "destructive" }); return; }
    const { error } = await supabase.from("payment_installments" as any).insert({
      transaction_id: tx.id, amount_npr: amt, channel: inst.channel, paid_on: inst.paid_on,
      payer_id: inst.payer_id || tx.payer_id || null, reference: inst.reference || null, notes: inst.notes || null, created_by: user?.id,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setInst({ amount_npr: "", channel: "cash", paid_on: new Date().toISOString().slice(0,10), payer_id: "", reference: "", notes: "" });
    await load(); onChange();
    toast({ title: "Payment recorded" });
  };

  const deleteInstallment = async (id: string) => {
    if (!confirm("Delete this payment record?")) return;
    const { error } = await supabase.from("payment_installments" as any).delete().eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    load(); onChange();
  };

  const saveEdit = async () => {
    if (!editReason.trim()) { toast({ title: "Reason required for edit", variant: "destructive" }); return; }
    const amt_inr = parseFloat(editForm.amount_inr); const rate = parseFloat(editForm.exchange_rate);
    const npr = amt_inr * rate;
    const { error } = await supabase.from("transactions").update({
      amount_inr: amt_inr, exchange_rate: rate, amount_npr: npr,
      commission_npr: parseFloat(editForm.commission_npr) || 0,
      commission: rate ? (parseFloat(editForm.commission_npr) || 0) / rate : 0,
      payment_method: editForm.payment_method, status: editForm.status,
      payer_id: editForm.payer_id || null, notes: editForm.notes || null, edit_reason: editReason,
    }).eq("id", tx.id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setEditMode(false); setEditReason(""); load(); onChange();
    toast({ title: "Transaction updated" });
  };

  const slipData = (): SlipData => ({
    slip_number: tx.slip_number ?? tx.id.slice(0,8),
    date: tx.transaction_date,
    sender: { name: tx.sender?.name ?? "—", phone: tx.sender?.phone, address: tx.sender?.address },
    payer: tx.payer ? { name: tx.payer.name, shop_name: tx.payer.shop_name, phone: tx.payer.phone } : null,
    receiver: { name: tx.receiver?.name ?? "—", phone: tx.receiver?.phone, address: tx.receiver?.address, district: tx.receiver?.district },
    amount_inr: Number(tx.amount_inr), exchange_rate: Number(tx.exchange_rate), amount_npr: Number(tx.amount_npr),
    commission_npr: Number(tx.commission_npr), payable_npr: payable, paid_npr: paid, outstanding_npr: outstanding,
    payment_method: tx.payment_method, status: tx.status, notes: tx.notes,
  });

  const printSlipNow = async () => { const html = await buildSlipHTML(slipData()); printSlip(html); };

  const statusColor = (s: string) => s === "paid" ? "default" : s === "partially_paid" ? "outline" : s === "cancelled" ? "destructive" : "secondary";

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base">{tx.slip_number}</span>
            <Badge variant={statusColor(tx.status) as any}>{tx.status.replace("_", " ")}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Sender</div><div className="font-medium">{tx.sender?.name}</div></div>
            <div><div className="text-xs text-muted-foreground">Payer</div><div className="font-medium">{tx.payer?.name ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Receiver</div><div className="font-medium">{tx.receiver?.name}</div></div>
          </div>

          <div className="bg-muted/40 rounded-md border p-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Amount INR</span><span className="font-mono">₹ {Number(tx.amount_inr).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-mono">{tx.exchange_rate}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Amount NPR</span><span className="font-mono">रू {Number(tx.amount_npr).toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Commission NPR</span><span className="font-mono">- रू {Number(tx.commission_npr).toLocaleString("en-IN")}</span></div>
            <Separator className="my-1" />
            <div className="flex justify-between font-semibold"><span>Payable</span><span className="font-mono text-primary">रू {payable.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-mono text-accent">रू {paid.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between font-bold"><span>Outstanding</span><span className={`font-mono ${outstanding > 0 ? "text-destructive" : "text-primary"}`}>रू {outstanding.toLocaleString("en-IN")}</span></div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadSlipPDF(slipData())}><FileDown className="h-4 w-4 mr-1" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={() => downloadSlipImage(slipData())}><ImageIcon className="h-4 w-4 mr-1" /> Image</Button>
            <Button size="sm" variant="outline" onClick={printSlipNow}><Printer className="h-4 w-4 mr-1" /> Print</Button>
            {!editMode && <Button size="sm" variant="secondary" onClick={() => setEditMode(true)}>Edit Transaction</Button>}
          </div>

          {editMode && (
            <div className="border rounded-md p-3 space-y-2">
              <h4 className="text-sm font-semibold">Edit transaction</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Amount INR</Label><Input type="number" value={editForm.amount_inr} onChange={(e) => setEditForm({ ...editForm, amount_inr: e.target.value })} /></div>
                <div><Label className="text-xs">Rate</Label><Input type="number" value={editForm.exchange_rate} onChange={(e) => setEditForm({ ...editForm, exchange_rate: e.target.value })} /></div>
                <div><Label className="text-xs">Commission NPR</Label><Input type="number" value={editForm.commission_npr} onChange={(e) => setEditForm({ ...editForm, commission_npr: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["pending","partially_paid","paid","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Payer</Label>
                  <Select value={editForm.payer_id || "none"} onValueChange={(v) => setEditForm({ ...editForm, payer_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">None</SelectItem>{payers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}{p.shop_name ? ` (${p.shop_name})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label className="text-xs">Notes</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
                <div className="col-span-2"><Label className="text-xs">Reason for edit *</Label><Input value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="e.g. corrected exchange rate" /></div>
              </div>
              <div className="flex gap-2"><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setEditReason(""); }}>Cancel</Button></div>
            </div>
          )}

          <div className="border rounded-md p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Payment installments</h4>
              <span className="text-xs text-muted-foreground">{installments.length} payments</span>
            </div>
            {installments.map(i => (
              <div key={i.id} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <div>
                  <div className="font-mono">रू {Number(i.amount_npr).toLocaleString("en-IN")} <span className="text-xs text-muted-foreground ml-1">via {i.channel.replace("_"," ")}</span></div>
                  <div className="text-xs text-muted-foreground">{i.paid_on}{i.reference ? ` • ${i.reference}` : ""}</div>
                </div>
                {hasRole("admin") && <Button size="sm" variant="ghost" onClick={() => deleteInstallment(i.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
              </div>
            ))}
            {outstanding > 0 && (
              <div className="bg-muted/30 rounded p-2 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add payment</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Amount NPR" value={inst.amount_npr} onChange={(e) => setInst({ ...inst, amount_npr: e.target.value })} />
                  <Select value={inst.channel} onValueChange={(v) => setInst({ ...inst, channel: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{channels.map(c => <SelectItem key={c} value={c}>{c.replace("_"," ")}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" value={inst.paid_on} onChange={(e) => setInst({ ...inst, paid_on: e.target.value })} />
                  <Select value={inst.payer_id || "default"} onValueChange={(v) => setInst({ ...inst, payer_id: v === "default" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Payer" /></SelectTrigger>
                    <SelectContent><SelectItem value="default">Use tx payer</SelectItem>{payers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="col-span-2" placeholder="Reference (txn ID, slip)" value={inst.reference} onChange={(e) => setInst({ ...inst, reference: e.target.value })} />
                </div>
                <Button size="sm" onClick={addInstallment} className="w-full"><Plus className="h-3 w-3 mr-1" /> Record payment</Button>
              </div>
            )}
          </div>

          <div className="border rounded-md p-3">
            <h4 className="text-sm font-semibold mb-2">Activity timeline</h4>
            <div className="space-y-2">
              {activity.map(a => (
                <div key={a.id} className="text-xs border-l-2 border-primary/40 pl-2">
                  <div className="font-medium">{a.message ?? a.event_type}</div>
                  <div className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))}
              {activity.length === 0 && <div className="text-xs text-muted-foreground">No activity yet</div>}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
