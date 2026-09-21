/**
 * Shared navigation data for the whole platform.
 *
 * Single source of truth used by:
 *   - AppShell sidebar (src/components/platform/app-shell.tsx)
 *   - MobileTabBar (src/components/platform/mobile-tab-bar.tsx)
 *   - CommandPalette (src/components/platform/global-search.tsx)
 *
 * Moved out of app-shell.tsx so client chrome components can import the
 * nav model without dragging the whole sidebar along.
 */

import {
  Shield, LayoutDashboard, BookOpen, GraduationCap, StickyNote,
  Radio, FlaskConical, Award, Users,
  Trophy, Zap, Sparkles, Presentation,
  ClipboardList, MessageSquare, UsersRound, CalendarClock, Building2,
  Briefcase, FileText, Mic, Target, Network, Server, Bug,
  Code2, ShieldAlert, BarChart3, PenLine, Heart, FileEdit,
  FileBadge, ShieldCheck,
  Calendar, TrendingUp, DollarSign, UserCog, Activity, Mail,
  Ticket, Gift, Search, Bell, Brain, Settings,
} from "lucide-react"
import type { View } from "@/store/app-store"

export interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  view: View
  roles?: string[] // if specified, only show for these roles. If not specified, show for ALL roles.
}

// ============================================================
// STUDENT nav items - shown ONLY to the STUDENT role.
// Staff roles (ADMIN / INSTRUCTOR) get their own dedicated lists below - 
// cross-role leakage (e.g. admins seeing "Parent Portal") is a bug, so
// navForRole() no longer appends this list to staff navigation.
// ============================================================
export const STUDENT_NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, view: { name: "dashboard" } },
  { label: "My Learning", icon: GraduationCap, view: { name: "learning" } },
  { label: "Course Catalog", icon: BookOpen, view: { name: "catalog" } },
  { label: "Assignments", icon: ClipboardList, view: { name: "assignments" } },
  { label: "Notes", icon: StickyNote, view: { name: "notes" } },
  { label: "Live Sessions", icon: Radio, view: { name: "live" } },
  { label: "Cyber Labs", icon: FlaskConical, view: { name: "labs" } },
  { label: "Cyber Range", icon: Server, view: { name: "cyber-range" } },
  { label: "Proctored Exams", icon: ShieldCheck, view: { name: "exams" } },
  { label: "My Credentials", icon: FileBadge, view: { name: "credentials" } },
  { label: "Certificates", icon: Award, view: { name: "certificates" } },
  { label: "Achievements", icon: Award, view: { name: "achievements" } },
  { label: "Leaderboards", icon: Trophy, view: { name: "leaderboard" } },
  { label: "AI Assistant", icon: Sparkles, view: { name: "ai-assistant" } },
  { label: "Threat Feed", icon: ShieldAlert, view: { name: "threat-feed" } },
  { label: "Code Review", icon: Code2, view: { name: "code-review" } },
  { label: "CTF Platform", icon: Trophy, view: { name: "ctf-platform" } },
  { label: "Weekly Challenge", icon: Zap, view: { name: "weekly-challenges" } },
  { label: "Team Missions", icon: UsersRound, view: { name: "team-missions" } },
  { label: "Bug Bounty", icon: Bug, view: { name: "bug-bounty" } },
  { label: "Analytics", icon: BarChart3, view: { name: "learning-analytics" } },
  { label: "Skill Tests", icon: Target, view: { name: "skill-assessments" } },
  { label: "Career Planner", icon: Briefcase, view: { name: "career-planner" } },
  { label: "Job Board", icon: Search, view: { name: "job-board" } },
  { label: "Mock Interview", icon: Mic, view: { name: "mock-interview" } },
  { label: "Resume Builder", icon: FileText, view: { name: "resume-builder" } },
  { label: "Study Groups", icon: UsersRound, view: { name: "study-groups" } },
  { label: "Book a Session", icon: CalendarClock, view: { name: "book-session" } },
  { label: "Messages", icon: MessageSquare, view: { name: "messaging" } },
  { label: "Community", icon: Users, view: { name: "community" } },
  { label: "Parent Portal", icon: Heart, view: { name: "parent-portal" } },
  { label: "Affiliate", icon: Gift, view: { name: "affiliate" } },
]

// ============================================================
// INSTRUCTOR nav items - shown to INSTRUCTOR role
// ============================================================
export const INSTRUCTOR_NAV: NavItem[] = [
  { label: "Instructor Dashboard", icon: Presentation, view: { name: "instructor" } },
  { label: "Batch Calendar", icon: Calendar, view: { name: "admin-batch-calendar" } },
  { label: "Course Studio", icon: PenLine, view: { name: "course-studio" } },
  { label: "Assignments", icon: ClipboardList, view: { name: "assignments" } },
  { label: "Messages", icon: MessageSquare, view: { name: "messaging" } },
  { label: "Study Groups", icon: UsersRound, view: { name: "study-groups" } },
  { label: "Office Hours", icon: CalendarClock, view: { name: "office-hours" } },
  { label: "Live Sessions", icon: Radio, view: { name: "live" } },
  { label: "Cyber Labs", icon: FlaskConical, view: { name: "labs" } },
]

// ============================================================
// ADMIN nav items - shown to ADMIN role only
// ============================================================
export const ADMIN_NAV: NavItem[] = [
  { label: "Admin Console", icon: Shield, view: { name: "admin" } },
  { label: "Courses", icon: BookOpen, view: { name: "admin-courses" } },
  { label: "Course Studio", icon: PenLine, view: { name: "course-studio" } },
  { label: "Content Studio (CMS)", icon: FileEdit, view: { name: "cms" } },
  { label: "Invoice Generator", icon: FileText, view: { name: "invoice-generator" } },
  { label: "Proposal Maker", icon: FileText, view: { name: "proposal-maker" } },
  { label: "Lead / CRM", icon: Users, view: { name: "admin-lead-crm" } },
  { label: "Batch Leads Hub", icon: UsersRound, view: { name: "admin-batch-hub" } },
  { label: "Hiring & Jobs", icon: Briefcase, view: { name: "admin-hiring" } },
  { label: "Batch Calendar", icon: Calendar, view: { name: "admin-batch-calendar" } },
  { label: "Student Progress", icon: TrendingUp, view: { name: "admin-student-progress" } },
  { label: "Revenue Analytics", icon: DollarSign, view: { name: "admin-revenue" } },
  { label: "Bulk Certificates", icon: Award, view: { name: "admin-cert-bulk" } },
  { label: "Email Campaigns", icon: Mail, view: { name: "admin-email-campaign" } },
  { label: "Instructor Assign", icon: UserCog, view: { name: "admin-instructor-assignment" } },
  { label: "Audit Logs", icon: Shield, view: { name: "admin-audit-log" } },
  { label: "Platform Health", icon: Activity, view: { name: "admin-platform-health" } },
  { label: "Notifications", icon: Bell, view: { name: "admin-notifications" } },
  { label: "Coupons", icon: Ticket, view: { name: "admin-coupons" } },
  { label: "SEO Optimization", icon: Search, view: { name: "admin-seo" } },
  { label: "Open Schooling Leads", icon: GraduationCap, view: { name: "admin-open-schooling-leads" } },
  { label: "Corporate Training Leads", icon: Building2, view: { name: "admin-corporate-leads" } },
  { label: "Quiz Questions", icon: Brain, view: { name: "admin-cyber-quiz-questions" } },
  { label: "Quiz Attempts", icon: Trophy, view: { name: "admin-cyber-quiz-attempts" } },
  { label: "Quiz Certificates", icon: Award, view: { name: "admin-cyber-quiz-certs" } },
  { label: "Platform Stats", icon: BarChart3, view: { name: "admin-platform-stats" } },
  { label: "Settings", icon: Settings, view: { name: "admin-settings" } },
]

/** Public marketing pages - available to everyone from the palette. */
export const PUBLIC_NAV: NavItem[] = [
  { label: "Home", icon: Shield, view: { name: "home" } },
  { label: "Courses", icon: BookOpen, view: { name: "catalog" } },
  { label: "Batches", icon: Calendar, view: { name: "batches" } },
  { label: "Learning Paths", icon: GraduationCap, view: { name: "learning-paths" } },
  { label: "Pricing", icon: Ticket, view: { name: "pricing" } },
  { label: "Blog", icon: FileText, view: { name: "blog" } },
  { label: "Events", icon: Calendar, view: { name: "events" } },
  { label: "Instructors", icon: Users, view: { name: "instructors" } },
  { label: "Hiring", icon: Briefcase, view: { name: "hiring" } },
  { label: "Contact", icon: MessageSquare, view: { name: "contact" } },
  { label: "Verify Certificate", icon: ShieldCheck, view: { name: "verify" } },
]

/** Nav for a role - STRICT role separation: each role sees only its own list. */
export function navForRole(role?: string | null): NavItem[] {
  switch (role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return ADMIN_NAV
    case "INSTRUCTOR":
      return INSTRUCTOR_NAV
    default:
      return STUDENT_NAV
  }
}

/** The dashboard view each role should land on after login / when lost. */
export function roleHomeFor(role?: string | null): string {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "admin"
  if (role === "INSTRUCTOR") return "instructor"
  return "dashboard"
}
