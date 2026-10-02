import { Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProfileAvatar from "./ProfileAvatar";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`;

export default function Header() {
  const { isAuthenticated, isInitializing } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const navigation = <>
    <NavLink to="/" end className={linkClass} onClick={closeMenu}>Today</NavLink>
    <NavLink to="/bus-timetable" className={linkClass} onClick={closeMenu}>Timetable</NavLink>
    {isAuthenticated && <NavLink to="/dashboard" className={linkClass} onClick={closeMenu}>Dashboard</NavLink>}
  </>;

  return <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
      <Link to="/" className="flex items-center gap-2 font-semibold text-foreground" onClick={closeMenu}><Building2 className="h-5 w-5 text-primary" />Hostel Hub</Link>
      <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">{navigation}</nav>
      <div className="hidden items-center gap-2 md:flex">
        {!isInitializing && (isAuthenticated ? <ProfileAvatar /> : <><NavLink to="/login" className={linkClass}>Log in</NavLink><NavLink to="/signup" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Join</NavLink></>)}
      </div>
      <button type="button" className="rounded-md p-2 hover:bg-secondary md:hidden" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
    </div>
    {menuOpen && <div className="border-t px-4 py-3 md:hidden"><nav className="flex flex-col gap-1" aria-label="Mobile navigation">{navigation}{!isInitializing && !isAuthenticated && <><NavLink to="/login" className={linkClass} onClick={closeMenu}>Log in</NavLink><NavLink to="/signup" className={linkClass} onClick={closeMenu}>Join Hostel Hub</NavLink></>}</nav></div>}
  </header>;
}
