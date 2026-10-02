import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { API_BASE } from "@/lib/api";


export interface Category {
  id: string;
  name: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string;
  roomNumber: string;
  status: "Pending" | "In Progress" | "Resolved" | "Cancelled";
  createdBy: string;
  createdAt: string;
  upvotes: number;
  voters: string[];
  assignee: string;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface MessItem {
  id: number;
  day: string;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
  createdAt: string;
  updatedAt: string;
}

export interface Repairer {
  id: string;
  name: string;
}

export interface Doctor {
  id: number;
  name: string;
  availableToday: boolean;
  arrivalTime: string;
  leaveTime: string;
}

export interface StudentRecord {
  id: number;
  studentName: string;
  email: string;
  prescribedMedicine: string;
}


interface DataContextType {
  issues: Issue[];
  notices: Notice[];
  messItems: MessItem[];
  categories: Category[];
  repairers: Repairer[];
  loading: boolean;

  // doctors & student records (medical)
  doctors: Doctor[];
  addDoctor: (payload: Partial<Doctor>) => Promise<boolean>;
  updateDoctor: (doctorId: number, updates: Partial<Doctor>) => Promise<boolean>;
  deleteDoctor: (doctorId: number) => Promise<boolean>;

  studentRecords: StudentRecord[];
  addStudentRecord: (payload: Partial<StudentRecord>) => Promise<boolean>;
  updateStudentRecord: (recordId: number, updates: Partial<StudentRecord>) => Promise<boolean>;
  deleteStudentRecord: (recordId: number) => Promise<boolean>;

  addIssue: (issue: any) => Promise<void>;
  addNotice: (notice: any) => Promise<void>;
  addMessItem: (messItem: any) => Promise<void>;
  updateIssue: (issueId: number, updates: Partial<Issue>) => Promise<void>;
  editIssue: (issueId: number, updates: Partial<Issue>) => Promise<boolean>;
  updateNotice: (noticeId: number, updates: Partial<Notice>) => Promise<boolean>;
  updateMessItem: (messId: number, updates: Partial<MessItem>) => Promise<void>;
  deleteIssue: (issueId: number) => Promise<boolean>;
  deleteNotice: (noticeId: number) => Promise<boolean>;
  deleteMessItem: (messId: number) => Promise<boolean>;
  upvoteIssue: (issueId: number) => Promise<void>;
  downvoteIssue: (issueId: number) => Promise<void>;
}


const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const token = localStorage.getItem("access_token");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [messItems, setMessItems] = useState<MessItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [repairers, setRepairers] = useState<Repairer[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [studentRecords, setStudentRecords] = useState<StudentRecord[]>([]);


  const headers = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  // Helper that never throws — returns structured result even on network error
  const safeFetch = async (url: string, opts: RequestInit = {}) => {
    try {
      const res = await fetch(url, opts);
      const json = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, json, res };
    } catch (err) {
      console.error("safeFetch network error for", url, err);
      return { ok: false, status: 0, json: null, error: err };
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // fire all requests in parallel but use safeFetch so one failure doesn't reject Promise.all
      const [
      issuesRes,
      categoriesRes,
      noticesRes,
      workersRes,
      messRes,
      doctorsRes,
      studentRecordsRes,
    ] = await Promise.all([
      safeFetch(`${API_BASE}/api/issues`, { headers }),
      safeFetch(`${API_BASE}/api/categories`, { headers }),
      safeFetch(`${API_BASE}/api/notices`, { headers }),
      safeFetch(`${API_BASE}/api/workers`, { headers }),
      safeFetch(`${API_BASE}/api/mess`, { headers }),
      safeFetch(`${API_BASE}/api/medical/doctors`, { headers }),
      safeFetch(`${API_BASE}/api/medical/student-records`, { headers }), // Corrected URL
    ]);
      // handle auth errors centrally
      const responses = [issuesRes, categoriesRes, noticesRes, workersRes, messRes, doctorsRes, studentRecordsRes];
      if (responses.some(r => r && (r.status === 401 || r.status === 422))) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      // For each resource, if response ok -> use json, if 404 -> treat as empty list, if other error -> log and throw
      if (issuesRes.ok && issuesRes.json) setIssues(issuesRes.json);
      else {
        console.warn("issues fetch issue:", issuesRes.status);
        setIssues([]);
      }

      if (categoriesRes.ok && categoriesRes.json) setCategories(categoriesRes.json);
      else {
        console.warn("categories fetch issue:", categoriesRes.status);
        setCategories([]);
      }

      if (noticesRes.ok && noticesRes.json) setNotices(noticesRes.json);
      else {
        console.warn("notices fetch issue:", noticesRes.status);
        setNotices([]);
      }

      if (workersRes.ok && workersRes.json) {
        const workersData = workersRes.json;
        const repairerList = Array.isArray(workersData) ? workersData.filter((w: any) => w.role === "worker") : [];
        setRepairers(repairerList);
      } else {
        console.warn("workers fetch issue:", workersRes.status);
        setRepairers([]);
      }

      if (messRes.ok && messRes.json) setMessItems(messRes.json);
      else {
        console.warn("mess fetch issue:", messRes.status);
        setMessItems([]);
      }

      // doctors endpoint exists in your logs; if missing/404 -> set empty array
      if (doctorsRes.ok && doctorsRes.json) {
      // Transform doctor data to camelCase for frontend
      setDoctors(
        doctorsRes.json.map((d: any) => ({
          id: d.id,
          name: d.name,
          availableToday: d.available_today, // Mapped
          arrivalTime: d.arrival_time,       // Mapped
          leaveTime: d.leave_time,         // Mapped
        }))
      );
    } else if (doctorsRes.status === 404) {
      console.info("doctors endpoint not found (404) — continuing with empty doctors list");
      setDoctors([]);
    } else {
      console.warn("doctors fetch issue:", doctorsRes.status, doctorsRes.error ?? "");
      setDoctors([]);
    }

    if (studentRecordsRes.ok && studentRecordsRes.json) {
      // Transform student records data to camelCase for frontend
      setStudentRecords(
        studentRecordsRes.json.map((r: any) => ({
          id: r.id,
          studentName: r.student_name,          // Mapped
          email: r.email,
          prescribedMedicine: r.prescribed_medicine, // Mapped
        }))
      );
    } else if (studentRecordsRes.status === 404) {
      console.info("student-records endpoint returned 404 — continuing with empty studentRecords list");
      setStudentRecords([]);
    } else {
      console.warn("student-records fetch issue:", studentRecordsRes.status, studentRecordsRes.error ?? "");
      setStudentRecords([]);
    }

  } catch (err) {
    console.error("fetchAllData error:", err);
  } finally {
    setLoading(false);
  }
};
// ...existing code...

  // Issue Operations
  const addIssue = async (issueData: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/issues`, {
        method: "POST",
        headers,
        body: JSON.stringify(issueData),
      });
      if (!res.ok) throw new Error();
      await fetchAllData();
      toast.success("Issue reported successfully!");
    } catch {
      toast.error("Failed to report issue");
    }
  };
  const editIssue = async (issueId: number, updates: Partial<Issue>) => {
  try {
    const res = await fetch(`${API_BASE}/api/issues/${issueId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        title: updates.title,
        description: updates.description,
        // ensure you send roomNumber as room_number if backend expects that
        room_number: (updates as any).roomNumber ?? (updates as any).room_number,
      }),
    });
    if (!res.ok) {
      let json = null;
      try { json = await res.json(); } catch {}
      console.error("editIssue failed:", res.status, json);
      return false;
    }
    await fetchAllData();
    return true;
  } catch (err) {
    console.error("editIssue exception:", err);
    return false;
  }
};
  const updateIssue = async (issueId: number, updates: Partial<Issue>) => {
    try {
      const res = await fetch(`${API_BASE}/api/issues/${issueId}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      await fetchAllData();
      toast.success("Issue updated");
    } catch {
      toast.error("Failed to update issue");
    }
  };

  const deleteIssue = async (issueId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/issues/${issueId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        // show message from server if present
        let msg = "Failed to delete issue";
        try {
          const json = await res.json();
          if (json?.error) msg = json.error;
        } catch {}
        toast.error(msg);
        return false;
      }

      // re-fetch authoritative data
      await fetchAllData();
      toast.success("Issue deleted");
      return true;
    } catch (err) {
      console.error("deleteIssue error:", err);
      toast.error("Failed to delete issue");
      return false;
    }
  };

  const upvoteIssue = async (issueId: number) => {
    if (!user) {
      toast.error("Please login to upvote");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/issues/${issueId}/upvote`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error();
      await fetchAllData();
    } catch (err) {
      console.error("upvoteIssue error:", err);
      toast.error("Failed to upvote");
    }
  };

  const downvoteIssue = async (issueId: number) => {
    if (!user) {
      toast.error("Please login to downvote");
      return;
    }
    try {
      // The API exposes one toggle endpoint: posting again removes the existing vote.
      const res = await fetch(`${API_BASE}/api/issues/${issueId}/upvote`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error();
      await fetchAllData();
    } catch (err) {
      console.error("downvoteIssue error:", err);
      toast.error("Failed to downvote");
    }
  };

  // Notice Operations
  const addNotice = async (noticeData: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/notices`, {
        method: "POST",
        headers,
        body: JSON.stringify(noticeData),
      });
      if (!res.ok) throw new Error();
      await fetchAllData();
      toast.success("Notice created successfully!");
    } catch {
      toast.error("Failed to create notice");
    }
  };

  // inside DataProvider (add below addNotice)
  // add to DataContext.tsx inside DataProvider
const updateNotice = async (noticeId: number, updates: Partial<Notice>) => {
  try {
    const res = await fetch(`${API_BASE}/api/notices/${noticeId}`, {
      method: "PUT", // or "PATCH" if your backend expects PATCH
      headers,
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      let json = null;
      try { json = await res.json(); } catch {}
      console.error("updateNotice failed:", res.status, json);
      return false;
    }
    await fetchAllData(); // refresh local state from backend
    return true;
  } catch (err) {
    console.error("updateNotice exception:", err);
    return false;
  }
};


  const deleteNotice = async (noticeId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/notices/${noticeId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        let msg = "Failed to delete notice";
        try {
          const json = await res.json();
          if (json?.error) msg = json.error;
        } catch {}
        toast.error(msg);
        return false;
      }

      await fetchAllData();
      toast.success("Notice deleted");
      return true;
    } catch (err) {
      console.error("deleteNotice error:", err);
      toast.error("Failed to delete notice");
      return false;
    }
  };

  // Mess Operations
  const addMessItem = async (messData: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/mess`, {
        method: "POST",
        headers,
        body: JSON.stringify(messData),
      });
      if (!res.ok) throw new Error();
      await fetchAllData();
      toast.success("Mess item created successfully!");
    } catch {
      toast.error("Failed to create mess item");
    }
  };

  const updateMessItem = async (messId: number, updates: Partial<MessItem>) => {
    try {
      const res = await fetch(`${API_BASE}/api/mess/${messId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      await fetchAllData();
      toast.success("Mess item updated successfully!");
    } catch {
      toast.error("Failed to update mess item");
    }
  };

  const deleteMessItem = async (messId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/mess/${messId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        let msg = "Failed to delete mess item";
        try {
          const json = await res.json();
          if (json?.error) msg = json.error;
        } catch {}
        toast.error(msg);
        return false;
      }

      await fetchAllData();
      toast.success("Mess item deleted");
      return true;
    } catch (err) {
      console.error("deleteMessItem error:", err);
      toast.error("Failed to delete mess item");
      return false;
    }
  };
  // Doctors (medical)
// Inside DataProvider in DataContext.tsx

// Doctors (medical)
const addDoctor = async (payload: Partial<Doctor>) => {
  try {
    const res = await fetch(`${API_BASE}/api/medical/doctors`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: payload.name,
        available_today: payload.availableToday, // Change here
        arrival_time: payload.arrivalTime, // Change here
        leave_time: payload.leaveTime, // Change here
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error || json?.message || `Failed to add doctor (HTTP ${res.status})`;
      console.error("addDoctor failed:", msg, json);
      toast.error(msg);
      return false;
    }
    await fetchAllData();
    toast.success("Doctor added");
    return true;
  } catch (err) {
    console.error("addDoctor error:", err);
    toast.error("Failed to add doctor");
    return false;
  }
};

const updateDoctor = async (doctorId: number, updates: Partial<Doctor>) => {
  try {
    const res = await fetch(`${API_BASE}/api/medical/doctors/${doctorId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        name: updates.name,
        available_today: updates.availableToday, // Change here
        arrival_time: updates.arrivalTime, // Change here
        leave_time: updates.leaveTime, // Change here
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error || json?.message || `Failed to update doctor (HTTP ${res.status})`;
      console.error("updateDoctor failed:", msg, json);
      toast.error(msg);
      return false;
    }
    await fetchAllData();
    toast.success("Doctor updated");
    return true;
  } catch (err) {
    console.error("updateDoctor error:", err);
    toast.error("Failed to update doctor");
    return false;
  }
};
 const deleteDoctor = async (doctorId: number) => {
  try {
    const res = await fetch(`${API_BASE}/api/medical/doctors/${doctorId}`, {
      method: "DELETE",
      headers,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error || json?.message || `Failed to delete doctor (HTTP ${res.status})`;
      console.error("deleteDoctor failed:", msg, json);
      toast.error(msg);
      return false;
    }
    await fetchAllData();
    toast.success("Doctor deleted");
    return true;
  } catch (err) {
    console.error("deleteDoctor error:", err);
    toast.error("Failed to delete doctor");
    return false;
  }
 };
 
 // Inside DataProvider in DataContext.tsx

// Student Records (admin-only)
const addStudentRecord = async (payload: Partial<StudentRecord>) => {
  try {
    const res = await fetch(`${API_BASE}/api/medical/student-records`, { // Corrected URL
      method: "POST",
      headers,
      body: JSON.stringify({
        student_name: payload.studentName, // Change here
        email: payload.email,
        prescribed_medicine: payload.prescribedMedicine, // Change here
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error || json?.message || `Failed to add student record (HTTP ${res.status})`;
      console.error("addStudentRecord failed:", msg, json);
      toast.error(msg);
      return false;
    }
    await fetchAllData();
    toast.success("Student record added");
    return true;
  } catch (err) {
    console.error("addStudentRecord error:", err);
    toast.error("Failed to add student record");
    return false;
  }
};

const updateStudentRecord = async (recordId: number, updates: Partial<StudentRecord>) => {
  try {
    const res = await fetch(`${API_BASE}/api/medical/student-records/${recordId}`, { // Corrected URL
      method: "PUT",
      headers,
      body: JSON.stringify({
        student_name: updates.studentName, // Change here
        email: updates.email,
        prescribed_medicine: updates.prescribedMedicine, // Change here
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error || json?.message || `Failed to update student record (HTTP ${res.status})`;
      console.error("updateStudentRecord failed:", msg, json);
      toast.error(msg);
      return false;
    }
    await fetchAllData();
    toast.success("Student record updated");
    return true;
  } catch (err) {
    console.error("updateStudentRecord error:", err);
    toast.error("Failed to update student record");
    return false;
  }
};
 const deleteStudentRecord = async (recordId: number) => {
  try {
    const res = await fetch(`${API_BASE}/api/medical/student-records/${recordId}`, {
      method: "DELETE",
      headers,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error || json?.message || `Failed to delete student record (HTTP ${res.status})`;
      console.error("deleteStudentRecord failed:", msg, json);
      toast.error(msg);
      return false;
    }
    await fetchAllData();
    toast.success("Student record deleted");
    return true;
  } catch (err) {
    console.error("deleteStudentRecord error:", err);
    toast.error("Failed to delete student record");
    return false;
  }
 };
 
  useEffect(() => {
    // Public information is fetched by public pages. Keep private operational data
    // out of anonymous requests and refresh it whenever the authenticated user changes.
    if (user && token) {
      fetchAllData();
      return;
    }

    setIssues([]);
    setNotices([]);
    setMessItems([]);
    setCategories([]);
    setRepairers([]);
    setDoctors([]);
    setStudentRecords([]);
    setLoading(false);
  }, [user, token]);

  return (
    <DataContext.Provider
  value={{
    issues,
    notices,
    messItems,
    categories,
    repairers,
    loading,

    // medical
    doctors,
    addDoctor,
    updateDoctor,
    deleteDoctor,

    studentRecords,
    addStudentRecord,
    updateStudentRecord,
    deleteStudentRecord,

    // existing
    addIssue,
    addNotice,
    updateNotice,
    updateIssue,
    editIssue,
    addMessItem,
    updateMessItem,
    deleteIssue,
    deleteNotice,
    deleteMessItem,
    upvoteIssue,
    downvoteIssue,
  }}
>
  {children}
</DataContext.Provider>

  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
};
