/**
 * Demo data seed script for iSN Compass.
 *
 * Creates a handful of departments, team members, initiatives and tasks in a
 * realistic mix of statuses. Does NOT create the Admin login — create that
 * once via the Supabase dashboard (Authentication > Users > Add user).
 *
 * Usage: pnpm seed   (requires .env.local with SUPABASE_SERVICE_ROLE_KEY)
 * Safe to re-run: wipes existing departments/team_members/initiatives/tasks first.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

async function main() {
  console.log("Wiping existing data…");
  await admin.rpc("admin_wipe_data");

  console.log("Seeding departments…");
  const { data: departments, error: deptError } = await admin
    .from("departments")
    .insert([
      { name: "Engineering", description: "Product development and platform" },
      { name: "Marketing", description: "Brand, campaigns and growth" },
      { name: "Operations", description: "Internal tooling and process" },
    ])
    .select();
  if (deptError) throw deptError;
  const [eng, mkt, ops] = departments!;

  console.log("Seeding team members…");
  const { data: members, error: memberError } = await admin
    .from("team_members")
    .insert([
      { name: "John Doe", email: "john@example.com", department_id: eng.id },
      { name: "Sarah Lee", email: "sarah@example.com", department_id: eng.id },
      { name: "Mike Chen", email: "mike@example.com", department_id: mkt.id },
      { name: "Priya Nair", email: "priya@example.com", department_id: ops.id },
    ])
    .select();
  if (memberError) throw memberError;
  const [john, sarah, mike, priya] = members!;

  console.log("Seeding initiatives…");
  const { data: initiatives, error: initError } = await admin
    .from("initiatives")
    .insert([
      {
        name: "Website Revamp",
        department_id: eng.id,
        description: "Redesign and improve the company website",
        start_date: daysFromNow(-14),
        target_date: daysFromNow(30),
        status: "active",
      },
      {
        name: "Q3 Campaign Launch",
        department_id: mkt.id,
        description: "Cross-channel campaign for the Q3 product push",
        start_date: daysFromNow(-7),
        target_date: daysFromNow(45),
        status: "active",
      },
      {
        name: "Vendor Onboarding Cleanup",
        department_id: ops.id,
        description: "Consolidate and document the vendor onboarding process",
        start_date: daysFromNow(-30),
        target_date: daysFromNow(-2),
        status: "on_hold",
      },
    ])
    .select();
  if (initError) throw initError;
  const [website, campaign, vendor] = initiatives!;

  console.log("Seeding tasks…");
  const { error: taskError } = await admin.from("tasks").insert([
    {
      initiative_id: website.id,
      name: "Homepage Design",
      description: "New homepage layout and hero section",
      assigned_to: john.id,
      priority: "high",
      due_date: daysFromNow(-3),
      status: "completed",
      completed_at: new Date().toISOString(),
    },
    {
      initiative_id: website.id,
      name: "Backend API",
      description: "Content API for the new site",
      assigned_to: sarah.id,
      priority: "medium",
      due_date: daysFromNow(5),
      status: "in_progress",
    },
    {
      initiative_id: website.id,
      name: "QA Pass",
      description: "Full regression pass before launch",
      assigned_to: john.id,
      priority: "medium",
      due_date: daysFromNow(1),
      status: "completion_confirmed",
      confirmed_at: new Date().toISOString(),
    },
    {
      initiative_id: campaign.id,
      name: "Creative Assets",
      description: "Banner and social creative set",
      assigned_to: mike.id,
      priority: "high",
      due_date: daysFromNow(-2),
      status: "in_progress",
    },
    {
      initiative_id: campaign.id,
      name: "Landing Page Copy",
      assigned_to: mike.id,
      priority: "low",
      due_date: daysFromNow(10),
      status: "not_started",
    },
    {
      initiative_id: vendor.id,
      name: "Document Approval Flow",
      assigned_to: priya.id,
      priority: "low",
      due_date: daysFromNow(-10),
      status: "not_started",
    },
  ]);
  if (taskError) throw taskError;

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
