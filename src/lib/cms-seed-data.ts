/**
 * Shared CMS seed data — used by:
 *   - prisma/seed-cms.ts (CLI seed script)
 *   - /api/admin/site-content/seed (admin "Seed Defaults" button in the CMS)
 *
 * This module exports ALL_CONTENT: the canonical default content for every
 * public page. The admin can re-seed a specific page from the CMS UI to
 * restore all sections + keys to their defaults.
 */
export type ContentItem = {
  page: string
  section: string
  key: string
  value: any
}

// ============================================================
// HOME PAGE
// ============================================================
const HOME: ContentItem[] = [
  // Hero
  { page: "home", section: "hero", key: "badge", value: "WORLD-CLASS CYBER SECURITY EDUCATION" },
  { page: "home", section: "hero", key: "title", value: "Master the art of" },
  { page: "home", section: "hero", key: "titleAccent", value: "cyber defense." },
  {
    page: "home", section: "hero", key: "description",
    value: "A world-class platform for aspirants, freshers, and working professionals. Certification prep, live workshops, hands-on labs, and corporate training — all in one place."
  },
  { page: "home", section: "hero", key: "ctaPrimary", value: "Explore Courses" },
  { page: "home", section: "hero", key: "ctaSecondary", value: "Start Learning" },

  // Hero stats
  {
    page: "home", section: "stats", key: "items",
    value: [
      { value: 12000, suffix: "+", label: "Learners", color: "text-violet-300" },
      { value: 28, suffix: "+", label: "Courses", color: "text-cyan-300" },
      { value: 31, suffix: "", label: "Labs", color: "text-amber-300" },
      { value: 150, suffix: "+", label: "Partners", color: "text-emerald-300" },
    ]
  },

  // Trust bar
  { page: "home", section: "trust", key: "label", value: "Trusted by defenders at" },
  {
    page: "home", section: "trust", key: "companies",
    value: ["Google", "Microsoft", "Amazon", "IBM", "Cisco", "Palantir", "CrowdStrike"]
  },

  // Who we serve (audiences)
  { page: "home", section: "audiences", key: "eyebrow", value: "WHO WE SERVE" },
  { page: "home", section: "audiences", key: "title", value: "Built for every stage of your" },
  { page: "home", section: "audiences", key: "titleAccent", value: "cyber security journey." },
  {
    page: "home", section: "audiences", key: "items",
    value: [
      { icon: "GraduationCap", title: "Aspirants", desc: "Starting from zero? Build foundations in networking, Linux, and security basics. Beginner-friendly courses with guided paths.", color: "text-violet-400", bg: "bg-violet-500/10", stat: "Start from scratch" },
      { icon: "Briefcase", title: "Freshers", desc: "Land your first security role. Master in-demand certifications like CEH, CCNA, and RHCSA with hands-on lab practice.", color: "text-cyan-400", bg: "bg-cyan-500/10", stat: "Get job-ready" },
      { icon: "ShieldCheck", title: "Working Professionals", desc: "Level up with advanced certs (OSCP, CISSP, CISM). Stay current with threat intelligence and cutting-edge labs.", color: "text-amber-400", bg: "bg-amber-500/10", stat: "Advance your career" },
    ]
  },

  // Courses section heading
  { page: "home", section: "courses", key: "eyebrow", value: "CERTIFICATION COURSES" },
  { page: "home", section: "courses", key: "title", value: "Build skills that survive" },
  { page: "home", section: "courses", key: "titleAccent", value: "the real world." },
  { page: "home", section: "courses", key: "viewAllCta", value: "View All Courses" },

  // Cinematic labs section
  { page: "home", section: "labs", key: "eyebrow", value: "HANDS-ON LABS" },
  { page: "home", section: "labs", key: "title", value: "Train against" },
  { page: "home", section: "labs", key: "titleAccent", value: "real targets." },
  {
    page: "home", section: "labs", key: "description",
    value: "31 Docker-powered labs with live target environments. Each lab spins up a real vulnerable system for you to attack, exploit, and defend."
  },
  {
    page: "home", section: "labs", key: "features",
    value: [
      { icon: "Server", title: "Live Target Environments", desc: "Each lab spins up a Docker container with a real vulnerable system. Not a simulation — a real attack surface." },
      { icon: "Terminal", title: "In-Browser Terminal", desc: "Full Kali Linux terminal in your browser. Run nmap, sqlmap, burp, metasploit — no setup required." },
      { icon: "Target", title: "Dynamic Flags & Auto-Grading", desc: "Each lab generates a unique flag. Submit it for instant grading and XP. No two attempts are the same." },
      { icon: "Activity", title: "Real-Time Progress Tracking", desc: "Track time spent, hints used, attempts made. Build a portfolio of practical skills." },
    ]
  },
  {
    page: "home", section: "labs", key: "poweredBy",
    value: ["Docker", "Kali Linux", "Burp Suite", "Nmap", "Wireshark", "Metasploit", "SIEM"]
  },
  { page: "home", section: "labs", key: "cta", value: "Enter the Cyber Range" },

  // Corporate training section
  { page: "home", section: "corporate", key: "eyebrow", value: "BEYOND COURSES" },
  { page: "home", section: "corporate", key: "title", value: "Training that goes beyond" },
  { page: "home", section: "corporate", key: "titleAccent", value: "the classroom." },
  {
    page: "home", section: "corporate", key: "description",
    value: "We offer corporate trainings, on-demand workshops, and live webinars for teams and individuals."
  },
  {
    page: "home", section: "corporate", key: "items",
    value: [
      { icon: "Briefcase", title: "Corporate Training", desc: "Customized cyber security training programs for organizations. Upskill your workforce with enterprise-grade curriculum.", color: "text-violet-400", bg: "bg-violet-500/10", features: ["Custom curriculum", "On-site or remote", "Team analytics", "Dedicated instructor"] },
      { icon: "Tv", title: "On-Demand Workshops", desc: "Intensive hands-on workshops covering specific topics: pentesting, forensics, cloud security, and more.", color: "text-cyan-400", bg: "bg-cyan-500/10", features: ["1-3 day intensives", "Hands-on labs", "Expert instructors", "Certificate of completion"] },
      { icon: "Mic", title: "Live Webinars", desc: "Free and paid webinars on the latest cyber security trends, threat intelligence, and career guidance.", color: "text-amber-400", bg: "bg-amber-500/10", features: ["Weekly sessions", "Industry experts", "Q&A included", "Recorded for replay"] },
    ]
  },

  // Partner institutions section
  { page: "home", section: "partners", key: "eyebrow", value: "PARTNER INSTITUTIONS" },
  { page: "home", section: "partners", key: "title", value: "On-premises training for" },
  { page: "home", section: "partners", key: "titleAccent", value: "schools, colleges & universities." },
  {
    page: "home", section: "partners", key: "description",
    value: "We partner with educational institutions to deliver world-class cyber security training on their premises."
  },
  {
    page: "home", section: "partners", key: "items",
    value: [
      { type: "Schools", icon: "Building2", desc: "Comprehensive cyber security programs for school students. Includes a complimentary School Management System for MoU partners.", color: "text-emerald-400", bg: "bg-emerald-500/10", cta: "School Portal Login" },
      { type: "Colleges", icon: "BookOpen", desc: "Industry-aligned certification courses integrated into college curriculum. Hands-on labs and instructor-led training.", color: "text-cyan-400", bg: "bg-cyan-500/10", cta: "College Portal Login" },
      { type: "Universities", icon: "Award", desc: "Advanced research-grade cyber security labs, degree integration, and PhD-level coursework for universities.", color: "text-violet-400", bg: "bg-violet-500/10", cta: "University Portal Login" },
    ]
  },
  { page: "home", section: "partners", key: "benefitsEyebrow", value: "PARTNER BENEFITS" },
  { page: "home", section: "partners", key: "benefitsTitle", value: "Why institutions choose GuardianX." },
  {
    page: "home", section: "benefits", key: "items",
    value: [
      { icon: "Building2", title: "School Management System", desc: "Complimentary full-featured school management software for MoU partners. Manage students, attendance, grades, and more — separate from our training platform.", color: "text-violet-400", bg: "bg-violet-500/10" },
      { icon: "FlaskConical", title: "31 Docker-Powered Labs", desc: "Production-grade cyber range with live targets. Students practice on real vulnerabilities, not simulations.", color: "text-cyan-400", bg: "bg-cyan-500/10" },
      { icon: "Award", title: "Verifiable Certificates", desc: "Tamper-evident, publicly verifiable credentials. Employers can validate any certificate by ID.", color: "text-amber-400", bg: "bg-amber-500/10" },
      { icon: "Users", title: "On-Premises Training", desc: "We deliver training at your institution. Instructors, labs, and materials brought to your campus.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { icon: "Target", title: "Real-Time Analytics", desc: "Track student progress, attendance, engagement, and career outcomes in real-time.", color: "text-rose-400", bg: "bg-rose-500/10" },
      { icon: "Globe", title: "Bulk Student Import", desc: "Onboard entire batches via CSV. Auto-generate accounts, enroll in courses, assign instructors.", color: "text-teal-400", bg: "bg-teal-500/10" },
    ]
  },
  { page: "home", section: "partners", key: "exploreCta", value: "Explore Partners" },
  { page: "home", section: "partners", key: "mouCta", value: "Sign an MoU" },

  // Final CTA
  { page: "home", section: "finalCta", key: "title", value: "Become unstoppable." },
  {
    page: "home", section: "finalCta", key: "subtitle",
    value: "Join 12,000+ defenders advancing their careers. Free to start. No credit card."
  },
  { page: "home", section: "finalCta", key: "ctaPrimary", value: "Start Free Today" },
  { page: "home", section: "finalCta", key: "ctaSecondary", value: "Talk to Us" },
]

// ============================================================
// IMPACT PAGE
// ============================================================
const IMPACT: ContentItem[] = [
  // Hero
  { page: "impact", section: "hero", key: "badge", value: "OUR IMPACT" },
  { page: "impact", section: "hero", key: "title", value: "Transforming careers," },
  { page: "impact", section: "hero", key: "titleAccent", value: "securing the future." },
  {
    page: "impact", section: "hero", key: "description",
    value: "Every number tells a story — a learner who leveled up their career, an institution that transformed its curriculum, and a community quietly making the digital world safer."
  },
  {
    page: "impact", section: "hero", key: "pills",
    value: [
      { icon: "ShieldCheck", label: "Verified outcomes" },
      { icon: "Network", label: "Pan-India reach" },
      { icon: "Cpu", label: "Industry-aligned" },
    ]
  },

  // Stats
  { page: "impact", section: "stats", key: "eyebrow", value: "BY THE NUMBERS" },
  { page: "impact", section: "stats", key: "title", value: "Scale that creates real opportunity" },
  {
    page: "impact", section: "stats", key: "items",
    value: [
      { value: 12000, suffix: "+", label: "Active Learners", icon: "Users", accent: "text-violet-300", tint: "bg-violet-500/10" },
      { value: 8500, suffix: "+", label: "Certificates Issued", icon: "Award", accent: "text-amber-300", tint: "bg-amber-500/10" },
      { value: 94, suffix: "%", label: "Exam Pass Rate", icon: "Target", accent: "text-cyan-300", tint: "bg-cyan-500/10" },
      { value: 150, suffix: "+", label: "Partner Institutions", icon: "Building2", accent: "text-violet-300", tint: "bg-violet-500/10" },
      { value: 31, suffix: "", label: "Hands-on Labs", icon: "Zap", accent: "text-rose-300", tint: "bg-rose-500/10" },
      { value: 28, suffix: "+", label: "Certification Tracks", icon: "Trophy", accent: "text-teal-300", tint: "bg-teal-500/10" },
    ]
  },

  // Career outcomes
  { page: "impact", section: "outcomes", key: "eyebrow", value: "CAREER OUTCOMES" },
  { page: "impact", section: "outcomes", key: "title", value: "Real results, real careers" },
  {
    page: "impact", section: "outcomes", key: "description",
    value: "Measured impact on our learners' professional trajectories, tracked 6–12 months post-certification."
  },
  {
    page: "impact", section: "outcomes", key: "items",
    value: [
      { icon: "TrendingUp", value: 68, prefix: "", suffix: "%", label: "Career advancement", accent: "text-violet-300", desc: "of certified learners report a promotion or new role within 6 months." },
      { icon: "Briefcase", value: 12, prefix: "₹", suffix: "L", label: "Avg salary increase", accent: "text-amber-300", desc: "post-certification compensation jump for Indian professionals." },
      { icon: "Rocket", value: 3.2, prefix: "", suffix: "x", label: "More interview calls", accent: "text-cyan-300", desc: "compared to non-certified peers in the same talent pool." },
      { icon: "BadgeCheck", value: 92, prefix: "", suffix: "%", label: "Job placement rate", accent: "text-teal-300", desc: "for graduates of our intensive cyber security bootcamps." },
    ]
  },

  // Success stories
  { page: "impact", section: "stories", key: "eyebrow", value: "SUCCESS STORIES" },
  { page: "impact", section: "stories", key: "title", value: "Learners who became guardians" },
  { page: "impact", section: "stories", key: "description", value: "Real journeys from our community — verified by their certificates." },
  {
    page: "impact", section: "stories", key: "items",
    value: [
      { name: "Priya Sharma", transition: "Security Analyst → SOC Lead", company: "TCS Cyber Defense", avatar: "PS", tint: "bg-violet-500/15 text-violet-200", cert: "CEH", quote: "GuardianX's CEH track was a complete game-changer. The hands-on labs gave me real confidence during incident response. Within 4 months of certification, I was promoted to SOC Lead." },
      { name: "Rahul Verma", transition: "Network Engineer → Security Engineer", company: "Infosys", avatar: "RV", tint: "bg-cyan-500/15 text-cyan-200", cert: "CCNP Security", quote: "The CCNA + CCNP Security tracks were exactly what I needed. Live sessions with industry experts were invaluable — I now lead security initiatives across enterprise networks." },
      { name: "Ananya Reddy", transition: "Student → Penetration Tester", company: "Wipro", avatar: "AR", tint: "bg-amber-500/15 text-amber-200", cert: "WAPT", quote: "As a fresher, the WAPT labs gave me hands-on experience no textbook could. I landed my pentest role directly because of the skills I demonstrated in the technical interview." },
    ]
  },

  // Partner institutions (impact page)
  { page: "impact", section: "mission", key: "eyebrow", value: "PARTNER INSTITUTIONS" },
  { page: "impact", section: "mission", key: "title", value: "Educating the next generation" },
  {
    page: "impact", section: "mission", key: "description",
    value: "We partner with schools, colleges, and universities to bring cyber security education to their students — verified curricula, shared labs, and joint certifications."
  },
  {
    page: "impact", section: "mission", key: "partners",
    value: [
      { type: "Schools", count: 85, icon: "Building2", accent: "text-violet-300", tint: "bg-violet-500/10" },
      { type: "Colleges", count: 45, icon: "GraduationCap", accent: "text-cyan-300", tint: "bg-cyan-500/10" },
      { type: "Universities", count: 20, icon: "Trophy", accent: "text-amber-300", tint: "bg-amber-500/10" },
    ]
  },
  { page: "impact", section: "mission", key: "cta", value: "Become a Partner" },
]

// ============================================================
// CONTACT PAGE
// ============================================================
const CONTACT: ContentItem[] = [
  // Hero
  { page: "contact", section: "hero", key: "badge", value: "CONTACT US" },
  { page: "contact", section: "hero", key: "title", value: "Let's build a" },
  { page: "contact", section: "hero", key: "titleAccent", value: "safer world together" },
  {
    page: "contact", section: "hero", key: "description",
    value: "Have questions about courses, partnerships, or anything else? We'd love to hear from you — our team responds fast."
  },

  // Contact info
  {
    page: "contact", section: "contactInfo", key: "items",
    value: [
      { icon: "Mail", label: "Email", value: "hello@guardianx.in", href: "mailto:hello@guardianx.in", color: "text-violet-300", bg: "bg-violet-500/10" },
      { icon: "Phone", label: "Phone", value: "+91-70067-1234-7", href: "tel:+917006712347", color: "text-cyan-300", bg: "bg-cyan-500/10" },
      { icon: "MapPin", label: "Address", value: "Baramulla, Kashmir", href: "https://maps.google.com/?q=Nooripora+Pattan+Baramulla+Kashmir+193401", color: "text-amber-300", bg: "bg-amber-500/10" },
      { icon: "Globe", label: "Website", value: "guardianx.in", href: "https://guardianx.in", color: "text-violet-300", bg: "bg-violet-500/10" },
    ]
  },
  {
    page: "contact", section: "contactInfo", key: "addressLines",
    value: ["110 - Nooripora", "Tehsil Pattan, District Baramulla", "Kashmir, India 193401"]
  },
  { page: "contact", section: "contactInfo", key: "hours", value: "Mon - Sat · 9:00 AM - 6:00 PM IST" },
  { page: "contact", section: "contactInfo", key: "officeName", value: "GuardianX Academy HQ" },
  { page: "contact", section: "contactInfo", key: "mapLocationLabel", value: "Pattan, Baramulla" },
  { page: "contact", section: "contactInfo", key: "mapLocationSub", value: "Kashmir, India 193401" },

  // Form fields
  { page: "contact", section: "formFields", key: "title", value: "Send us a message" },
  { page: "contact", section: "formFields", key: "subtitle", value: "Fill out the form and our team will respond within 24 hours." },
  { page: "contact", section: "formFields", key: "nameLabel", value: "Full Name" },
  { page: "contact", section: "formFields", key: "namePlaceholder", value: "Jane Doe" },
  { page: "contact", section: "formFields", key: "emailLabel", value: "Email" },
  { page: "contact", section: "formFields", key: "emailPlaceholder", value: "jane@example.com" },
  { page: "contact", section: "formFields", key: "categoryLabel", value: "Category" },
  { page: "contact", section: "formFields", key: "subjectLabel", value: "Subject" },
  { page: "contact", section: "formFields", key: "subjectPlaceholder", value: "How can we help?" },
  { page: "contact", section: "formFields", key: "messageLabel", value: "Message" },
  { page: "contact", section: "formFields", key: "messagePlaceholder", value: "Tell us more about what you need..." },
  { page: "contact", section: "formFields", key: "submitCta", value: "Send Message" },
  {
    page: "contact", section: "formFields", key: "categories",
    value: [
      { value: "general", label: "General Inquiry", icon: "MessageSquare" },
      { value: "partnership", label: "Institution Partnership", icon: "Building2" },
      { value: "courses", label: "Course Information", icon: "GraduationCap" },
      { value: "technical", label: "Technical Support", icon: "Shield" },
      { value: "careers", label: "Careers", icon: "Briefcase" },
    ]
  },
  {
    page: "contact", section: "formFields", key: "responseTimes",
    value: [
      { label: "General inquiries", time: "< 24 hours", color: "text-violet-300 border-violet-500/30" },
      { label: "Partnership requests", time: "< 48 hours", color: "text-cyan-300 border-cyan-500/30" },
      { label: "Technical support", time: "< 12 hours", color: "text-amber-300 border-amber-500/30" },
      { label: "Careers", time: "Ongoing", color: "text-violet-300 border-violet-500/30" },
    ]
  },
  {
    page: "contact", section: "formFields", key: "socials",
    value: [
      { icon: "Twitter", label: "Twitter", href: "#" },
      { icon: "Linkedin", label: "LinkedIn", href: "#" },
      { icon: "Github", label: "GitHub", href: "#" },
      { icon: "Youtube", label: "YouTube", href: "#" },
    ]
  },
  { page: "contact", section: "formFields", key: "successTitle", value: "Message sent!" },
  {
    page: "contact", section: "formFields", key: "successDesc",
    value: "Thanks for reaching out. We'll get back to you at the email you provided."
  },
  { page: "contact", section: "formFields", key: "successCta", value: "Send another message" },
  { page: "contact", section: "formFields", key: "connectTitle", value: "Connect with us" },
  { page: "contact", section: "formFields", key: "officeCardTitle", value: "Our Office" },
  { page: "contact", section: "formFields", key: "responseTitle", value: "Response Times" },

  // FAQ section
  { page: "contact", section: "faq", key: "eyebrow", value: "FAQ" },
  { page: "contact", section: "faq", key: "title", value: "Frequently asked questions" },
  { page: "contact", section: "faq", key: "subtitle", value: "Quick answers to common questions." },
  {
    page: "contact", section: "faq", key: "items",
    value: [
      { q: "How do I enroll in a course?", a: "Create a free account, browse our course catalog, and click 'Enroll' on any course. Most courses are free to start, and you can upgrade to a certification track anytime." },
      { q: "Are the certificates verifiable?", a: "Yes! Every certificate issued by GuardianX has a unique ID (GX-XXXXX) that can be publicly verified on our homepage by employers and recruiters — no login required." },
      { q: "How do hands-on labs work?", a: "Our labs run in Docker containers that spin up on demand. Each lab has a target environment and a flag to capture. Submit the flag for instant grading and XP." },
      { q: "Can my school, college, or university partner with GuardianX?", a: "Absolutely. We partner with institutions across India and beyond. Use the form above with category 'Institution Partnership' and we'll set up your dedicated multi-tenant portal." },
      { q: "Do you offer live sessions?", a: "Yes. Instructors host live screen-sharing workshops with two-way voice and a collaborative whiteboard. Check the Live Sessions tab in your dashboard for upcoming sessions." },
      { q: "Where is GuardianX Academy based?", a: "Our office is at 110 - Nooripora, Tehsil Pattan, District Baramulla, Kashmir, India 193401. Reach us by email at hello@guardianx.in or phone at +91-70067-1234-7." },
    ]
  },
  { page: "contact", section: "faq", key: "stillQuestionsLabel", value: "Still have questions?" },
  { page: "contact", section: "faq", key: "stillQuestionsCta", value: "Create an account to get started" },
]

// ============================================================
// INSTITUTIONS PAGE
// ============================================================
const INSTITUTIONS: ContentItem[] = [
  // Hero
  { page: "institutions", section: "hero", key: "eyebrow", value: "INSTITUTIONAL PARTNERSHIPS" },
  { page: "institutions", section: "hero", key: "title", value: "On-premises training for" },
  { page: "institutions", section: "hero", key: "titleAccent", value: "schools, colleges & universities." },
  {
    page: "institutions", section: "hero", key: "description",
    value: "GuardianX delivers cybersecurity training directly at your campus — your classrooms, your labs, your schedule. From secondary schools to research universities, we build job-ready defenders through a single, integrated platform."
  },
  { page: "institutions", section: "hero", key: "ctaPrimary", value: "Sign an MoU" },
  { page: "institutions", section: "hero", key: "ctaSecondary", value: "Build Your Cybersecurity Program" },
  {
    page: "institutions", section: "hero", key: "stats",
    value: [
      { value: 150, suffix: "+", label: "Institutions", color: "text-violet-300" },
      { value: 12000, suffix: "+", label: "Students", color: "text-cyan-300" },
      { value: 8500, suffix: "+", label: "Certs Issued", color: "text-amber-300" },
    ]
  },
  {
    page: "institutions", section: "hero", key: "networkStats",
    value: [
      { label: "Schools", value: "85+", color: "text-emerald-300" },
      { label: "Colleges", value: "42+", color: "text-cyan-300" },
      { label: "Universities", value: "23+", color: "text-violet-300" },
    ]
  },
  { page: "institutions", section: "hero", key: "badge", value: "EDUCATIONAL NETWORK" },

  // Partner types
  { page: "institutions", section: "partnerTypes", key: "eyebrow", value: "WHO WE PARTNER WITH" },
  { page: "institutions", section: "partnerTypes", key: "title", value: "Three institution types." },
  { page: "institutions", section: "partnerTypes", key: "titleAccent", value: "One training platform." },
  {
    page: "institutions", section: "partnerTypes", key: "description",
    value: "Each partner type gets its own dedicated login portal, training schedule, and curriculum alignment. Choose your institution to learn more."
  },
  {
    page: "institutions", section: "partnerTypes", key: "items",
    value: [
      {
        type: "School", title: "Schools",
        description: "On-premises cyber security training for secondary schools (grades 9-12). Build early foundations in safe hacking, digital citizenship, and STEM-aligned security electives with year-round GuardianX cohorts.",
        icon: "School", accent: "text-emerald-300", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/40",
        ctaLabel: "School Portal Login",
        highlight: "Complimentary School Management System for MoU partners",
        highlightIcon: "Database"
      },
      {
        type: "College", title: "Colleges",
        description: "On-premises training for engineering, technical, and degree colleges. Run dedicated cyber security electives, weekend bootcamps, and an on-campus cyber range powered by GuardianX labs.",
        icon: "Building", accent: "text-cyan-300", bg: "bg-cyan-500/10", border: "hover:border-cyan-500/40",
        ctaLabel: "College Portal Login"
      },
      {
        type: "University", title: "Universities",
        description: "On-premises training for research-focused universities. Full B.Tech / M.Tech track integration, PhD-grade lab access, and GuardianX as the official practice platform for your department.",
        icon: "Landmark", accent: "text-violet-300", bg: "bg-violet-500/10", border: "hover:border-violet-500/40",
        ctaLabel: "University Portal Login"
      },
    ]
  },

  // Benefits
  { page: "institutions", section: "benefits", key: "eyebrow", value: "PARTNER BENEFITS" },
  { page: "institutions", section: "benefits", key: "title", value: "Everything your institution unlocks." },
  {
    page: "institutions", section: "benefits", key: "description",
    value: "On-premises training delivery, a dedicated cyber range, a separate School Management System for MoU partners, and full program analytics — all in one partnership."
  },
  {
    page: "institutions", section: "benefits", key: "items",
    value: [
      { icon: "Database", title: "School Management System", desc: "A SEPARATE product for MoU partners (not our training platform). Manage students, attendance, batches, fees, and grades from one dashboard.", color: "text-emerald-400", bg: "bg-emerald-500/10", tag: "MoU partners only" },
      { icon: "FlaskConical", title: "31 Docker Labs", desc: "Docker-powered hands-on labs with live targets. No setup required — students start practicing on day one, on-premises.", color: "text-violet-400", bg: "bg-violet-500/10", tag: "Cyber range" },
      { icon: "Award", title: "Verifiable Certificates", desc: "Tamper-evident certificates with public verification. Employers and academic institutions can verify any credential by ID.", color: "text-amber-400", bg: "bg-amber-500/10", tag: "Industry recognized" },
      { icon: "Server", title: "On-Premises Training", desc: "We deliver training at your campus — your classrooms, your labs, your schedule. Our instructors travel to your institution.", color: "text-cyan-400", bg: "bg-cyan-500/10", tag: "In-person" },
      { icon: "Activity", title: "Real-Time Analytics", desc: "Track student progress, attendance, engagement, and certification outcomes. Data-driven decisions for program directors.", color: "text-rose-400", bg: "bg-rose-500/10", tag: "Live insights" },
      { icon: "Users", title: "Bulk Student Import", desc: "CSV upload, batch management, unique school codes, and attendance tracking. Onboard 1,000 students in under an hour.", color: "text-teal-400", bg: "bg-teal-500/10", tag: "At scale" },
    ]
  },

  // Flow steps
  { page: "institutions", section: "flowSteps", key: "eyebrow", value: "THE PATH" },
  { page: "institutions", section: "flowSteps", key: "title", value: "Your institution." },
  { page: "institutions", section: "flowSteps", key: "titleAccent", value: "Our cyber range." },
  {
    page: "institutions", section: "flowSteps", key: "description",
    value: "From onboarding students to issuing industry-recognized certificates — every step runs inside the GuardianX platform, on your premises."
  },
  {
    page: "institutions", section: "flowSteps", key: "items",
    value: [
      { step: "Students", icon: "Users", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/30" },
      { step: "Courses", icon: "BookOpen", color: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
      { step: "Labs", icon: "FlaskConical", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/30" },
      { step: "Assessments", icon: "Target", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    ]
  },

  // Partnership models
  { page: "institutions", section: "models", key: "eyebrow", value: "PARTNERSHIP MODELS" },
  { page: "institutions", section: "models", key: "title", value: "Choose your partnership." },
  {
    page: "institutions", section: "models", key: "description",
    value: "Four engagement models. Pick the one that matches your institution's stage and scale."
  },
  {
    page: "institutions", section: "models", key: "items",
    value: [
      { title: "Academic", icon: "GraduationCap", desc: "For schools, colleges, and universities. Full curriculum integration with on-premises training delivery and academic-grade reporting.", color: "text-violet-400", bg: "bg-violet-500/10", features: ["Curriculum mapping", "On-premises delivery", "Academic reporting", "Faculty training"] },
      { title: "Enterprise", icon: "Building2", desc: "For corporations. Upskill your workforce with enterprise-grade security training and custom-tailored threat scenarios.", color: "text-cyan-400", bg: "bg-cyan-500/10", features: ["Custom curriculum", "On-site or remote", "Team analytics", "Dedicated instructor"] },
      { title: "Training Partner", icon: "Briefcase", desc: "For training institutes. Offer GuardianX courses under your brand with revenue share and white-label portal access.", color: "text-amber-400", bg: "bg-amber-500/10", features: ["White-label portal", "Revenue sharing", "Co-branded certs", "Partner support"] },
      { title: "Campus Program", icon: "Users", desc: "For student communities and cyber clubs. Affordable cohort access with mentorship and competition-ready practice labs.", color: "text-emerald-400", bg: "bg-emerald-500/10", features: ["Cohort pricing", "Mentor support", "CTF practice", "Career guidance"] },
    ]
  },
  { page: "institutions", section: "models", key: "cta", value: "Enquire" },

  // Final CTA
  { page: "institutions", section: "finalCta", key: "badge", value: "MEMORANDUM OF UNDERSTANDING" },
  { page: "institutions", section: "finalCta", key: "title", value: "Sign an MoU." },
  { page: "institutions", section: "finalCta", key: "titleAccent", value: "Build your cybersecurity program." },
  {
    page: "institutions", section: "finalCta", key: "description",
    value: "Let's transform your institution's cyber education together — on your premises, with our cyber range, instructors, and a dedicated School Management System for MoU partners."
  },
  { page: "institutions", section: "finalCta", key: "ctaPrimary", value: "Sign an MoU" },
  { page: "institutions", section: "finalCta", key: "ctaSecondary", value: "Build Your Cybersecurity Program" },
  {
    page: "institutions", section: "finalCta", key: "trustFooter",
    value: [
      { label: "MoU Setup", value: "2-4 weeks", icon: "FileCheck", color: "text-violet-300" },
      { label: "On-Prem Visit", value: "Scheduled", icon: "Server", color: "text-cyan-300" },
      { label: "Instructor-led", value: "Year-round", icon: "GraduationCap", color: "text-amber-300" },
      { label: "Renewal", value: "Annual", icon: "Calendar", color: "text-emerald-300" },
    ]
  },
]

// ============================================================
// CATALOG PAGE
// ============================================================
const CATALOG: ContentItem[] = [
  { page: "catalog", section: "hero", key: "eyebrow", value: "CATALOG" },
  { page: "catalog", section: "hero", key: "title", value: "Find your" },
  { page: "catalog", section: "hero", key: "titleAccent", value: "path." },
  {
    page: "catalog", section: "hero", key: "description",
    value: "27 certification tracks across ethical hacking, networking, web security, IAM, and more — from beginner fundamentals to advanced specializations."
  },
  {
    page: "catalog", section: "filters", key: "statCards",
    value: [
      { label: "Total Courses", icon: "BookOpen", color: "text-violet-300", tint: "bg-violet-500/10", defaultValue: 27 },
      { label: "Total Students", icon: "Users", color: "text-cyan-300", tint: "bg-cyan-500/10", defaultValue: 12000 },
      { label: "Practice Labs", icon: "FlaskConical", color: "text-amber-300", tint: "bg-amber-500/10", defaultValue: 31 },
      { label: "Avg Rating", icon: "Star", color: "text-emerald-300", tint: "bg-emerald-500/10", defaultValue: 4.8 },
    ]
  },
  { page: "catalog", section: "filters", key: "searchPlaceholder", value: "Search courses, certifications, topics..." },
  { page: "catalog", section: "filters", key: "emptyTitle", value: "No courses found." },
  { page: "catalog", section: "filters", key: "emptyDesc", value: "Try adjusting your filters or clearing them." },
  { page: "catalog", section: "filters", key: "listEyebrow", value: "ALL COURSES" },
  { page: "catalog", section: "filters", key: "listTitle", value: "Explore the catalog" },
  { page: "catalog", section: "filters", key: "listSuffix", value: "TRACKS" },
  {
    page: "catalog", section: "filters", key: "categories",
    value: ["All", "Ethical Hacking", "Networking", "Web Security", "System Administration", "Security Management", "Identity & Access", "Cloud Security"]
  },
  {
    page: "catalog", section: "filters", key: "levels",
    value: ["All", "Beginner", "Intermediate", "Advanced"]
  },
]

// ============================================================
// AUTH PAGE
// ============================================================
const AUTH: ContentItem[] = [
  { page: "auth", section: "hero", key: "title", value: "Master Cyber Security." },
  { page: "auth", section: "hero", key: "titleAccent", value: "Become a Guardian." },
  {
    page: "auth", section: "hero", key: "description",
    value: "Industry-leading certification prep, live screen-sharing workshops, and hands-on offensive security labs — all in one platform built for defenders."
  },
  { page: "auth", section: "hero", key: "tagline", value: "cyber security · certification · labs" },
  { page: "auth", section: "hero", key: "statusBadge", value: "SYSTEM ONLINE" },
  { page: "auth", section: "hero", key: "trustFooter", value: "Encrypted · SOC2-aligned · Built for defenders" },
  {
    page: "auth", section: "hero", key: "features",
    value: [
      { icon: "Terminal", title: "Certification Tracks", desc: "CEH · CISSP · CCNA · CCNP · RHCSA + 22 more" },
      { icon: "Zap", title: "Live Workshops", desc: "Screen-share with two-way voice & whiteboard" },
      { icon: "Shield", title: "Hands-on Labs", desc: "31 real offensive-security CTF challenges" },
      { icon: "GraduationCap", title: "Verifiable Certs", desc: "Public verification for employers & recruiters" },
      { icon: "Building2", title: "School Portal", desc: "Multi-tenant dashboards for institutions" },
      { icon: "BadgeCheck", title: "Industry Recognized", desc: "Trusted by 12,000+ cyber defenders" },
    ]
  },
  {
    page: "auth", section: "hero", key: "stats",
    value: [
      { value: "12K+", label: "Learners", icon: "Users", color: "text-violet-300" },
      { value: "27+", label: "Courses", icon: "BookOpen", color: "text-cyan-300" },
      { value: "31", label: "Labs", icon: "Shield", color: "text-amber-300" },
    ]
  },

  // Tabs
  {
    page: "auth", section: "tabs", key: "items",
    value: [
      { value: "login", label: "Sign In" },
      { value: "school", label: "School" },
      { value: "register", label: "Register" },
    ]
  },
  { page: "auth", section: "tabs", key: "loginTitle", value: "Sign in to continue" },
  { page: "auth", section: "tabs", key: "loginSubtitle", value: "Access your learning dashboard, labs, and live sessions." },
  { page: "auth", section: "tabs", key: "schoolTitle", value: "Institution Portal Login" },
  { page: "auth", section: "tabs", key: "schoolSubtitle", value: "Access your school, college, or university dashboard." },
  { page: "auth", section: "tabs", key: "registerTitle", value: "Create your account" },
  { page: "auth", section: "tabs", key: "registerSubtitle", value: "Start your cyber security journey today." },
  { page: "auth", section: "tabs", key: "emailLabel", value: "Email" },
  { page: "auth", section: "tabs", key: "passwordLabel", value: "Password" },
  { page: "auth", section: "tabs", key: "nameLabel", value: "Full Name" },
  { page: "auth", section: "tabs", key: "schoolCodeLabel", value: "School Code" },
  { page: "auth", section: "tabs", key: "schoolEmailLabel", value: "Admin Email" },
  { page: "auth", section: "tabs", key: "schoolPassLabel", value: "Password" },
  { page: "auth", section: "tabs", key: "loginCta", value: "Sign In" },
  { page: "auth", section: "tabs", key: "registerCta", value: "Create Account" },
  { page: "auth", section: "tabs", key: "schoolCta", value: "Access Institution Portal" },
  { page: "auth", section: "tabs", key: "schoolInstitutionLink", value: "Login as Institution →" },
  { page: "auth", section: "tabs", key: "registerLink", value: "Create account →" },
  { page: "auth", section: "tabs", key: "backToIndividual", value: "← Back to individual login" },
  { page: "auth", section: "tabs", key: "quickDemoLabel", value: "QUICK DEMO ACCESS" },
  { page: "auth", section: "tabs", key: "registerTerms", value: "By signing up, you agree to our Terms of Service and Privacy Policy." },
  {
    page: "auth", section: "tabs", key: "schoolInfoBox",
    value: "Each school, college, and university has a unique School Code for secure multi-tenant access."
  },
  {
    page: "auth", section: "tabs", key: "demoAccounts",
    value: [
      { label: "Student", email: "student@guardianx.io", icon: "GraduationCap", color: "text-violet-300", tint: "bg-violet-500/10 border-violet-500/30" },
      { label: "Instructor", email: "instructor@guardianx.io", icon: "User", color: "text-cyan-300", tint: "bg-cyan-500/10 border-cyan-500/30" },
      { label: "Admin", email: "admin@guardianx.io", icon: "Shield", color: "text-amber-300", tint: "bg-amber-500/10 border-amber-500/30" },
    ]
  },
]

// ============================================================
// GLOBAL HEADER & FOOTER
// ============================================================
const GLOBAL_HEADER: ContentItem[] = [
  { page: "global", section: "header", key: "brandName", value: "GuardianX" },
  { page: "global", section: "header", key: "brandAccent", value: "X" },
  { page: "global", section: "header", key: "tagline", value: "SECURE · LEARN · DEFEND" },
  {
    page: "global", section: "header", key: "navLinks",
    value: [
      { label: "Home", view: "home", icon: "Home" },
      { label: "Courses", view: "catalog", icon: "Shield" },
      { label: "Partners", view: "institutions", icon: "Building2" },
      { label: "Impact", view: "impact", icon: "TrendingUp" },
      { label: "Contact", view: "contact", icon: "Mail" },
    ]
  },
  { page: "global", section: "header", key: "loginCta", value: "Login" },
]

const GLOBAL_FOOTER: ContentItem[] = [
  { page: "global", section: "footer", key: "eyebrow", value: "READY?" },
  { page: "global", section: "footer", key: "ctaTitle", value: "Start your" },
  { page: "global", section: "footer", key: "ctaTitleAccent", value: "journey today." },
  {
    page: "global", section: "footer", key: "ctaSubtitle",
    value: "Free to start. No credit card. Join 12,000+ defenders."
  },
  { page: "global", section: "footer", key: "ctaButton", value: "Create Free Account" },
  { page: "global", section: "footer", key: "brandName", value: "GuardianX" },
  { page: "global", section: "footer", key: "brandDesc", value: "Building tomorrow's cyber guardians." },
  { page: "global", section: "footer", key: "badge", value: "SOC2-ALIGNED" },
  {
    page: "global", section: "footer", key: "links",
    value: [
      { title: "Platform", items: [
        { label: "Courses", view: "login" },
        { label: "Cyber Labs", view: "login" },
        { label: "Live Sessions", view: "login" },
        { label: "Certifications", view: "login" },
      ]},
      { title: "Company", items: [
        { label: "Home", view: "home" },
        { label: "Impact", view: "impact" },
        { label: "Contact", view: "contact" },
        { label: "School Portal", view: "login" },
      ]},
    ]
  },
  {
    page: "global", section: "footer", key: "contactInfo",
    value: [
      { icon: "Mail", value: "academy@guardianx.in" },
      { icon: "Phone", value: "+91 80 1234 5678" },
      { icon: "MapPin", value: "Nooripora, Baramulla, Kashmir 193401 & Gautam Buddha Nagar, Noida 201301" },
    ]
  },
  {
    page: "global", section: "footer", key: "socialLinks",
    value: [
      { icon: "Github", label: "GitHub", href: "#" },
      { icon: "Linkedin", label: "LinkedIn", href: "#" },
      { icon: "Twitter", label: "Twitter", href: "#" },
      { icon: "Youtube", label: "YouTube", href: "#" },
    ]
  },
  { page: "global", section: "footer", key: "copyright", value: "GuardianX Academy" },
  {
    page: "global", section: "footer", key: "legalLinks",
    value: ["Privacy", "Terms", "Security"]
  },
]

export const ALL_CONTENT: ContentItem[] = [
  ...HOME,
  ...IMPACT,
  ...CONTACT,
  ...INSTITUTIONS,
  ...CATALOG,
  ...AUTH,
  ...GLOBAL_HEADER,
  ...GLOBAL_FOOTER,
]
