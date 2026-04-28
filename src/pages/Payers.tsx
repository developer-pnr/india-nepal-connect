import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Store } from "lucide-react";

type Payer = {
  id: string; name: string; shop_name: string | null; phone: string | null;
  address: string | null; district: string | null; notes: string | null; is_active: boolean;
};

export default function Payers() {
  const [rows, setRows] = useState<Payer[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payer | null>(null);
  const empty = { name: "", shop_name: "", phone: "", address: "", district: "", notes: "", is_active: true };
  const [form, setForm] = useState(empty);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("payers" as any).select("*").order("created_at", { ascending: false });
    setRows((data as any) ?? []);
    const { data: bals } = await supabase.from("party_balances" as any).select("*").eq("party_kind", "payer");
    const map: Record<string, number> = {};
    (bals as any)?.forEach((b: any) => { map[b.party_id] = Number(b.outstanding_npr || 0); });
    setBalances(map);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload = { ...form, shop_name: form.shop_name || null, phone: form.phone || null, address: form.address || null, district: form.district || null, notes: form.notes || null };
    const res = editing
      ? await supabase.from("payers" as any).update(payload).eq("id", editing.id)
      : await supabase.from("payers" as any).insert(payload);
    if (res.error) { toast({ title: "Failed", description: res.error.message, variant: "destructive" }); return; }
    setOpen(false); setEditing(null); setForm(empty); load();
    toast({ title: editing ? "Payer updated" : "Payer added" });
  };

  const openEdit = (p: Payer) => {
    setEditing(p);
    setForm({ name: p.name, shop_name: p.shop_name ?? "", phone: p.phone ?? "", address: p.address ?? "", district: p.district ?? "", notes: p.notes ?? "", is_active: p.is_active });
    setOpen(true);
  };

  const filtered = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.shop_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Store className="h-6 w-6 text-primary" /> Payers / Mediators</h1>
          <p className="text-sm text-muted-foreground">{rows.length} active payers • Shops/mediators handing out NPR cash</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Payer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Payer" : "Add Payer"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Shop Name</Label><Input value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>District</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
              </div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
              <Button onClick={save} className="w-full">{editing ? "Update" : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search payers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Name</TableHead><TableHead>Shop</TableHead><TableHead>District</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Outstanding (NPR)</TableHead><TableHead></TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payers yet — add the shops/mediators you work with.</TableCell></TableRow>
            ) : filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}{!p.is_active && <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>}</TableCell>
                <TableCell>{p.shop_name ?? "—"}</TableCell>
                <TableCell>{p.district ?? "—"}</TableCell>
                <TableCell className="font-mono text-sm">{p.phone ?? "—"}</TableCell>
                <TableCell className="text-right font-mono text-sm">रू {(balances[p.id] || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
