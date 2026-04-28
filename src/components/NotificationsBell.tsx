import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function NotificationsBell() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications" as any).select("*").or(`user_id.eq.${user.id},user_id.is.null`).order("created_at", { ascending: false }).limit(20);
    setNotes((data as any) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("notif").on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const unread = notes.filter(n => !n.is_read).length;

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications" as any).update({ is_read: true }).or(`user_id.eq.${user.id},user_id.is.null`).eq("is_read", false);
    load();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-mono text-destructive-foreground flex items-center justify-center">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && <Button variant="ghost" size="sm" className="text-xs h-6" onClick={markAll}>Mark all read</Button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notes.length === 0 ? <div className="p-6 text-center text-xs text-muted-foreground">No notifications</div> :
            notes.map(n => (
              <div key={n.id} className={`p-3 border-b last:border-0 text-sm ${!n.is_read ? "bg-muted/40" : ""}`}>
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
