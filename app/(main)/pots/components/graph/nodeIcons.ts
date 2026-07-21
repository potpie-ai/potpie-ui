// Icon vocabulary for pot graph nodes, keyed by ontology node label.
//
// Companion to ontology.ts: the palette says which *category* a node belongs
// to, the icon says which *type* it is — both must read identically on the
// canvas discs, in the hover card, and anywhere else a node is summarised.
// Unmapped labels fall back to their category's icon, then to a neutral shape,
// so new backend labels degrade gracefully instead of rendering nothing.

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  BookOpen,
  Bot,
  Box,
  Boxes,
  Braces,
  Bug,
  Cable,
  CalendarRange,
  CircleDot,
  Database,
  Eye,
  FileCode2,
  FileText,
  FolderGit2,
  GitCommit,
  GitPullRequest,
  Globe,
  Hammer,
  Hexagon,
  History,
  Link2,
  MessagesSquare,
  Microscope,
  Network,
  Package,
  Plug,
  Puzzle,
  Radio,
  Rocket,
  Route,
  Ruler,
  Scale,
  Server,
  Settings2,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Sparkles,
  Target,
  Terminal,
  User,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import type { CategoryKey } from "./ontology";

const LABEL_ICONS: Record<string, LucideIcon> = {
  // Scope & identity
  Pot: Box,
  Repository: FolderGit2,
  System: Network,
  Service: Server,
  Environment: Globe,
  Cluster: Boxes,

  // Product architecture
  Capability: Zap,
  Feature: Sparkles,
  Component: Puzzle,
  Interface: Plug,
  APIContract: Braces,
  DataStore: Database,
  Dependency: Package,
  Adapter: Cable,
  CodeAsset: FileCode2,

  // Change & decision
  PullRequest: GitPullRequest,
  Commit: GitCommit,
  Issue: CircleDot,
  Decision: Scale,
  Constraint: Ruler,
  Preference: SlidersHorizontal,
  Policy: ShieldCheck,
  Activity: Activity,

  // Knowledge & evidence
  Document: FileText,
  Conversation: MessagesSquare,
  Episode: History,
  SourceReference: Link2,
  Observation: Eye,
  Period: CalendarRange,

  // Team & ownership
  Person: User,
  Team: Users,
  Agent: Bot,
  Role: BadgeCheck,

  // Delivery & operations
  Deployment: Rocket,
  DeploymentTarget: Target,
  Runbook: BookOpen,
  Script: Terminal,
  ConfigVariable: Settings2,
  Alert: Bell,
  Incident: Siren,

  // Debugging & reliability
  BugPattern: Bug,
  Fix: Wrench,
  Investigation: Microscope,
  DiagnosticSignal: Radio,

  // Quality & drift
  QualityIssue: AlertTriangle,
  MaintenanceJob: Hammer,
  MaterializedPath: Route,
};

const CATEGORY_ICONS: Record<CategoryKey, LucideIcon> = {
  scope_identity: Box,
  product_architecture: Puzzle,
  change_decision: GitPullRequest,
  knowledge_evidence: FileText,
  team_ownership: Users,
  delivery_operations: Rocket,
  debugging_reliability: Bug,
  quality_drift: AlertTriangle,
};

const FALLBACK_ICON = Hexagon;

/** Icon for a node: first mapped label wins, then category, then neutral. */
export function iconForNode(
  labels: string[],
  category: string | null | undefined,
): LucideIcon {
  for (const label of labels) {
    const icon = LABEL_ICONS[label];
    if (icon) return icon;
  }
  if (category && category in CATEGORY_ICONS) {
    return CATEGORY_ICONS[category as CategoryKey];
  }
  return FALLBACK_ICON;
}
