import fs from "fs";
import path from "path";
import type { IntentAnalysis } from "./types";

/**
 * 简易 JSON 文件数据库（适合 MVP / 单机 Docker）。
 * 上线到多实例时，可换成 Postgres / Redis；PR 评论本身已是持久结果。
 */
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "analyses.json");

function ensureStore(): IntentAnalysis[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, "[]", "utf-8");
  }
  const raw = fs.readFileSync(STORE_FILE, "utf-8");
  try {
    return JSON.parse(raw) as IntentAnalysis[];
  } catch {
    return [];
  }
}

function writeStore(items: IntentAnalysis[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export function listAnalyses(limit = 50): IntentAnalysis[] {
  try {
    return ensureStore()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export function getAnalysis(id: string): IntentAnalysis | undefined {
  try {
    return ensureStore().find((item) => item.id === id);
  } catch {
    return undefined;
  }
}

export function saveAnalysis(analysis: IntentAnalysis): IntentAnalysis {
  try {
    const items = ensureStore();
    items.unshift(analysis);
    // 只保留最近 500 条，避免文件无限增大
    writeStore(items.slice(0, 500));
  } catch (error) {
    // 某些云平台磁盘只读：分析仍可返回给调用方，只是不落盘
    console.error("[store] write failed:", error);
  }
  return analysis;
}
