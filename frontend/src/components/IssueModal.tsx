import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { Issue } from "@/contexts/DataContext";
import { API_BASE } from "@/lib/api";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface IssueModalProps {
  issue: Issue | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const IssueModal = ({ issue, open, onOpenChange }: IssueModalProps) => {
  const { categories } = useData();
  const [sentiment, setSentiment] = useState<string>("Loading...");
  const [priority, setPriority] = useState<string>("Loading...");
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAnalysis = async (title: string, description: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/analyze_issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) throw new Error("Failed to fetch analysis");

      const data = await res.json();
      setSentiment(data.sentiment || "Unknown");
      setPriority(data.priority || "Unknown");
    } catch (err) {
      console.error("fetchAnalysis error:", err);
      setSentiment("Error");
      setPriority("Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && issue) {
      fetchAnalysis(issue.title, issue.description);
    }
  }, [open, issue]);

  if (!issue) return null;

  const category = undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{issue.title}</DialogTitle>
          <DialogDescription>
            Issue ID: {issue.id} • Posted on {new Date(issue.createdAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Student</p>
              <p className="text-foreground">{issue.createdBy}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Room</p>
              <p className="text-foreground">{issue.roomNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <StatusBadge status={issue.status} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upvotes</p>
              <p className="text-foreground">{issue.upvotes}</p>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 text-sm">
            <div>
              <p>😃 Sentiment: <b>{sentiment}</b></p>
              <p>⚡ Priority: <b>{priority}</b></p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchAnalysis(issue.title, issue.description)}
              disabled={loading}
              title="Reanalyze"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
            <p className="text-foreground whitespace-pre-wrap">{issue.description}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
