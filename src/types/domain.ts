// Domain types mirroring supabase/migrations/*.sql — the typed contract
// used by the service layer, server actions, and UI components.

export type OrgLevel =
  | "l1_md_ceo"
  | "l2_director"
  | "l3_business_head"
  | "l4_manager"
  | "l5_team_lead"
  | "l6_employee";

export type RoleKey =
  | "super_admin"
  | "md_ceo"
  | "director"
  | "business_head"
  | "manager"
  | "team_lead"
  | "employee"
  | "viewer";

export type VisibilityLevel = "operational" | "management_visible" | "leadership_attention";
export type ConfidentialityLevel = "normal" | "restricted" | "leadership_confidential";
export type HealthStatus = "green" | "amber" | "red" | "grey" | "blue";
export type InitiativeStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type InitiativeCategory =
  | "revenue_growth"
  | "new_product"
  | "business_development"
  | "client_delivery"
  | "technology"
  | "automation"
  | "cost_reduction"
  | "operational_improvement"
  | "compliance"
  | "hr"
  | "strategic_partnership";
export type PriorityLevel = "p1_critical" | "p2_high" | "p3_normal" | "p4_low";
export type MemberRole = "executive_sponsor" | "accountable_owner" | "responsible_manager" | "contributor";
export type GoalStatus = "on_track" | "at_risk" | "off_track" | "completed";
export type TaskStatus = "not_started" | "in_progress" | "blocked" | "completed" | "deferred" | "cancelled";
export type AssignmentRole = "accountable_owner" | "responsible" | "contributor";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "changes_requested";
export type ConfidenceLevel = "high" | "medium" | "low";
export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "in_progress" | "resolved" | "closed";
export type RiskProbability = "low" | "medium" | "high";
export type RiskImpact = "low" | "medium" | "high";
export type RiskStatus = "open" | "mitigating" | "closed" | "materialized";
export type DecisionStatus = "proposed" | "approved" | "rejected" | "deferred" | "superseded";
export type EscalationCategory =
  | "technical" | "client" | "resource" | "financial" | "approval" | "dependency" | "compliance" | "other";
export type EscalationLevel = "manager" | "department_head" | "leadership" | "critical_leadership";
export type EscalationStatus = "open" | "acknowledged" | "resolved" | "closed";
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type NotificationType =
  | "task_assigned" | "task_delegated" | "task_due_soon" | "task_overdue" | "task_blocked"
  | "approval_requested" | "approval_completed" | "comment_mention" | "initiative_health_changed"
  | "milestone_delayed" | "escalation_raised" | "decision_required";

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  title: string | null;
  org_level: OrgLevel;
  department_id: string | null;
  manager_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface BusinessVertical {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  vertical_head_id: string | null;
  is_active: boolean;
}

export interface StrategicGoal {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  period: string;
  owner_id: string | null;
  target: string | null;
  status: GoalStatus;
  progress: number;
  business_vertical_id: string | null;
}

export interface Initiative {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  business_vertical_id: string;
  strategic_goal_id: string | null;
  category: InitiativeCategory;
  strategic_objective: string | null;
  priority: PriorityLevel;
  start_date: string | null;
  target_completion_date: string | null;
  actual_completion_date: string | null;
  percentage_complete: number;
  health: HealthStatus;
  health_score: number;
  health_overridden: boolean;
  health_override_reason: string | null;
  status: InitiativeStatus;
  budget: number | null;
  revenue_opportunity: number | null;
  cost_saving_opportunity: number | null;
  tags: string[];
  visibility: VisibilityLevel;
  confidentiality: ConfidentialityLevel;
  last_update_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InitiativeMember {
  id: string;
  initiative_id: string;
  user_id: string;
  member_role: MemberRole;
  assigned_by: string | null;
  assigned_at: string;
}

export interface Milestone {
  id: string;
  initiative_id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  due_date: string | null;
  status: InitiativeStatus;
  weight: number;
  completion_percentage: number;
  priority: PriorityLevel;
  approval_required: boolean;
  sort_order: number;
}

export interface Task {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  description: string | null;
  initiative_id: string;
  milestone_id: string | null;
  parent_task_id: string | null;
  depth: number;
  weight: number;
  due_date: string | null;
  original_due_date: string | null;
  completion_date: string | null;
  priority: PriorityLevel;
  status: TaskStatus;
  percentage_complete: number;
  visibility: VisibilityLevel;
  confidentiality: ConfidentialityLevel;
  approval_required: boolean;
  approval_status: ApprovalStatus | null;
  escalation_status: string | null;
  extension_count: number;
  created_by: string | null;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assignment_role: AssignmentRole;
  assigned_by: string | null;
  assigned_at: string;
  is_active: boolean;
}

export interface TaskDelegation {
  id: string;
  task_id: string;
  parent_delegation_id: string | null;
  delegated_by: string;
  delegated_to: string;
  delegated_at: string;
  original_due_date: string | null;
  delegated_due_date: string | null;
  instructions: string | null;
  status: TaskStatus;
  is_active: boolean;
}

export interface Issue {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  description: string | null;
  initiative_id: string | null;
  task_id: string | null;
  owner_id: string | null;
  severity: IssueSeverity;
  date_raised: string;
  impact: string | null;
  resolution: string | null;
  status: IssueStatus;
  escalation_level: EscalationLevel | null;
}

export interface Risk {
  id: string;
  organization_id: string;
  code: string;
  description: string;
  initiative_id: string | null;
  probability: RiskProbability;
  impact: RiskImpact;
  risk_score: number;
  owner_id: string | null;
  mitigation: string | null;
  contingency: string | null;
  review_date: string | null;
  status: RiskStatus;
}

export interface Decision {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  description: string | null;
  decision_date: string;
  decided_by: string | null;
  initiative_id: string | null;
  meeting_id: string | null;
  rationale: string | null;
  status: DecisionStatus;
  review_date: string | null;
}

export interface Escalation {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  description: string | null;
  initiative_id: string | null;
  task_id: string | null;
  category: EscalationCategory;
  level: EscalationLevel;
  status: EscalationStatus;
  raised_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
}

export interface Meeting {
  id: string;
  organization_id: string;
  title: string;
  meeting_date: string;
  status: MeetingStatus;
  notes: string | null;
  summary: string | null;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}
