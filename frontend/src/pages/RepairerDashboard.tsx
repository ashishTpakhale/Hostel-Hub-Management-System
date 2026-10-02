import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import {
  Wrench,
  LogOut,
  ClipboardList,
  CheckCircle,
  Loader2,
  Clock,
  Eye,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IssueModal } from "@/components/IssueModal";


interface Issue {
  id: number;
  title: string;
  description: string;
  roomNumber: string;
  status: "Pending" | "In Progress" | "Resolved";
  createdBy: string;
  createdAt: string;
}

const RepairerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Issue["status"]>("all");

  useEffect(() => {
    const fetchMyIssues = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/my-issues`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch issues");
        const data = await res.json();
        setIssues(data);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error loading issues",
          description: "Could not fetch assigned issues.",
          variant: "destructive",
        });
      }
    };
    fetchMyIssues();
  }, []);

  const filteredIssues =
    statusFilter === "all"
      ? issues
      : issues.filter((i) => i.status === statusFilter);

  const handleStatusChange = async (issueId: number, newStatus: Issue["status"]) => {
    try {
      const res = await fetch(`${API_BASE}/api/issues/${issueId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");

      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
      );

      toast({
        title: "Status Updated",
        description: `Issue marked as ${newStatus}`,
      });
    } catch {
      toast({
        title: "Error updating status",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Worker Dashboard</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <ProfileAvatar />
          </div>
        </div>
      </header>

      <nav className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-2">
            <Button variant="default" className="gap-2">
              <ClipboardList className="h-4 w-4" /> My Assigned Issues
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList className="bg-gray-100 dark:bg-gray-800 rounded-md">
            <TabsTrigger value="all">All ({issues.length})</TabsTrigger>
            <TabsTrigger value="Pending">
              Pending ({issues.filter((i) => i.status === "Pending").length})
            </TabsTrigger>
            <TabsTrigger value="In Progress">
              In Progress ({issues.filter((i) => i.status === "In Progress").length})
            </TabsTrigger>
            <TabsTrigger value="Resolved">
              Resolved ({issues.filter((i) => i.status === "Resolved").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-6">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" /> Assigned Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {filteredIssues.length === 0 ? (
                    <div className="py-12 text-center text-gray-600 dark:text-gray-400">
                      No issues assigned to you
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIssues.map((issue) => (
                          <TableRow key={issue.id}>
                            <TableCell>{issue.id}</TableCell>
                            <TableCell>{issue.title}</TableCell>
                            <TableCell>{issue.roomNumber}</TableCell>
                            <TableCell>{issue.createdBy}</TableCell>
                            <TableCell>
                              {new Date(issue.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {issue.status === "Resolved" ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : issue.status === "In Progress" ? (
                                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                ) : (
                                  <Clock className="h-4 w-4 text-red-500" />
                                )}
                                <span
                                  className={
                                    issue.status === "Resolved"
                                      ? "text-green-600 font-medium"
                                      : issue.status === "In Progress"
                                      ? "text-blue-600 font-medium"
                                      : "text-red-600 font-medium"
                                  }
                                >
                                  {issue.status}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={issue.status}
                                onValueChange={(v) =>
                                  handleStatusChange(issue.id, v as Issue["status"])
                                }
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Resolved">Resolved</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedIssue(issue);
                                  setViewModalOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
};

export default RepairerDashboard;
