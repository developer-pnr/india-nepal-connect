import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, X, ShieldCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
const ALL_ROLES: AppRole[] = ["admin", "operator", "viewer"];

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  roles: AppRole[];
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchUsers = async () => {
    const [pRes, rRes] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map: Record<string, AppRole[]> = {};
    (rRes.data ?? []).forEach((r) => {
      if (!map[r.user_id]) map[r.user_id] = [];
      map[r.user_id].push(r.role);
    });
    setUsers((pRes.data ?? []).map((p) => ({
      id: p.id, email: p.email ?? "", full_name: p.full_name ?? "",
      roles: map[p.id] ?? [],
    })));
  };

  useEffect(() => { fetchUsers(); }, []);

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `Granted ${role}` });
    fetchUsers();
  };

  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: `Revoked ${role}` });
    fetchUsers();
  };

  const filtered = users.filter((u) =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users & Roles</h1>
        <p className="text-sm text-muted-foreground">Grant or revoke admin / operator / viewer access</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4" />All Users ({users.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…" className="pl-8 h-9" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead className="w-[160px]">Grant Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
                      {u.roles.map((r) => (
                        <Badge key={r} variant="secondary" className="font-mono text-[10px] uppercase gap-1">
                          {r}
                          <button onClick={() => removeRole(u.id, r)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select onValueChange={(v) => addRole(u.id, v as AppRole)}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Add role" /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.filter((r) => !u.roles.includes(r)).map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Role Reference</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div><Badge variant="secondary" className="font-mono uppercase mr-2">admin</Badge>Full access; manages users, edits anything, sees audit logs.</div>
          <div><Badge variant="secondary" className="font-mono uppercase mr-2">operator</Badge>Day-to-day operations: create/edit transactions, settlements, parties.</div>
          <div><Badge variant="secondary" className="font-mono uppercase mr-2">viewer</Badge>Read-only access to dashboards, statements, ledgers.</div>
        </CardContent>
      </Card>
    </div>
  );
}
