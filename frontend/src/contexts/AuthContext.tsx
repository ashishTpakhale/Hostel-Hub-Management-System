import React, { createContext, useContext, useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";


interface User {
  id: number;
  name: string;
  email: string;
  role: "student" | "admin" | "worker" | "nc_manager";
  roomNo?: string;
  avatarUrl?: string; // optional avatar url
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: any) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
  refreshProfile: (token?: string) => Promise<void>; // new
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("access_token"));
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("access_token");

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch {
        localStorage.removeItem("user");
      }
    }

    const hydrate = async () => {
      if (savedToken) {
        setToken(savedToken);
        await refreshProfile(savedToken);
      }
      setIsInitializing(false);
    };
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfile = async (tokenToUse?: string) => {
    const authToken = tokenToUse || localStorage.getItem("access_token");
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error("Profile fetch failed");
      const data = await res.json();
      // Map backend fields to our User shape (adjust names as your backend returns)
      const profile: User = {
        id: data.id,
        name: data.name ?? data.full_name ?? "",
        email: data.email,
        role: data.role,
        roomNo: data.roomNo ?? data.room_no ?? "",
        avatarUrl: data.avatarUrl ?? data.avatar_url ?? undefined,
      };
      setUser(profile);
      localStorage.setItem("user", JSON.stringify(profile));
    } catch (err) {
      // silent fail — leave user as-is
      console.error("refreshProfile error:", err);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;

      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      setToken(data.access);
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        await refreshProfile(data.access);
      }

      return true;
    } catch (err) {
      console.error("Login failed:", err);
      return false;
    }
  };

  const signup = async (form: any): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.name,
          email: form.email,
          password: form.password,
          role: form.role || "student",
          roomNo: form.roomNo,
        }),
      });
      if (!res.ok) return false;

      // Signup returns a JWT session, so a new student reaches their dashboard immediately.
      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      setToken(data.access);
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        await refreshProfile(data.access);
      }
      return true;
    } catch (err) {
      console.error("Signup failed:", err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        isInitializing,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
