import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/api";

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const Medical = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [doctors, setDoctors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state for add forms / editing
  const [newDoctor, setNewDoctor] = useState({ name: "", available_today: false, arrival_time: "", leave_time: "" });
  const [editingDoctorId, setEditingDoctorId] = useState<number | null>(null);
  const [editingDoctorValues, setEditingDoctorValues] = useState<any>(null);

  const [newStudent, setNewStudent] = useState({ student_name: "", email: "", prescribed_medicine: "" });
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [editingStudentValues, setEditingStudentValues] = useState<any>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/medical/doctors`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      const data = await res.json();
      setDoctors(data);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not load doctors", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/medical/student-records`, { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Could not load student records", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // --- Doctor actions ---
  const validateDoctor = (d: any) => {
    if (!d.name || !d.name.trim()) return "Doctor name is required";
    if (d.arrival_time && !TIME_RE.test(d.arrival_time)) return "Invalid arrival time (HH:MM)";
    if (d.leave_time && !TIME_RE.test(d.leave_time)) return "Invalid leave time (HH:MM)";
    return null;
  };

  const createDoctor = async () => {
    const err = validateDoctor(newDoctor);
    if (err) return toast({ title: "Validation", description: err, variant: "destructive" });
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/medical/doctors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(newDoctor),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to create doctor");
      }
      toast({ title: "Saved", description: "Doctor added" });
      setNewDoctor({ name: "", available_today: false, arrival_time: "", leave_time: "" });
      fetchDoctors();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    }
  };

  const startEditDoctor = (d: any) => {
    setEditingDoctorId(d.id);
    setEditingDoctorValues({ ...d });
  };
  const cancelEditDoctor = () => {
    setEditingDoctorId(null);
    setEditingDoctorValues(null);
  };
  const saveEditDoctor = async () => {
    if (!editingDoctorId) return;
    const err = validateDoctor(editingDoctorValues);
    if (err) return toast({ title: "Validation", description: err, variant: "destructive" });
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/medical/doctors/${editingDoctorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(editingDoctorValues),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Saved", description: "Doctor updated" });
      cancelEditDoctor();
      fetchDoctors();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    }
  };

  const deleteDoctor = async (id: number) => {
    if (!confirm("Delete this doctor?")) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/medical/doctors/${id}`, { method: "DELETE", headers: { Authorization: token ? `Bearer ${token}` : "" } });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Deleted", description: "Doctor removed" });
      fetchDoctors();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    }
  };

  // --- Student record actions (admin only) ---
  const validateStudent = (s: any) => {
    if (!s.student_name || !s.student_name.trim()) return "Student name is required";
    if (!s.email || !s.email.includes("@")) return "Valid email is required";
    return null;
  };

  const createStudent = async () => {
    if (!isAdmin) return;
    const err = validateStudent(newStudent);
    if (err) return toast({ title: "Validation", description: err, variant: "destructive" });
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/medical/student-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(newStudent),
      });
      if (!res.ok) throw new Error("Failed to create record");
      toast({ title: "Saved", description: "Student record added" });
      setNewStudent({ student_name: "", email: "", prescribed_medicine: "" });
      fetchStudents();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    }
  };

  const startEditStudent = (s: any) => {
    setEditingStudentId(s.id);
    setEditingStudentValues({ ...s });
  };
  const cancelEditStudent = () => {
    setEditingStudentId(null);
    setEditingStudentValues(null);
  };
  const saveEditStudent = async () => {
    if (!editingStudentId) return;
    const err = validateStudent(editingStudentValues);
    if (err) return toast({ title: "Validation", description: err, variant: "destructive" });
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/medical/student-records/${editingStudentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(editingStudentValues),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Saved", description: "Student record updated" });
      cancelEditStudent();
      fetchStudents();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    }
  };

  const deleteStudent = async (id: number) => {
    if (!confirm("Delete this student record?")) return;
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/medical/student-records/${id}`, { method: "DELETE", headers: { Authorization: token ? `Bearer ${token}` : "" } });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Deleted", description: "Student record removed" });
      fetchStudents();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medical</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Doctors</h2>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Input placeholder="Name" value={newDoctor.name} onChange={(e: any) => setNewDoctor({ ...newDoctor, name: e.target.value })} />
                <Input placeholder="Arrival (HH:MM)" value={newDoctor.arrival_time} onChange={(e: any) => setNewDoctor({ ...newDoctor, arrival_time: e.target.value })} />
                <Input placeholder="Leave (HH:MM)" value={newDoctor.leave_time} onChange={(e: any) => setNewDoctor({ ...newDoctor, leave_time: e.target.value })} />
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newDoctor.available_today} onChange={(e: any) => setNewDoctor({ ...newDoctor, available_today: e.target.checked })} />
                  <span className="text-sm">Available Today</span>
                </label>
                <Button onClick={createDoctor}>Add</Button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto bg-white dark:bg-gray-800 p-4 rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor Name</TableHead>
                  <TableHead>Available Today</TableHead>
                  <TableHead>Arrival Time</TableHead>
                  <TableHead>Leave Time</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      {editingDoctorId === d.id ? (
                        <Input value={editingDoctorValues.name} onChange={(e: any) => setEditingDoctorValues({ ...editingDoctorValues, name: e.target.value })} />
                      ) : (
                        d.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingDoctorId === d.id ? (
                        <input type="checkbox" checked={editingDoctorValues.available_today} onChange={(e: any) => setEditingDoctorValues({ ...editingDoctorValues, available_today: e.target.checked })} />
                      ) : (
                        d.available_today ? "Yes" : "No"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingDoctorId === d.id ? (
                        <Input value={editingDoctorValues.arrival_time || ""} onChange={(e: any) => setEditingDoctorValues({ ...editingDoctorValues, arrival_time: e.target.value })} />
                      ) : (
                        d.arrival_time || "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingDoctorId === d.id ? (
                        <Input value={editingDoctorValues.leave_time || ""} onChange={(e: any) => setEditingDoctorValues({ ...editingDoctorValues, leave_time: e.target.value })} />
                      ) : (
                        d.leave_time || "-"
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="flex gap-2">
                        {editingDoctorId === d.id ? (
                          <>
                            <Button onClick={saveEditDoctor}>Save</Button>
                            <Button variant="ghost" onClick={cancelEditDoctor}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => startEditDoctor(d)}>Edit</Button>
                            <Button variant="destructive" onClick={() => deleteDoctor(d.id)}>Delete</Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {isAdmin && (
          <section className="mt-8 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Student Records</h2>
              <div className="flex items-center gap-2">
                <Input placeholder="Student Name" value={newStudent.student_name} onChange={(e: any) => setNewStudent({ ...newStudent, student_name: e.target.value })} />
                <Input placeholder="Email" value={newStudent.email} onChange={(e: any) => setNewStudent({ ...newStudent, email: e.target.value })} />
                <Input placeholder="Prescribed Medicine" value={newStudent.prescribed_medicine} onChange={(e: any) => setNewStudent({ ...newStudent, prescribed_medicine: e.target.value })} />
                <Button onClick={createStudent}>Add</Button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-gray-800 p-4 rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Prescribed Medicine</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        {editingStudentId === s.id ? (
                          <Input value={editingStudentValues.student_name} onChange={(e: any) => setEditingStudentValues({ ...editingStudentValues, student_name: e.target.value })} />
                        ) : (
                          s.student_name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingStudentId === s.id ? (
                          <Input value={editingStudentValues.email} onChange={(e: any) => setEditingStudentValues({ ...editingStudentValues, email: e.target.value })} />
                        ) : (
                          s.email
                        )}
                      </TableCell>
                      <TableCell>
                        {editingStudentId === s.id ? (
                          <Input value={editingStudentValues.prescribed_medicine} onChange={(e: any) => setEditingStudentValues({ ...editingStudentValues, prescribed_medicine: e.target.value })} />
                        ) : (
                          s.prescribed_medicine || "-"
                        )}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        {editingStudentId === s.id ? (
                          <>
                            <Button onClick={saveEditStudent}>Save</Button>
                            <Button variant="ghost" onClick={cancelEditStudent}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => startEditStudent(s)}>Edit</Button>
                            <Button variant="destructive" onClick={() => deleteStudent(s.id)}>Delete</Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Medical;
