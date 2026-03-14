import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Receiver = Database["public"]["Tables"]["receivers"]["Row"];
type Sender = Database["public"]["Tables"]["senders"]["Row"];
type PaymentMethod = Database["public"]["Enums"]["payment_method"];

const paymentMethods: PaymentMethod[] = ["cash", "bank_transfer", "esewa", "khalti", "ime", "other"];

export default function Receivers() {
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Receiver | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", district: "", address: "", payment_mode: "cash" as PaymentMethod, bank_details: "", relationship: "", sender_id: "" });
  const { toast } = useToast();

  const fetch = async () => {
    const [r, s] = await Promise.all([
      supabase.from("receivers").select("*").order("created_at", { ascending: false }),
      supabase.from("senders").select("*").order("name"),
    ]);
    setReceivers(r.data ?? []);
    setSenders(s.data ?? []);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const payload = { ...form, sender_id: form.sender_id || null };

    if (editing) {
      const { error } = await supabase.from("receivers").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("receivers").insert(payload);
      if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    }

    setOpen(false); setEditing(null);
    setForm({ name: "", phone: "", district: "", address: "", payment_mode: "cash", bank_details: "", relationship: "", sender_id: "" });
    fetch();
    toast({ title: editing ? "Receiver updated" : "Receiver added" });
  };

  const openEdit = (r: Receiver) => {
    setEditing(r);
    setForm({ name: r.name, phone: r.phone ?? "", district: r.district ?? "", address: r.address ?? "", payment_mode: r.payment_mode, bank_details: r.bank_details ?? "", relationship: r.relationship ?? "", sender_id: r.sender_id ?? "" });
    setOpen(true);
  };

  const senderMap = Object.fromEntries(senders.map((s) => [s.id, s.name]));

  const filtered = receivers.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.district?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Receivers</h1>
          <p className="text-sm text-muted-foreground">{receivers.length} families registered</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", phone: "", district: "", address: "", payment_mode: "cash", bank_details: "", relationship: "", sender_id: "" }); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Receiver</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Receiver" : "Add Receiver"}</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>District</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v as PaymentMethod })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ").toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Bank / Wallet Details</Label><Input value={form.bank_details} onChange={(e) => setForm({ ...form, bank_details: e.target.value })} /></div>
              <div><Label>Relationship</Label><Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="e.g. Wife, Mother" /></div>
              <div>
                <Label>Linked Sender</Label>
                <Select value={form.sender_id} onValueChange={(v) => setForm({ ...form, sender_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select sender" /></SelectTrigger>
                  <SelectContent>
                    {senders.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, district, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>District</TableHead>
              <TableHead>Payment Mode</TableHead>
              <TableHead>Linked Sender</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No receivers found</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm">{r.district ?? "—"}</TableCell>
                <TableCell><span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{r.payment_mode.replace("_", " ")}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.sender_id ? senderMap[r.sender_id] ?? "—" : "—"}</TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {receivers.length} receivers</p>
    </div>
  );
}
