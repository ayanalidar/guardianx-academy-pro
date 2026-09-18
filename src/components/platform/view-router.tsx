"use client"

/**
 * ViewRouter — the SPA's view renderer, extracted from the old
 * `src/app/page.tsx` so it can be shared by:
 *   - the root page (`/`)
 *   - the catch-all bridge page (`src/app/[...gx]/page.tsx`)
 *   - PublicRouteView (real pages that hydrate into the SPA)
 *
 * It reads the current `View` from the Zustand store and renders the
 * matching view. Views are lazy-loaded (dynamic imports) so the browser
 * only downloads the JS for the view being displayed.
 */

import * as React from "react"
import dynamic from "next/dynamic"
import { useAppStore } from "@/store/app-store"
import { HomeView } from "@/views/home"

// ── Lazy-loaded views (only loaded when the user navigates to them) ──
const ImpactView = dynamic(() => import("@/views/impact").then(m => ({ default: m.ImpactView })), { ssr: false })
const ContactView = dynamic(() => import("@/views/contact").then(m => ({ default: m.ContactView })), { ssr: false })
const InstitutionsSchoolsView = dynamic(() => import("@/views/institutions-schools").then(m => ({ default: m.InstitutionsSchoolsView })), { ssr: false })
const InstitutionsCollegesView = dynamic(() => import("@/views/institutions-colleges").then(m => ({ default: m.InstitutionsCollegesView })), { ssr: false })
const InstitutionsUniversitiesView = dynamic(() => import("@/views/institutions-universities").then(m => ({ default: m.InstitutionsUniversitiesView })), { ssr: false })
const OpenSchoolingView = dynamic(() => import("@/views/open-schooling").then(m => ({ default: m.OpenSchoolingView })), { ssr: false })
const CorporateTrainingView = dynamic(() => import("@/views/corporate-training").then(m => ({ default: m.CorporateTrainingView })), { ssr: false })
const CyberQuizLandingView = dynamic(() => import("@/views/cyber-quiz-landing").then(m => ({ default: m.CyberQuizLandingView })), { ssr: false })
const CyberQuizRunnerView = dynamic(() => import("@/views/cyber-quiz-runner").then(m => ({ default: m.CyberQuizRunnerView })), { ssr: false })
const CyberQuizResultsView = dynamic(() => import("@/views/cyber-quiz-results").then(m => ({ default: m.CyberQuizResultsView })), { ssr: false })
const CyberQuizCertificateView = dynamic(() => import("@/views/cyber-quiz-certificate").then(m => ({ default: m.CyberQuizCertificateView })), { ssr: false })
const CyberQuizProgressView = dynamic(() => import("@/views/cyber-quiz-progress").then(m => ({ default: m.CyberQuizProgressView })), { ssr: false })
const DashboardView = dynamic(() => import("@/views/dashboard").then(m => ({ default: m.DashboardView })), { ssr: false })
const CourseCatalogView = dynamic(() => import("@/views/course-catalog").then(m => ({ default: m.CourseCatalogView })), { ssr: false })
const BatchesView = dynamic(() => import("@/views/batches").then(m => ({ default: m.BatchesView })), { ssr: false })
const ExamsView = dynamic(() => import("@/views/exams").then(m => ({ default: m.ExamsView })), { ssr: false })
const CredentialsView = dynamic(() => import("@/views/credentials").then(m => ({ default: m.CredentialsView })), { ssr: false })
const VerifyView = dynamic(() => import("@/views/verify").then(m => ({ default: m.VerifyView })), { ssr: false })
const InvoiceGeneratorView = dynamic(() => import("@/views/invoice-generator").then(m => ({ default: m.InvoiceGeneratorView })), { ssr: false })
const ProposalMakerView = dynamic(() => import("@/views/proposal-maker").then(m => ({ default: m.ProposalMakerView })), { ssr: false })
const LeadCrmView = dynamic(() => import("@/views/admin-lead-crm").then(m => ({ default: m.LeadCrmView })), { ssr: false })
const BatchCalendarView = dynamic(() => import("@/views/admin-batch-calendar").then(m => ({ default: m.BatchCalendarView })), { ssr: false })
const StudentProgressView = dynamic(() => import("@/views/admin-student-progress").then(m => ({ default: m.StudentProgressView })), { ssr: false })
const RevenueAnalyticsView = dynamic(() => import("@/views/admin-revenue").then(m => ({ default: m.RevenueAnalyticsView })), { ssr: false })
const CertBulkIssuanceView = dynamic(() => import("@/views/admin-cert-bulk").then(m => ({ default: m.CertBulkIssuanceView })), { ssr: false })
const EmailCampaignView = dynamic(() => import("@/views/admin-email-campaign").then(m => ({ default: m.EmailCampaignView })), { ssr: false })
const InstructorAssignmentView = dynamic(() => import("@/views/admin-instructor-assignment").then(m => ({ default: m.InstructorAssignmentView })), { ssr: false })
const AuditLogView = dynamic(() => import("@/views/admin-audit-log").then(m => ({ default: m.AuditLogView })), { ssr: false })
const PlatformHealthView = dynamic(() => import("@/views/admin-platform-health").then(m => ({ default: m.PlatformHealthView })), { ssr: false })
const NotificationCenterView = dynamic(() => import("@/views/admin-notifications").then(m => ({ default: m.NotificationCenterView })), { ssr: false })
const AdminCouponsView = dynamic(() => import("@/views/admin-coupons").then(m => ({ default: m.AdminCouponsView })), { ssr: false })
const SupportView = dynamic(() => import("@/views/support").then(m => ({ default: m.SupportView })), { ssr: false })
const InstructorsView = dynamic(() => import("@/views/instructors").then(m => ({ default: m.InstructorsView })), { ssr: false })
const InstructorDetailView = dynamic(() => import("@/views/instructor-detail").then(m => ({ default: m.InstructorDetailView })), { ssr: false })
const EventsView = dynamic(() => import("@/views/events").then(m => ({ default: m.EventsView })), { ssr: false })
const EventDetailView = dynamic(() => import("@/views/event-detail").then(m => ({ default: m.EventDetailView })), { ssr: false })
const BlogView = dynamic(() => import("@/views/blog").then(m => ({ default: m.BlogView })), { ssr: false })
const BlogPostView = dynamic(() => import("@/views/blog-post").then(m => ({ default: m.BlogPostView })), { ssr: false })
const CertLandingView = dynamic(() => import("@/views/cert-landing").then(m => ({ default: m.CertLandingView })), { ssr: false })
const AdminCoursesView = dynamic(() => import("@/views/admin-courses").then(m => ({ default: m.AdminCoursesView })), { ssr: false })
const AffiliateView = dynamic(() => import("@/views/affiliate").then(m => ({ default: m.AffiliateView })), { ssr: false })
const PricingView = dynamic(() => import("@/views/pricing").then(m => ({ default: m.PricingView })), { ssr: false })
const AdminSeoView = dynamic(() => import("@/views/admin-seo").then(m => ({ default: m.AdminSeoView })), { ssr: false })
const AdminOpenSchoolingLeadsView = dynamic(() => import("@/views/admin-open-schooling-leads").then(m => ({ default: m.AdminOpenSchoolingLeadsView })), { ssr: false })
const AdminCorporateLeadsView = dynamic(() => import("@/views/admin-corporate-leads").then(m => ({ default: m.AdminCorporateLeadsView })), { ssr: false })
const AdminCyberQuizQuestionsView = dynamic(() => import("@/views/admin-cyber-quiz-questions").then(m => ({ default: m.AdminCyberQuizQuestionsView })), { ssr: false })
const AdminCyberQuizAttemptsView = dynamic(() => import("@/views/admin-cyber-quiz-attempts").then(m => ({ default: m.AdminCyberQuizAttemptsView })), { ssr: false })
const AdminCyberQuizCertsView = dynamic(() => import("@/views/admin-cyber-quiz-certs").then(m => ({ default: m.AdminCyberQuizCertsView })), { ssr: false })
const AdminPlatformStatsView = dynamic(() => import("@/views/admin-platform-stats").then(m => ({ default: m.AdminPlatformStatsView })), { ssr: false })
const AdminSettingsView = dynamic(() => import("@/views/admin-settings").then(m => ({ default: m.AdminSettingsView })), { ssr: false })
const CourseDetailView = dynamic(() => import("@/views/course-detail").then(m => ({ default: m.CourseDetailView })), { ssr: false })
const LessonView = dynamic(() => import("@/views/lesson-view").then(m => ({ default: m.LessonView })), { ssr: false })
const MyLearningView = dynamic(() => import("@/views/my-learning").then(m => ({ default: m.MyLearningView })), { ssr: false })
const MyNotesView = dynamic(() => import("@/views/my-notes").then(m => ({ default: m.MyNotesView })), { ssr: false })
const LiveSessionsView = dynamic(() => import("@/views/live-sessions").then(m => ({ default: m.LiveSessionsView })), { ssr: false })
const LabsView = dynamic(() => import("@/views/labs").then(m => ({ default: m.LabsView })), { ssr: false })
const LabDetailView = dynamic(() => import("@/views/lab-detail").then(m => ({ default: m.LabDetailView })), { ssr: false })
const CertificatesView = dynamic(() => import("@/views/certificates").then(m => ({ default: m.CertificatesView })), { ssr: false })
const AchievementsView = dynamic(() => import("@/views/achievements").then(m => ({ default: m.AchievementsView })), { ssr: false })
const LeaderboardView = dynamic(() => import("@/views/leaderboard").then(m => ({ default: m.LeaderboardView })), { ssr: false })
const InstructorDashboardView = dynamic(() => import("@/views/instructor-dashboard").then(m => ({ default: m.InstructorDashboardView })), { ssr: false })
const SchoolDashboardView = dynamic(() => import("@/views/school-dashboard").then(m => ({ default: m.SchoolDashboardView })), { ssr: false })
const AdminDashboardView = dynamic(() => import("@/views/admin-dashboard").then(m => ({ default: m.AdminDashboardView })), { ssr: false })
const CommunityView = dynamic(() => import("@/views/community").then(m => ({ default: m.CommunityView })), { ssr: false })
const ProfileView = dynamic(() => import("@/views/profile").then(m => ({ default: m.ProfileView })), { ssr: false })
const AssignmentsView = dynamic(() => import("@/views/assignments").then(m => ({ default: m.AssignmentsView })), { ssr: false })
const MessagingView = dynamic(() => import("@/views/messaging").then(m => ({ default: m.MessagingView })), { ssr: false })
const StudyGroupsView = dynamic(() => import("@/views/study-groups").then(m => ({ default: m.StudyGroupsView })), { ssr: false })
const OfficeHoursView = dynamic(() => import("@/views/office-hours").then(m => ({ default: m.OfficeHoursView })), { ssr: false })
const BookSessionView = dynamic(() => import("@/views/book-session").then(m => ({ default: m.BookSessionView })), { ssr: false })
const AIAssistantView = dynamic(() => import("@/views/ai-assistant").then(m => ({ default: m.AIAssistantView })), { ssr: false })
const ThreatFeedView = dynamic(() => import("@/views/threat-feed").then(m => ({ default: m.ThreatFeedView })), { ssr: false })
const CodeReviewView = dynamic(() => import("@/views/code-review").then(m => ({ default: m.CodeReviewView })), { ssr: false })
const CareerPlannerView = dynamic(() => import("@/views/career-planner").then(m => ({ default: m.CareerPlannerView })), { ssr: false })
const JobBoardView = dynamic(() => import("@/views/job-board").then(m => ({ default: m.JobBoardView })), { ssr: false })
const ParentPortalView = dynamic(() => import("@/views/parent-portal").then(m => ({ default: m.ParentPortalView })), { ssr: false })
const CMSDashboardView = dynamic(() => import("@/views/cms-dashboard").then(m => ({ default: m.CMSDashboardView })), { ssr: false })
const MockInterviewView = dynamic(() => import("@/views/mock-interview").then(m => ({ default: m.MockInterviewView })), { ssr: false })
const ResumeBuilderView = dynamic(() => import("@/views/resume-builder").then(m => ({ default: m.ResumeBuilderView })), { ssr: false })
const CTFPlatformView = dynamic(() => import("@/views/ctf-platform").then(m => ({ default: m.CTFPlatformView })), { ssr: false })
const WeeklyChallengesView = dynamic(() => import("@/views/weekly-challenges").then(m => ({ default: m.WeeklyChallengesView })), { ssr: false })
const TeamMissionsView = dynamic(() => import("@/views/team-missions").then(m => ({ default: m.TeamMissionsView })), { ssr: false })
const LearningAnalyticsView = dynamic(() => import("@/views/learning-analytics").then(m => ({ default: m.LearningAnalyticsView })), { ssr: false })
const SkillAssessmentsView = dynamic(() => import("@/views/skill-assessments").then(m => ({ default: m.SkillAssessmentsView })), { ssr: false })
const PrerequisitesVisualizerView = dynamic(() => import("@/views/prerequisites-visualizer").then(m => ({ default: m.PrerequisitesVisualizerView })), { ssr: false })
const LabSnapshotsView = dynamic(() => import("@/views/lab-snapshots").then(m => ({ default: m.LabSnapshotsView })), { ssr: false })
const BugBountyView = dynamic(() => import("@/views/bug-bounty").then(m => ({ default: m.BugBountyView })), { ssr: false })
const CourseStudioView = dynamic(() => import("@/views/course-studio").then(m => ({ default: m.CourseStudioView })), { ssr: false })
const ExamDetailView = dynamic(() => import("@/views/exam-detail").then(m => ({ default: m.ExamDetailView })), { ssr: false })
const SkillTreeView = dynamic(() => import("@/views/skill-tree").then(m => ({ default: m.SkillTreeView })), { ssr: false })
const CyberRangeView = dynamic(() => import("@/views/cyber-range").then(m => ({ default: m.CyberRangeView })), { ssr: false })
const LearningPathsView = dynamic(() => import("@/views/learning-paths").then(m => ({ default: m.LearningPathsView })), { ssr: false })
const LegalPageView = dynamic(() => import("@/views/legal").then(m => ({ default: m.LegalPage })), { ssr: false })

/** Render the current store view. Exported so shells can embed it. */
export function ViewRouter() {
  const { view } = useAppStore()
  // key forces remount + fade-in on navigation
  return (
    <div key={JSON.stringify(view)} className="page-transition">
      {view.name === "home" && <HomeView />}
      {view.name === "impact" && <ImpactView />}
      {view.name === "contact" && <ContactView />}
      {/* "institutions" redirects to institutions-schools — no combined page anymore */}
      {(view.name === "institutions" || view.name === "institutions-schools") && <InstitutionsSchoolsView />}
      {view.name === "institutions-colleges" && <InstitutionsCollegesView />}
      {view.name === "institutions-universities" && <InstitutionsUniversitiesView />}
      {view.name === "institutions-open-schooling" && <OpenSchoolingView />}
      {view.name === "corporate-training" && <CorporateTrainingView />}
      {view.name === "cyber-quiz" && <CyberQuizLandingView />}
      {view.name === "cyber-quiz-runner" && "difficulty" in view && <CyberQuizRunnerView />}
      {view.name === "cyber-quiz-results" && "attemptId" in view && <CyberQuizResultsView />}
      {view.name === "cyber-quiz-certificate" && "credentialId" in view && <CyberQuizCertificateView />}
      {view.name === "cyber-quiz-progress" && "credentialId" in view && <CyberQuizProgressView />}
      {view.name === "dashboard" && <DashboardView />}
      {view.name === "catalog" && <CourseCatalogView />}
      {view.name === "batches" && <BatchesView />}
      {view.name === "exams" && <ExamsView />}
      {view.name === "credentials" && <CredentialsView />}
      {view.name === "verify" && <VerifyView />}
      {view.name === "legal" && "pageType" in view && <LegalPageView pageType={view.pageType} />}
      {view.name === "invoice-generator" && <InvoiceGeneratorView />}
      {view.name === "proposal-maker" && <ProposalMakerView />}
      {view.name === "admin-lead-crm" && <LeadCrmView />}
      {view.name === "admin-batch-calendar" && <BatchCalendarView />}
      {view.name === "admin-student-progress" && <StudentProgressView />}
      {view.name === "admin-revenue" && <RevenueAnalyticsView />}
      {view.name === "admin-cert-bulk" && <CertBulkIssuanceView />}
      {view.name === "admin-email-campaign" && <EmailCampaignView />}
      {view.name === "admin-instructor-assignment" && <InstructorAssignmentView />}
      {view.name === "admin-audit-log" && <AuditLogView />}
      {view.name === "admin-platform-health" && <PlatformHealthView />}
      {view.name === "admin-notifications" && <NotificationCenterView />}
      {view.name === "admin-coupons" && <AdminCouponsView />}
      {view.name === "support" && <SupportView />}
      {view.name === "instructors" && <InstructorsView />}
      {view.name === "instructor-detail" && <InstructorDetailView />}
      {view.name === "events" && <EventsView />}
      {view.name === "event-detail" && <EventDetailView />}
      {view.name === "blog" && <BlogView />}
      {view.name === "blog-post" && "slug" in view && <BlogPostView slug={view.slug} />}
      {view.name === "cert-landing" && "certSlug" in view && <CertLandingView certSlug={view.certSlug} />}
      {view.name === "admin-courses" && <AdminCoursesView />}
      {view.name === "affiliate" && <AffiliateView />}
      {view.name === "pricing" && <PricingView />}
      {view.name === "admin-seo" && <AdminSeoView />}
      {view.name === "admin-open-schooling-leads" && <AdminOpenSchoolingLeadsView />}
      {view.name === "admin-corporate-leads" && <AdminCorporateLeadsView />}
      {view.name === "admin-cyber-quiz-questions" && <AdminCyberQuizQuestionsView />}
      {view.name === "admin-cyber-quiz-attempts" && <AdminCyberQuizAttemptsView />}
      {view.name === "admin-cyber-quiz-certs" && <AdminCyberQuizCertsView />}
      {view.name === "admin-platform-stats" && <AdminPlatformStatsView />}
      {view.name === "admin-settings" && <AdminSettingsView />}
      {view.name === "course" && <CourseDetailView />}
      {view.name === "lesson" && <LessonView />}
      {view.name === "learning" && <MyLearningView />}
      {view.name === "notes" && <MyNotesView />}
      {view.name === "live" && <LiveSessionsView />}
      {view.name === "labs" && <LabsView />}
      {view.name === "lab" && <LabDetailView />}
      {view.name === "certificates" && <CertificatesView />}
      {view.name === "achievements" && <AchievementsView />}
      {view.name === "leaderboard" && <LeaderboardView />}
      {view.name === "instructor" && <InstructorDashboardView />}
      {view.name === "school" && <SchoolDashboardView />}
      {view.name === "admin" && <AdminDashboardView />}
      {view.name === "community" && <CommunityView />}
      {view.name === "profile" && <ProfileView />}
      {view.name === "assignments" && <AssignmentsView />}
      {view.name === "messaging" && <MessagingView />}
      {view.name === "study-groups" && <StudyGroupsView />}
      {view.name === "office-hours" && <OfficeHoursView />}
      {view.name === "book-session" && <BookSessionView />}
      {/* New feature views */}
      {view.name === "ai-assistant" && <AIAssistantView />}
      {view.name === "threat-feed" && <ThreatFeedView />}
      {view.name === "code-review" && <CodeReviewView />}
      {view.name === "career-planner" && <CareerPlannerView />}
      {view.name === "job-board" && <JobBoardView />}
      {view.name === "mock-interview" && <MockInterviewView />}
      {view.name === "resume-builder" && <ResumeBuilderView />}
      {view.name === "ctf-platform" && <CTFPlatformView />}
      {view.name === "weekly-challenges" && <WeeklyChallengesView />}
      {view.name === "team-missions" && <TeamMissionsView />}
      {view.name === "learning-analytics" && <LearningAnalyticsView />}
      {view.name === "skill-assessments" && <SkillAssessmentsView />}
      {view.name === "prerequisites-visualizer" && <PrerequisitesVisualizerView />}
      {view.name === "lab-snapshots" && <LabSnapshotsView />}
      {view.name === "cyber-range" && <CyberRangeView />}
      {view.name === "learning-paths" && <LearningPathsView />}
      {view.name === "skill-tree" && <SkillTreeView />}
      {view.name === "bug-bounty" && <BugBountyView />}
      {view.name === "parent-portal" && <ParentPortalView />}
      {view.name === "course-studio" && <CourseStudioView />}
      {view.name === "cms" && <CMSDashboardView />}
      {/* Exam platform */}
      {view.name === "exam-detail" && <ExamDetailView />}
    </div>
  )
}
