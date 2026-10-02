import { Star, Utensils } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MealMenu = { id: number; date: string; mealType: string; menuText: string; averageRating: number | null; ratingCount: number };
const mealTypes = ["breakfast", "lunch", "snacks", "dinner"];
const today = new Date().toISOString().slice(0, 10);

export default function Mess() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealMenu[]>([]);
  const [history, setHistory] = useState<MealMenu[]>([]);
  const [ratedMealIds, setRatedMealIds] = useState<Set<number>>(new Set());
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ date: today, mealType: "breakfast", menuText: "" });

  const loadMeals = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [dailyResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE}/api/mess/daily?date=${selectedDate}`),
        fetch(`${API_BASE}/api/mess/ratings/history?days=7`),
      ]);
      if (!dailyResponse.ok || !historyResponse.ok) throw new Error("Could not load mess information");
      setMeals(await dailyResponse.json());
      setHistory(await historyResponse.json());
    } catch (error) {
      console.error(error);
      setMessage("Mess information could not be loaded. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  const rateMeal = async (mealId: number, rating: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const response = await fetch(`${API_BASE}/api/mess/daily/${mealId}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rating }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "Your rating could not be saved.");
      return;
    }
    setRatedMealIds((ids) => new Set(ids).add(mealId));
    setMeals((current) => current.map((meal) => meal.id === mealId ? payload : meal));
    setHistory((current) => current.map((meal) => meal.id === mealId ? payload : meal));
  };

  const publishMeal = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem("access_token");
    const response = await fetch(`${API_BASE}/api/mess/daily`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "The meal could not be published.");
      return;
    }
    setForm((current) => ({ ...current, menuText: "" }));
    setSelectedDate(form.date);
    setMessage("Meal published.");
    await loadMeals();
  };

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <div><p className="text-sm text-muted-foreground">Public information</p><h1 className="flex items-center gap-2 text-3xl font-bold"><Utensils className="h-7 w-7 text-primary" />Mess menu & ratings</h1><p className="mt-2 text-muted-foreground">See what is being served and rate a meal once after you have eaten it.</p></div>
    {message && <p className="rounded-md border bg-secondary p-3 text-sm" role="status">{message}</p>}

    {user?.role === "admin" && <Card><CardHeader><CardTitle>Publish today’s meal</CardTitle></CardHeader><CardContent><form onSubmit={publishMeal} className="grid gap-3 md:grid-cols-4"><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /><select className="rounded-md border bg-background px-3" value={form.mealType} onChange={(event) => setForm({ ...form, mealType: event.target.value })}>{mealTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select><Textarea className="md:col-span-2" placeholder="Example: Dal, rice, salad" value={form.menuText} onChange={(event) => setForm({ ...form, menuText: event.target.value })} required /><Button type="submit" className="md:col-span-4 md:w-fit">Publish meal</Button></form></CardContent></Card>}

    <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Meals for {selectedDate}</h2><Input className="w-auto" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></div>{loading ? <p className="text-sm text-muted-foreground">Loading meals…</p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{meals.map((meal) => <Card key={meal.id}><CardHeader><CardTitle className="text-lg capitalize">{meal.mealType}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="min-h-10 text-sm text-muted-foreground">{meal.menuText}</p><p className="text-sm"><strong>{meal.averageRating ?? "—"}</strong> / 5 · {meal.ratingCount} rating{meal.ratingCount === 1 ? "" : "s"}</p>{user?.role === "student" && !ratedMealIds.has(meal.id) && <div className="flex gap-1" aria-label={`Rate ${meal.mealType}`}>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" className="rounded p-1 text-primary hover:bg-secondary" aria-label={`${rating} stars`} onClick={() => rateMeal(meal.id, rating)}><Star className="h-5 w-5" /></button>)}</div>}{user?.role === "student" && ratedMealIds.has(meal.id) && <p className="text-sm text-muted-foreground">Thanks for your rating.</p>}{!user && <Link className="text-sm font-medium text-primary hover:underline" to="/login">Log in to rate</Link>}</CardContent></Card>)}{!meals.length && <Card className="md:col-span-2 lg:col-span-4"><CardContent className="py-8 text-center text-sm text-muted-foreground">No dated meals have been published for this day yet.</CardContent></Card>}</div>}</section>

    <section><h2 className="mb-3 text-xl font-semibold">Recent rating history</h2><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{history.map((meal) => <Card key={meal.id}><CardContent className="flex items-center justify-between p-4"><div><p className="font-medium capitalize">{meal.mealType}</p><p className="text-sm text-muted-foreground">{meal.date}</p></div><p className="text-sm"><strong>{meal.averageRating ?? "—"}</strong> / 5</p></CardContent></Card>)}{!history.length && <p className="text-sm text-muted-foreground">No ratings have been collected in the last seven days.</p>}</div></section>
  </main>;
}
