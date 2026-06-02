import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetRevenueAnalytics, getGetRevenueAnalyticsQueryKey, useGetServiceAnalytics, getGetServiceAnalyticsQueryKey } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: ₦{Number(p.value).toLocaleString()}</p>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("daily");

  const { data: revenueData = [], isLoading: revLoading } = useGetRevenueAnalytics(
    { period: period as any },
    { query: { queryKey: getGetRevenueAnalyticsQueryKey({ period: period as any }) } }
  );

  const { data: serviceData = [], isLoading: svcLoading } = useGetServiceAnalytics({
    query: { queryKey: getGetServiceAnalyticsQueryKey() }
  });

  const revenue = revenueData as any[];
  const services = serviceData as any[];

  const totalRevenue = revenue.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalProfit = revenue.reduce((s, r) => s + (r.profit || 0), 0);

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Analytics" description="Business performance insights" />
        <Button variant="outline" size="sm" asChild>
          <a href="/api/admin/export/transactions.csv" download>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Period Revenue</p>
            <p className="text-2xl font-bold mt-1">₦{totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Estimated Profit (5%)</p>
            <p className="text-2xl font-bold mt-1 text-green-600">₦{totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary" size={18} />
            <CardTitle className="text-base">Revenue Over Time</CardTitle>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  period === p.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {revLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">Loading chart...</div>
          ) : revenue.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No data available yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <PieChartIcon className="text-primary" size={18} />
            <CardTitle className="text-base">Revenue by Service</CardTitle>
          </CardHeader>
          <CardContent>
            {svcLoading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : services.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={services}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="revenue"
                    nameKey="service"
                    paddingAngle={3}
                  >
                    {services.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `₦${Number(v).toLocaleString()}`} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Service Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">No data yet</div>
            ) : (
              <div className="space-y-3 mt-1">
                {services.map((svc: any, i: number) => (
                  <div key={svc.service}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium capitalize">{svc.service}</span>
                      <span className="text-sm text-muted-foreground">{svc.percentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${svc.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs text-muted-foreground">{svc.count} transactions</span>
                      <span className="text-xs text-muted-foreground">₦{Number(svc.revenue).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
