import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { getConfig } from "./config";

/**
 * 用 GitHub App 安装身份创建 Octokit 客户端。
 * installationId 来自 webhook payload.installation.id
 */
export function createInstallationOctokit(installationId: number): Octokit {
  const { appId, privateKey } = getConfig();
  if (!appId || !privateKey) {
    throw new Error("缺少 GITHUB_APP_ID 或 GITHUB_APP_PRIVATE_KEY");
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey,
      installationId,
    },
  });
}

export interface PulledPrContext {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  htmlUrl: string;
  commitMessages: string[];
  files: Array<{
    filename: string;
    status?: string;
    additions?: number;
    deletions?: number;
    patch?: string;
  }>;
  diff: string;
}

/**
 * 拉取 PR 标题、描述、commit message、文件级 patch，拼成分析输入。
 */
export async function fetchPrContext(
  octokit: Octokit,
  owner: string,
  repo: string,
  number: number,
): Promise<PulledPrContext> {
  const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: number });

  const commits = await octokit.paginate(octokit.pulls.listCommits, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  });

  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  });

  // 统一 diff：优先用 GitHub diff media type；失败则用各文件 patch 拼接
  let diff = "";
  try {
    const diffResp = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner,
      repo,
      pull_number: number,
      headers: { accept: "application/vnd.github.diff" },
    });
    diff = String(diffResp.data);
  } catch {
    diff = files
      .map((f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch || ""}`)
      .join("\n\n");
  }

  return {
    owner,
    repo,
    number,
    title: pr.title || "",
    body: pr.body || "",
    htmlUrl: pr.html_url,
    commitMessages: commits.map((c) => c.commit.message.split("\n")[0] || ""),
    files: files.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    })),
    diff,
  };
}
