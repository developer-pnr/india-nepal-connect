import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Sender = Database["public"]["Tables"]["senders"]["Row"];

export default function Senders() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sender | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", worker_id: "", bank_account: "", notes: "" });
  const { toast } = useToast();

  const fetchSenders = async () => {
    const { data } = await supabase.from("senders").select("*").order("created_at", { ascending: false });
    setSenders(data ?? []);
  };

  useEffect(() => { fetchSenders(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }

    if (editing) {
      const { error } = await supabase.from("senders").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("senders").insert(form);
      if (error) { toast({ title: "Insert failed", description: error.message, variant: "destructive" }); return; }
    }

    setOpen(false);
    setEditing(null);
    setForm({ name: "", phone: "", address: "", worker_id: "", bank_account: "", notes: "" });
    fetchSenders();
    toast({ title: editing ? "Sender updated" : "Sender added" });
  };

  const openEdit = (s: Sender) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? "", address: s.address ?? "", worker_id: s.worker_id ?? "", bank_account: s.bank_account ?? "", notes: s.notes ?? "" });
    setOpen(true);
  };

  const filtered = senders.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) ||
    s.worker_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Senders</h1>
          <p className="text-sm text-muted-foreground">{senders.length} workers registered</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", phone: "", address: "", worker_id: "", bank_account: "", notes: "" }); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Sender</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Sender" : "Add Sender"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Worker ID</Label><Input value={form.worker_id} onChange={(e) => setForm({ ...form, worker_id: e.target.value })} /></div>
              <div><Label>Bank Account</Label><Input value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, phone, worker ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Worker ID</TableHead>
              <TableHead>Address</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No senders found</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="font-mono text-sm">{s.phone ?? "—"}</TableCell>
                <TableCell className="font-mono text-sm">{s.worker_id ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.address ?? "—"}</TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {senders.length} senders</p>
    </div>
  );
}
