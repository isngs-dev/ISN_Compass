"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const HEALTH_COLORS: Record<string, string> = { green: "#10b981", amber: "#f59e0b", red: "#ef4444", grey: "#a1a1aa", blue: "#3b82f6" };

export function ReportsCharts({
  healthData,
  statusData,
  verticalData,
}: {
  healthData: { name: string; value: number; key: string }[];
  statusData: { name: string; value: number }[];
  verticalData: { name: string; progress: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Health Distribution</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={healthData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {healthData.map((d) => <Cell key={d.key} fill={HEALTH_COLORS[d.key] ?? "#a1a1aa"} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Initiatives by Status</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Average Progress by Vertical</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={verticalData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} fontSize={12} />
              <YAxis type="category" dataKey="name" width={140} fontSize={12} />
              <Tooltip />
              <Bar dataKey="progress" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
