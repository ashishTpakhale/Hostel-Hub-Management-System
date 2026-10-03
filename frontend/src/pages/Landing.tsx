import { Building2, Bus, Coffee, DoorOpen, HeartPulse, Megaphone, Utensils } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Notice = { id: number; title: string; content: string; createdAt: string };
type MessItem = { id: number; day: string; breakfast: string; lunch: string; snacks: string; dinner: string };
type Timetable = { id: number; route_name: string; schedule: string };
type Doctor = { id: number; name: string; available_today: boolean; arrival_time: string | null; leave_time: string | null };
type Facility = { id: number; name: string; location: string; status: "Available" | "Occupied" | "Closed" | "Maintenance" };

const mealLabels = ["Breakfast", "Lunch", "Snacks", "Dinner"] as const;
const mealKeys = ["breakfast", "lunch", "snacks", "dinner"] as const;

const fetchPublicList = async <T,>(path: string): Promise<T[]> => {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json() as Promise<T[]>;
};

const Landing = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [messItems, setMessItems] = useState<MessItem[]>([]);
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPublicDashboard = async () => {
      try {
        const results = await Promise.allSettled([
          fetchPublicList<Notice>("/api/notices"),
          fetchPublicList<MessItem>("/api/mess"),
          fetchPublicList<Timetable>("/api/timetable"),
          fetchPublicList<Doctor>("/api/medical/doctors"),
          fetchPublicList<Facility>("/api/facilities"),
        ]);
        const [noticesResult, messResult, timetableResult, doctorsResult, facilitiesResult] = results;
        if (noticesResult.status === "fulfilled") setNotices(noticesResult.value);
        if (messResult.status === "fulfilled") setMessItems(messResult.value);
        if (timetableResult.status === "fulfilled") setTimetables(timetableResult.value);
        if (doctorsResult.status === "fulfilled") setDoctors(doctorsResult.value);
        if (facilitiesResult.status === "fulfilled") setFacilities(facilitiesResult.value);
        if (results.some((result) => result.status === "rejected")) {
          setError(true);
          console.error("One or more public dashboard requests failed", results);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPublicDashboard();
  }, []);

  const todayName = useMemo(() => new Intl.DateTimeFormat("en-IN", { weekday: "long" }).format(new Date()), []);
  const todayMenu = messItems.find((item) => item.day === todayName);
  const availableDoctors = doctors.filter((doctor) => doctor.available_today);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:py-12">
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 px-6 py-10 text-primary-foreground md:px-10">
        <div className="flex items-start gap-4"><Building2 className="mt-1 h-8 w-8 shrink-0" /><div><p className="text-sm font-medium opacity-90">IIIT Nagpur hostel life, in one place</p><h1 className="mt-1 text-3xl font-bold md:text-4xl">Today at Hostel Hub</h1><p className="mt-3 max-w-2xl text-primary-foreground/90">Check meals, notices, transport, and medical availability without signing in. Sign in only when you need to contribute or manage something personal.</p></div></div>
      </section>

      {loading && <p className="text-sm text-muted-foreground">Loading today’s hostel information…</p>}
      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">Some public information could not be loaded. Please try again shortly.</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Utensils className="h-5 w-5 text-primary" />{todayName}’s mess menu</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{mealKeys.map((key, index) => <div key={key} className="rounded-md bg-secondary/60 p-3"><p className="text-sm font-medium">{mealLabels[index]}</p><p className="mt-1 text-sm text-muted-foreground">{todayMenu?.[key] || "Menu not published yet"}</p></div>)}<Link to="/mess" className="text-sm font-medium text-primary hover:underline sm:col-span-2">View menus and ratings →</Link></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary" />Medical availability</CardTitle></CardHeader><CardContent className="space-y-3">{availableDoctors.length ? availableDoctors.map((doctor) => <div key={doctor.id} className="rounded-md bg-secondary/60 p-3 text-sm"><p className="font-medium">{doctor.name}</p><p className="text-muted-foreground">Available today{doctor.arrival_time && doctor.leave_time ? ` · ${doctor.arrival_time}–${doctor.leave_time}` : ""}</p></div>) : <p className="text-sm text-muted-foreground">No doctor availability has been posted for today.</p>}</CardContent></Card>
      </section>

      <section aria-label="Daily hostel status" className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Coffee className="h-5 w-5 text-primary" />Night Canteen</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">See today’s menu, contributor attribution, and sold-out updates.</p><Link to="/night-canteen" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">View Night Canteen →</Link></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DoorOpen className="h-5 w-5 text-primary" />Facilities</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{facilities.length ? `${facilities.filter((facility) => facility.status === "Available").length} of ${facilities.length} facilities currently marked available` : "Facility availability has not been published yet."}</p><Link to="/facilities" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">View facility status →</Link></CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Latest notices</CardTitle></CardHeader><CardContent className="space-y-3">{notices.slice(0, 3).map((notice) => <article key={notice.id} className="border-b pb-3 last:border-0 last:pb-0"><p className="font-medium">{notice.title}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notice.content}</p></article>)}{!notices.length && !loading && <p className="text-sm text-muted-foreground">No notices have been published.</p>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bus className="h-5 w-5 text-primary" />Bus timetable</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{timetables.length ? `${timetables.length} route${timetables.length === 1 ? "" : "s"} published` : "No routes published yet"}</p><Link to="/bus-timetable" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">View timetable →</Link></CardContent></Card>
      </section>
    </main>
  );
};

export default Landing;
