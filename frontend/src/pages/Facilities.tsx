import { Building2, CircleDot, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FacilityStatus = "Available" | "Occupied" | "Closed" | "Maintenance";
type Facility = { id: number; name: string; location: string; status: FacilityStatus; updatedAt: string };

const statuses: FacilityStatus[] = ["Available", "Occupied", "Closed", "Maintenance"];
const badgeVariant = (status: FacilityStatus) => ({
  Available: "default", Occupied: "secondary", Closed: "outline", Maintenance: "destructive",
}[status] as "default" | "secondary" | "outline" | "destructive");

export default function Facilities() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/facilities`);
      if (!response.ok) throw new Error("Could not load facilities");
      setFacilities(await response.json());
    } catch (error) {
      console.error(error);
      setMessage("Facility availability could not be loaded. Please try again shortly.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFacilities(); }, [loadFacilities]);

  const updateStatus = async (facilityId: number, status: FacilityStatus) => {
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE}/api/facilities/${facilityId}`, {
      method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(payload.error || "Facility status could not be updated."); return; }
    setFacilities((current) => current.map((facility) => facility.id === facilityId ? payload : facility));
    setMessage(`${payload.name} is now marked ${payload.status}.`);
  };

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <div><p className="text-sm text-muted-foreground">Public information</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-bold"><Building2 className="h-7 w-7 text-primary" />Hostel facilities</h1><p className="mt-2 max-w-2xl text-muted-foreground">Check the latest published status before going. Availability is updated by hostel administration.</p></div>
    {message && <p className="rounded-md border bg-secondary p-3 text-sm" role="status">{message}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading facility status…</p> : <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {facilities.map((facility) => <Card key={facility.id}><CardHeader className="space-y-2"><div className="flex items-start justify-between gap-3"><CardTitle className="text-lg">{facility.name}</CardTitle><Badge variant={badgeVariant(facility.status)}>{facility.status}</Badge></div><p className="flex items-center gap-1 text-sm font-normal text-muted-foreground"><MapPin className="h-4 w-4" />{facility.location}</p></CardHeader><CardContent className="space-y-3"><p className="flex items-center gap-2 text-xs text-muted-foreground"><CircleDot className="h-3.5 w-3.5" />Last updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(facility.updatedAt))}</p>{user?.role === "admin" && <label className="block text-sm font-medium">Update status<select aria-label={`Update ${facility.name} status`} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={facility.status} onChange={(event) => updateStatus(facility.id, event.target.value as FacilityStatus)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>}</CardContent></Card>)}
    </section>}
  </main>;
}
