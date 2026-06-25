const GITHUB_API = "https://api.github.com";

export function githubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

function repoParts(): { owner: string; repo: string } {
  const [owner, repo] = (process.env.GITHUB_REPO || "").split("/");
  if (!owner || !repo) {
    throw new Error("GITHUB_REPO must be set to owner/repo");
  }
  return { owner, repo };
}

function githubHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "dizcog-vault",
  };
}

export async function readRepoFile(
  filePath: string,
): Promise<{ content: string; sha: string } | null> {
  const { owner, repo } = repoParts();
  const branch = process.env.GITHUB_BRANCH || "main";
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;

  const res = await fetch(url, { headers: githubHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub read ${filePath} failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { content: string; sha: string };
  return {
    content: Buffer.from(data.content, "base64").toString("utf8"),
    sha: data.sha,
  };
}

export async function writeRepoFile(
  filePath: string,
  content: string,
  sha: string | undefined,
  message: string,
): Promise<string> {
  const { owner, repo } = repoParts();
  const branch = process.env.GITHUB_BRANCH || "main";
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write ${filePath} failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { content: { sha: string } };
  return data.content.sha;
}
