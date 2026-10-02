import React, { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface Timetable {
  id: number;
  route_name: string;
  schedule: string;
}

const BusTimetableAdmin: React.FC = () => {
  const [routes, setRoutes] = useState<Timetable[]>([]);
  const [newTimes, setNewTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/timetable`)
      .then((res) => res.json())
      .then(setRoutes)
      .catch(console.error);
  }, []);

  const handleUpdate = async (routeName: string) => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API_BASE}/api/timetable`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
      body: JSON.stringify({
        route_name: routeName,
        schedule: newTimes[routeName] || "",
      }),
    });
    const data = await res.json();
    alert(data.message);
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-xl">
      <h1 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
        Admin: Update Bus Timetable
      </h1>

      {routes.map((r) => (
        <div key={r.id} className="mb-6">
          <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
            {r.route_name}
          </h2>
          <textarea
            className="w-full h-24 p-2 border rounded-md text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700"
            placeholder='Enter times (e.g. "08:00 AM, 09:10 AM, 10:00 AM")'
            defaultValue={r.schedule}
            onChange={(e) =>
              setNewTimes({ ...newTimes, [r.route_name]: e.target.value })
            }
          />
          <button
            onClick={() => handleUpdate(r.route_name)}
            className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            Update
          </button>
        </div>
      ))}
    </div>
  );
};

export default BusTimetableAdmin;
