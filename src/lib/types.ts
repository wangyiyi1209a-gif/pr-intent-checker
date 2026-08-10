export type DriftLevel = "aligned" | "minor_drift" | "major_drift" | "unclear";

export interface DriftItem {
  /** Short label, e.g. "extra refactor" */
  title: string;
  /** Why this is considered drift */
  reason: string;
  /** Related file paths when available */
  files?: string[];
  severity: "low" | "medium" | "high";
}

export interface IntentAnalysis {
  id: string;
  createdAt: string;
  source: "webhook" | "demo" | "manual";
  repo?: string;
  prNumber?: number;
  prUrl?: string;
  title: string;
  body: string;
  /** 0-100, higher = more consistent */
  consistencyScore: number;
  level: DriftLevel;
  summary: string;
  statedIntent: string;
  actualChanges: string;
  drifts: DriftItem[];
  matchedPoints: string[];
  recommendations: string[];
  model: string;
  rawDiffStats?: {
    filesChanged: number;
    additions: number;
    deletions: number;
  };
}

export interface AnalyzeInput {
  title: string;
  body?: string;
  commitMessages?: string[];
  diff: string;
  files?: Array<{
    filename: string;
    status?: string;
    additions?: number;
    deletions?: number;
    patch?: string;
  }>;
  source?: IntentAnalysis["source"];
  repo?: string;
  prNumber?: number;
  prUrl?: string;
}

export interface AnalyzeResult {
  consistencyScore: number;
  level: DriftLevel;
  summary: string;
  statedIntent: string;
  actualChanges: string;
  drifts: DriftItem[];
  matchedPoints: string[];
  recommendations: string[];
  model: string;
}
