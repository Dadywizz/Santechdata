import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Copy, Trash2, Plus, Loader2, Eye, EyeOff, Code2 } from "lucide-react";
import { format } from "date-fns";

const tok = () => sessionStorage.getItem("santech_token") ?? "";

type ApiKey = {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  totalRequests: number;
  lastUsedAt: string | null;
  createdAt: string;
};

async function fetchMyKeys(): Promise<ApiKey[]> {
  const res = await fetch("/api/user/api-keys", {
    headers: { Authorization: `Bearer ${tok()}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function createMyKey(name: string): Promise<ApiKey> {
  const res = await fetch("/api/user/api-keys", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}` },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to create key");
  return data;
}

async function deleteMyKey(id: string): Promise<void> {
  const res = await fetch(`/api/user/api-keys/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tok()}` },
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Failed to delete key");
  }
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await fetchMyKeys());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!name.trim()) { toast({ title: "Enter a key name", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const created = await createMyKey(name.trim());
      setNewKey(created.key);
      setName("");
      setShowForm(false);
      setKeys((prev) => [created, ...prev]);
      toast({ title: "API key created", description: "Copy and save the key — it won't be shown again." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this API key? All integrations using it will stop working.")) return;
    setDeleting(id);
    try {
      await deleteMyKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: "API key deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  function copy(text: string, label = "Copied!") {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: label })
    );
  }

  function maskKey(key: string) {
    return key.slice(0, 10) + "••••••••••••••••••••" + key.slice(-4);
  }

  return (
    <AppLayout>
      <PageHeader title="API Keys" subtitle="Integrate SanTech Data services into your own apps" />

      {/* New key revealed */}
      {newKey && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-green-700 mb-1">🎉 New API Key Created — Copy it now!</p>
            <p className="text-xs text-green-600 mb-3">This key is only shown once. Store it safely.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-green-200 rounded-lg px-3 py-2 text-xs font-mono break-all text-slate-800">{newKey}</code>
              <Button size="sm" variant="outline" className="shrink-0 border-green-300 text-green-700" onClick={() => copy(newKey, "Key copied!")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2 text-green-600 text-xs" onClick={() => setNewKey(null)}>
              I've saved it — dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card className="mb-6 bg-slate-900 text-white border-0">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <Code2 className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-1">Developer API Access</p>
              <p className="text-xs text-slate-400 mb-3">Use your API key to buy data, airtime and check your balance programmatically from your own website or app.</p>
              <div className="bg-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-green-400 space-y-1">
                <p>GET /api/v1/balance</p>
                <p>GET /api/v1/plans?network=MTN</p>
                <p>POST /api/v1/data/purchase</p>
                <p>POST /api/v1/airtime/purchase</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">Pass your key as: <code className="text-blue-300">Authorization: Bearer sk_live_...</code></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create key */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Your API Keys ({keys.length}/3)</p>
        {!showForm && keys.length < 3 && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create Key
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <Label className="text-sm font-semibold text-slate-700 mb-1 block">Key Name</Label>
            <p className="text-xs text-slate-500 mb-2">Give it a name so you remember what it's for (e.g. "My Website", "Bot")</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. My Website"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="flex-1"
                maxLength={50}
              />
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setName(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <KeyRound className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No API keys yet</p>
            <p className="text-slate-400 text-sm mb-4">Create a key to start integrating SanTech Data into your app</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create your first key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <Card key={k.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{k.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={k.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {k.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-[11px] text-slate-400">{k.totalRequests} requests</span>
                        {k.lastUsedAt && (
                          <span className="text-[11px] text-slate-400">· Last used {format(new Date(k.lastUsedAt), "dd MMM")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-500"
                      onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))}
                      title={revealed[k.id] ? "Hide key" : "Reveal key"}
                    >
                      {revealed[k.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-500"
                      onClick={() => copy(k.key, "Key copied!")}
                      title="Copy key"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(k.id)}
                      disabled={deleting === k.id}
                      title="Delete key"
                    >
                      {deleting === k.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <code className="block w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 break-all">
                    {revealed[k.id] ? k.key : maskKey(k.key)}
                  </code>
                  <p className="text-[10px] text-slate-400 mt-1">Created {format(new Date(k.createdAt), "dd MMM yyyy")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
