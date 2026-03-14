import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  roles: AppRole[];
}

export default function Admin() {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, email, full_name");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");

      const roleMap: Record<string, AppRole[]> = {};
      (roles ?? []).forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      setUsers((profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email ?? "",
        full_name: p.full_name ?? "",
        roles: roleMap[p.id] ?? [],
      })));
    };

    const fetchLogs = async () => {
      const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
      setAuditLogs(data ?? []);
    };

    fetchUsers();
    fetchLogs();
  }, []);

  const assignRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").upsert(
      { user_id: userId, role },
      { onConflict: "user_id,role" }
    );
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Role ${role} assigned` });
    // Refresh
    window.location.reload();
  };

  if (!hasRole("admin")) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">User management & audit trail</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Team Members</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Assign Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {u.roles.map((r) => (
                            <span key={r} className="font-mono text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">{r}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select onValueChange={(v) => assignRole(u.id, v as AppRole)}>
                          <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Add role" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="operator">Operator</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No audit logs yet</TableCell></TableRow>
                  ) : auditLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                      <TableCell><span className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{l.action}</span></TableCell>
                      <TableCell className="text-sm">{l.entity}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{l.entity_id?.slice(0, 8) ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
