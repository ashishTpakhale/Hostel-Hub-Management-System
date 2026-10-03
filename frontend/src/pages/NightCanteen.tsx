import { Coffee, Plus, Upload } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Item = { id: number; name: string; price: number; isAvailable: boolean };
type Menu = { id: number; date: string; contributor: string; items: Item[] };
const today = new Date().toISOString().slice(0, 10);

export default function NightCanteen() {
  const { user } = useAuth();
  const [date, setDate] = useState(today);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState<{ name: string; price: number }[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  const loadMenus = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/night-canteen/menus?date=${date}`);
    if (response.ok) setMenus(await response.json());
  }, [date]);
  useEffect(() => { loadMenus(); }, [loadMenus]);

  const addItem = () => {
    const numericPrice = Number(price);
    if (!itemName.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) { setMessage("Enter an item name and valid price."); return; }
    setItems((current) => [...current, { name: itemName.trim(), price: numericPrice }]); setItemName(""); setPrice("");
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!items.length) { setMessage("Add at least one menu item."); return; }
    const form = new FormData(); form.append("date", date); form.append("items", JSON.stringify(items)); if (image) form.append("image", image);
    const response = await fetch(`${API_BASE}/api/night-canteen/contributions`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }, body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(payload.error || "Could not save the draft."); return; }
    const published = await fetch(`${API_BASE}/api/night-canteen/contributions/${payload.id}/publish`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` } });
    if (!published.ok) { setMessage("Draft saved. It can be reviewed and published later."); return; }
    setItems([]); setImage(null); setMessage("Menu published with your contributor attribution."); await loadMenus();
  };
  const updateAvailability = async (item: Item, isAvailable: boolean) => {
    const response = await fetch(`${API_BASE}/api/night-canteen/items/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")}` }, body: JSON.stringify({ isAvailable }) });
    if (response.ok) await loadMenus(); else setMessage("Could not update availability.");
  };
  const canContribute = user?.role === "student" && user.email.endsWith("@iiitn.ac.in");
  const canManage = user?.role === "admin" || user?.role === "nc_manager";

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8"><div><p className="text-sm text-muted-foreground">Public information</p><h1 className="mt-1 flex items-center gap-2 text-3xl font-bold"><Coffee className="h-7 w-7 text-primary" />Night Canteen</h1><p className="mt-2 text-muted-foreground">Today’s published menu and live item availability.</p></div><div className="flex items-center gap-3"><label className="text-sm font-medium">Date <Input className="mt-1 w-auto" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>{message && <p className="rounded-md border bg-secondary p-3 text-sm" role="status">{message}</p>}
    <section className="grid gap-4 md:grid-cols-2">{menus.map((menu) => <Card key={menu.id}><CardHeader><CardTitle className="text-lg">Menu for {menu.date}</CardTitle><p className="text-sm font-normal text-muted-foreground">Contributed by {menu.contributor}</p></CardHeader><CardContent className="space-y-2">{menu.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary/50 p-3"><span><span className="font-medium">{item.name}</span><span className="ml-2 text-sm text-muted-foreground">₹{item.price}</span></span><span className="flex items-center gap-2"><Badge variant={item.isAvailable ? "default" : "destructive"}>{item.isAvailable ? "Available" : "Sold out"}</Badge>{canManage && <Button size="sm" variant="outline" onClick={() => updateAvailability(item, !item.isAvailable)}>{item.isAvailable ? "Mark sold out" : "Mark available"}</Button>}</span></div>)}</CardContent></Card>)}{!menus.length && <p className="text-sm text-muted-foreground">No menu has been published for this date.</p>}</section>
    {canContribute && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Contribute a menu</CardTitle></CardHeader><CardContent><form className="space-y-3" onSubmit={submit}><p className="text-sm text-muted-foreground">Add items manually. A menu photo is optional; manual entry remains available if OCR is unavailable.</p><div className="flex flex-wrap gap-2"><Input className="max-w-xs" placeholder="Item name" value={itemName} onChange={(event) => setItemName(event.target.value)} /><Input className="w-28" type="number" min="0" placeholder="Price" value={price} onChange={(event) => setPrice(event.target.value)} /><Button type="button" variant="outline" onClick={addItem}>Add item</Button></div>{items.map((item, index) => <p key={`${item.name}-${index}`} className="text-sm">{item.name} — ₹{item.price}</p>)}<label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><Upload className="h-4 w-4" />Attach menu photo<Input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /></label>{image && <p className="text-xs text-muted-foreground">{image.name}</p>}<Button type="submit">Confirm and publish</Button></form></CardContent></Card>}
    {user && !canContribute && user.role === "student" && <p className="rounded-md border p-3 text-sm text-muted-foreground">Night Canteen contributions require a verified <code>@iiitn.ac.in</code> student account.</p>}
  </main>;
}
