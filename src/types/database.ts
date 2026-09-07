// Hand-written to match supabase/migrations/20260101000001_init.sql, in the shape
// `supabase gen types typescript` produces. Regenerate with `pnpm db:types` once the
// Supabase project is CLI-linked.

export type InitiativeStatus = "not_started" | "active" | "on_hold" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "not_started" | "in_progress" | "completion_confirmed" | "completed";

// `type` (not `interface`) is required here: TypeScript only treats a plain
// object-literal type as satisfying supabase-js's `Record<string, unknown>`
// structural check when it's a type alias — an `interface` of the identical
// shape does not, and every table's Row silently resolves to `never`.
export type Department = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Initiative = {
  id: string;
  name: string;
  department_id: string;
  description: string | null;
  start_date: string | null;
  target_date: string | null;
  status: InitiativeStatus;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  initiative_id: string;
  name: string;
  description: string | null;
  assigned_to: string | null;
  assignment_note: string | null;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  status: TaskStatus;
  confirmation_token: string;
  confirmed_at: string | null;
  completed_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLogEntry = {
  id: string;
  entity_type: "initiative" | "task";
  entity_id: string;
  action: string;
  actor: string;
  description: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: Department;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Department>;
        Relationships: [];
      };
      team_members: {
        Row: TeamMember;
        Insert: {
          id?: string;
          name: string;
          email: string;
          department_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TeamMember>;
        Relationships: [
          {
            foreignKeyName: "team_members_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      initiatives: {
        Row: Initiative;
        Insert: {
          id?: string;
          name: string;
          department_id: string;
          description?: string | null;
          start_date?: string | null;
          target_date?: string | null;
          status?: InitiativeStatus;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Initiative>;
        Relationships: [
          {
            foreignKeyName: "initiatives_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: Task;
        Insert: {
          id?: string;
          initiative_id: string;
          name: string;
          description?: string | null;
          assigned_to?: string | null;
          assignment_note?: string | null;
          priority?: TaskPriority;
          start_date?: string | null;
          due_date?: string | null;
          status?: TaskStatus;
          confirmation_token?: string;
          confirmed_at?: string | null;
          completed_at?: string | null;
          reminder_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Task>;
        Relationships: [
          {
            foreignKeyName: "tasks_initiative_id_fkey";
            columns: ["initiative_id"];
            isOneToOne: false;
            referencedRelation: "initiatives";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "team_members";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: ActivityLogEntry;
        Insert: {
          id?: string;
          entity_type: "initiative" | "task";
          entity_id: string;
          action: string;
          actor?: string;
          description: string;
          created_at?: string;
        };
        Update: Partial<ActivityLogEntry>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_wipe_data: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      admin_set_activity_log_delete_enabled: {
        Args: { p_enabled: boolean };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
