import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  KeyRound, Copy, Trash2, Power, PowerOff, Loader2, RefreshCw, Plus, X,
} from "lucide-react";
import { format } from "date-fns";

const tok = () => sessionStorage.getItem("santech_token") ?? "";

type ApiKey = {
  id: string;
  userId: string;
  name: string;
  key: string;
  isActive: boolean;
  totalRequests: number;
  lastUsedAt: string | null;
  createdAt: string;
  user: { fullName: string | null; email: string | null } | null;
};

async function fetchKeys(): Promise<ApiKey[]> {
  const res = await fetch("/api/admin/api-keys", { headers: { Authorization: `Bearer ${tok()}` } });
  if (!res.ok) return [];
  return res.json();
}

async function fetchUsers() {
  const res = await fetch("/api/admin/users?limit=200", { headers: { Authorization: `Bearer ${tok()}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? data.users ?? [];
}

async function createKey(userId: string, name: string): Promise<ApiKey | null> {
  const res = await fetch("/api/admin/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
    body: JSON.stringify({ userId, name }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to create API key");
  }
  return res.json();
}

async function toggleKey(id: string, isActive: boolean): Promise<void> {
  await fetch(`/api/admin/api-keys/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
    body: JSON.stringify({ isActive }),
  });
}

async function deleteKey(id: string): Promise<void> {
  await fetch(`/api/admin/api-keys/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tok()}` },
  });
}

export default function AdminApiKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [k, u] = await Promise.all([fetchKeys(), fetchUsers()]);
    setKeys(k);
    setUsers(u);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: "Copied!", description: "API key copied to clipboard." })
    );
  };

  const handleCreate = async () => {
    if (!newUserId || !newName.trim()) {
      toast({ title: "Missing fields", description: "Please select a user and enter a key name.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await createKey(newUserId, newName.trim());
      if (created) {
        setNewlyCreatedKey(created.key);
        setKeys(prev => [created, ...prev]);
        setNewName("");
        setNewUserId("");
        setShowCreate(false);
        toast({ title: "API Key Created", description: "Save the key — it won't be shown again in full." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleToggle = async (key: ApiKey) => {
    setActioning(key.id);
    await toggleKey(key.id, !key.isActive);
    setKeys(prev => prev.map(k => k.id === key.id ? { ...k, isActive: !key.isActive } : k));
    setActioning(null);
    toast({ title: key.isActive ? "Key Disabled" : "Key Enabled", description: `"${key.name}" has been ${key.isActive ? "disabled" : "enabled"}.` });
  };

  const handleDelete = async (key: ApiKey) => {
    if (!confirm(`Delete API key "${key.name}"? This cannot be undone.`)) return;
    setActioning(key.id);
    await deleteKey(key.id);
    setKeys(prev => prev.filter(k => k.id !== key.id));
    setActioning(null);
    toast({ title: "Key Deleted", description: `"${key.name}" has been permanently deleted.` });
  };

  const maskKey = (key: string) => key.slice(0, 12) + "••••••••••••" + key.slice(-4);

  return (
    <AdminLayout>
      <PageHeader title="API Keys" subtitle="Manage developer API access for clients and resellers" />

      <div className="p-4 md:p-6 space-y-4">

        {/* Newly Created Key Alert */}
        {newlyCreatedKey && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-semibold text-green-800 mb-1">✅ New API Key — Copy it now!</p>
                <p className="text-green-700 text-sm mb-2">This key will not be shown in full again. Make sure the client saves it.</p>
                <code className="block bg-white border border-green-300 rounded-lg p-2 text-xs font-mono text-green-900 break-all">
                  {newlyCreatedKey}
                </code>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setNewlyCreatedKey(null)}><X className="h-4 w-4" /></Button>
            </div>
            <Button size="sm" className="mt-3 bg-green-600 hover:bg-green-700 text-white" onClick={() => copy(newlyCreatedKey)}>
              <Copy className="h-3 w-3 mr-1" /> Copy Key
            </Button>
          </div>
        )}

        {/* Create Form */}
        {showCreate ? (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <p className="font-semibold text-gray-800">Create New API Key</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Select Client User</Label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newUserId}
                    onChange={e => setNewUserId(e.target.value)}
                  >
                    <option value="">— Select user —</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Key Name / Label</Label>
                  <Input
                    placeholder="e.g. MyVTUSite Production"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                  Generate Key
                </Button>
                <Button variant="ghost" onClick={() => { setShowCreate(false); setNewName(""); setNewUserId(""); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{keys.length} API key{keys.length !== 1 ? "s" : ""} total</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" /> New API Key
              </Button>
            </div>
          </div>
        )}

        {/* Keys List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <KeyRound className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No API keys yet</p>
            <p className="text-sm">Create one for a client or developer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map(k => (
              <Card key={k.id} className={`${!k.isActive ? "opacity-60" : ""}`}>
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <KeyRound className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-800">{k.name}</span>
                        <Badge variant={k.isActive ? "default" : "secondary"} className={k.isActive ? "bg-green-100 text-green-700" : ""}>
                          {k.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {k.user?.fullName ?? "Unknown"} &bull; {k.user?.email ?? ""}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 rounded px-2 py-0.5 font-mono text-gray-700">
                          {maskKey(k.key)}
                        </code>
                        <button
                          onClick={() => copy(k.key)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Copy full key"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {k.totalRequests.toLocaleString()} requests &bull; Created {format(new Date(k.createdAt), "dd MMM yyyy")}
                        {k.lastUsedAt ? ` · Last used ${format(new Date(k.lastUsedAt), "dd MMM yyyy")}` : " · Never used"}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm" variant="outline"
                        disabled={actioning === k.id}
                        onClick={() => handleToggle(k)}
                        className={k.isActive ? "border-orange-300 text-orange-600 hover:bg-orange-50" : "border-green-300 text-green-600 hover:bg-green-50"}
                      >
                        {actioning === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : k.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        <span className="ml-1">{k.isActive ? "Disable" : "Enable"}</span>
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        disabled={actioning === k.id}
                        onClick={() => handleDelete(k)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* API Docs Card */}
        <Card className="bg-blue-50 border-blue-200 mt-6">
          <CardContent className="pt-5">
            <p className="font-semibold text-blue-800 mb-2">📡 API Base URL</p>
            <code className="block bg-white border border-blue-200 rounded-lg p-3 text-sm font-mono text-blue-900 mb-3">
              {window.location.origin}/api
            </code>
            <p className="text-blue-700 text-sm font-medium mb-2">Available Endpoints:</p>
            <ul className="text-sm text-blue-700 space-y-1 font-mono">
              <li>GET &nbsp;/v1/balance — wallet balance</li>
              <li>GET &nbsp;/v1/plans?network=MTN — data plans</li>
              <li>POST /v1/data/purchase — buy data</li>
              <li>POST /v1/airtime/purchase — buy airtime</li>
              <li>GET &nbsp;/v1/transactions — recent transactions</li>
            </ul>
            <p className="text-blue-600 text-xs mt-3">
              Authenticate with: <code className="bg-white px-1 rounded">Authorization: Bearer sk_live_...</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
