import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Analytics = { marketplace: { listed: number; sold: number; givenAway: number; totalSales: number }; nightCanteenContributions: number; recentTransactions: { id: number; title: string; status: string; price: number }[] };
export default function Profile() {
  const [data, setData] = useState<Analytics | null>(null);
  useEffect(() => { fetch(`${API_BASE}/api/profile/analytics`, { headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } }).then((r) => r.ok ? r.json() : null).then(setData).catch(() => setData(null)); }, []);
  if (!data) return <main className="mx-auto max-w-5xl p-8 text-sm text-muted-foreground">Loading your private activity…</main>;
  const stats = [["Listings", data.marketplace.listed], ["Sold", data.marketplace.sold], ["Given away", data.marketplace.givenAway], ["Sales total", `₹${data.marketplace.totalSales}`], ["NC contributions", data.nightCanteenContributions]];
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8"><div><p className="text-sm text-muted-foreground">Private profile</p><h1 className="text-3xl font-bold">Your activity</h1></div><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{stats.map(([label, value]) => <Card key={String(label)}><CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{value}</CardContent></Card>)}</section><Card><CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader><CardContent>{data.recentTransactions.length ? data.recentTransactions.map((x) => <p key={x.id} className="border-b py-2 text-sm last:border-0">{x.title} — {x.status === "sold" ? `₹${x.price}` : "Given away"}</p>) : <p className="text-sm text-muted-foreground">No completed transactions yet.</p>}</CardContent></Card></main>;
}
