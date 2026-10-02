import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter as HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { lazy, Suspense, useEffect, useState } from "react";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import Header from "@/components/ui/Header";

// ✅ Added imports for bus timetable pages
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const RepairerDashboard = lazy(() => import("./pages/RepairerDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BusTimetableView = lazy(() => import("@/components/BusTimetableView"));
const BusTimetableAdmin = lazy(() => import("@/components/BusTimetableAdmin"));
const Medical = lazy(() => import("./pages/Medical"));

const queryClient = new QueryClient();

const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) => {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timeout);
  }, [user]);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !allowedRoles.includes(user.role))
    return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case "student":
      return <StudentDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "worker":
      return <RepairerDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const App = () => {
  return (
    <HashRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DataProvider>
            <TooltipProvider>
              <Header />
              <Toaster />
              <Sonner />
              <Suspense fallback={<div className="grid min-h-screen place-items-center">Loading…</div>}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute
                      allowedRoles={["student", "admin", "worker"]}
                    >
                      <DashboardRouter />
                    </ProtectedRoute>
                  }
                />

                <Route path="/bus-timetable" element={<BusTimetableView />} />
                <Route
                  path="/admin/bus-timetable"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <BusTimetableAdmin />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/medical"
                  element={
                    <ProtectedRoute allowedRoles={["student", "admin"]}>
                      <Medical />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </TooltipProvider>
          </DataProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HashRouter>
  );
};

export default App;
