// AdminAnalytics.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { API_BASE } from '@/lib/api';

type AnalyticsResponse = {
  totals: {
    users: number;
    students: number;
    staff: number;
    workers: number;
    open_issues: number;
    inprogress_issues: number;
    resolved_issues: number;
    notices: number;
    doctors: number;
    doctors_available_today: number;
    student_medical_records: number;
  };

  series: {
    issues_last_30_days: { date: string; count: number }[];
    notices_last_12_months: { month: string; count: number }[];
    issues_by_status: { status: string; count: number }[];
    top_reporters: { reporter: string; count: number }[];
  };
};

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_BASE}/api/analytics`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (!mounted) return;
        setData(payload);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || 'Failed to load analytics');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-6"><Loader2 /> Loading analytics...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return null;

  const { totals, series } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Analytics</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.users}</div>
            <div className="text-sm text-muted">Students: {totals.students} • Staff: {totals.staff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.open_issues + totals.inprogress_issues + totals.resolved_issues}</div>
            <div className="text-sm text-muted">Open: {totals.open_issues} • In Progress: {totals.inprogress_issues} • Resolved: {totals.resolved_issues}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.notices}</div>
            <div className="text-sm text-muted">Created notices</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.doctors}</div>
            <div className="text-sm text-muted">Available today: {totals.doctors_available_today}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="h-96">
          <CardHeader>
            <CardTitle>Issues — Last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series.issues_last_30_days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Issues" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="h-96">
          <CardHeader>
            <CardTitle>Issues by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.issues_by_status}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top reporters</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              {series.top_reporters.map((r) => (
                <li key={r.reporter}>{r.reporter} — {r.count}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notices — last 12 months</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series.notices_last_12_months}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Notices" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
