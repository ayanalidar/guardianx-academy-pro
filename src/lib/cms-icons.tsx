"use client"

/**
 * Maps an icon-name string stored in the CMS (e.g. "GraduationCap",
 * "Shield", "Building2") to the matching lucide-react component.
 *
 * The CMS stores icons as strings so admins can edit them in the
 * Content Studio dashboard. Consumer views use this helper to look
 * up the actual component at render time.
 *
 * Falls back to the `Circle` icon if the name is missing or unknown,
 * so we never crash the UI on a bad string.
 */

import {
  AlertTriangle, Activity, Award, BadgeCheck, BookOpen, Briefcase,
  Bug, Building, Building2, Calendar, CheckCircle2, Circle, Clock,
  Cloud, CloudCog, Code2, Container, Cpu, Crosshair, Crown,
  Database, Eye, FileCheck, Fingerprint, Flag, FlaskConical, FolderSearch,
  Github, Globe, GraduationCap, Instagram, Key, KeyRound, Landmark, Layers,
  Linkedin, Lock, Mail, MapPin, MessageCircle, MessageSquare, Mic, Network, Phone,
  PlayCircle, Radar, Radio, Rocket, Route, ScanLine, School, Server, Shield,
  ShieldAlert, ShieldCheck, Sparkles, Star, Swords, Target, Terminal,
  Tv, Twitter, Users, Wifi, Wrench, Youtube, Zap, TrendingUp, Trophy,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const ICONS: Record<string, LucideIcon> = {
  AlertTriangle, Activity, Award, BadgeCheck, BookOpen, Briefcase,
  Bug, Building, Building2, Calendar, CheckCircle2, Circle, Clock,
  Cloud, CloudCog, Code2, Container, Cpu, Crosshair, Crown,
  Database, Eye, FileCheck, Fingerprint, Flag, FlaskConical, FolderSearch,
  Github, Globe, GraduationCap, Instagram, Key, KeyRound, Landmark, Layers,
  Linkedin, Lock, Mail, MapPin, MessageCircle, MessageSquare, Mic, Network, Phone,
  PlayCircle, Radar, Radio, Rocket, Route, ScanLine, School, Server, Shield,
  ShieldAlert, ShieldCheck, Sparkles, Star, Swords, Target, Terminal,
  Tv, Twitter, Users, Wifi, Wrench, Youtube, Zap, TrendingUp, Trophy,
  // Aliases - lucide-react renamed some icons. Map old names → current
  // component so DB rows that store the legacy name still resolve.
  CloudShield: CloudCog,
}

/**
 * Look up an icon component by name. Returns `Circle` as a safe
 * fallback if the name is missing or unknown.
 */
export function getCmsIcon(name?: string | null): LucideIcon {
  if (!name) return Circle
  return ICONS[name] ?? Circle
}
