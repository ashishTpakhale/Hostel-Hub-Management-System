import React, { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

interface Timetable {
  id: number;
  route_name: string;
  schedule: string;
}

const BusTimetableView: React.FC = () => {
  const [routes, setRoutes] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/timetable`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load timetable");
        return response.json();
      })
      .then(setRoutes)
      .catch((loadError) => {
        console.error(loadError);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-4 py-8">
      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">Bus Timetable</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">Latest routes published by the hostel administration.</p>
      {loading && <p className="text-center text-sm text-muted-foreground">Loading timetable…</p>}
      {error && <p className="text-center text-sm text-destructive">The timetable could not be loaded. Please try again later.</p>}
      {!loading && !error && !routes.length && <p className="text-center text-sm text-muted-foreground">No bus routes have been published yet.</p>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {routes.map((route) => (
          <article key={route.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{route.route_name}</h2>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
              {route.schedule.split(",").map((time) => time.trim()).filter(Boolean).join("\n") || "Schedule not published yet"}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
};

export default BusTimetableView;
