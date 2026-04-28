// ============================================================
// Strapped Admin - GitHub API Storage Layer
// ============================================================
// Reads and writes JSON files to the GitHub repo via API.
// Used in production (Vercel) where the local filesystem is read-only.

const GITHUB_API = 'https://api.github.com';

interface CacheEntry {
  data: any;
  sha: string;
  timestamp: number;
}

const fileCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5_000; // 5 seconds

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set');
  return token;
}

function getRepo(): string {
  return process.env.GITHUB_REPO || 'strappedplate-cloud/strapped-admin';
}

function getBranch(): string {
  return process.env.GITHUB_DATA_BRANCH || 'main';
}

function headers(contentType?: boolean): Record<string, string> {
  const h: Record<string, string> = {
    'Authorization': `Bearer ${getToken()}`,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (contentType) h['Content-Type'] = 'application/json';
  return h;
}

/**
 * Read a JSON file from the GitHub repo.
 * Handles files > 1MB via Blobs API.
 * Returns parsed data + SHA for subsequent writes.
 */
export async function readGithubJson<T>(
  filepath: string,
  defaultValue: T[] = []
): Promise<{ data: T[]; sha: string }> {
  // Check cache
  const cached = fileCache.get(filepath);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { data: cached.data as T[], sha: cached.sha };
  }

  const repo = getRepo();
  const branch = getBranch();

  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${filepath}?ref=${branch}`,
    { headers: headers(), cache: 'no-store' }
  );

  if (res.status === 404) {
    return { data: defaultValue as T[], sha: '' };
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub read error ${res.status}: ${errText}`);
  }

  const meta = await res.json();
  let content: string;

  if (meta.content) {
    // File ≤ 1MB — content is inline as base64
    content = Buffer.from(meta.content, 'base64').toString('utf-8');
  } else if (meta.sha) {
    // File > 1MB — fetch via Blobs API
    const blobRes = await fetch(
      `${GITHUB_API}/repos/${repo}/git/blobs/${meta.sha}`,
      { headers: headers(), cache: 'no-store' }
    );
    if (!blobRes.ok) {
      throw new Error(`GitHub blob read error: ${blobRes.status}`);
    }
    const blob = await blobRes.json();
    content = Buffer.from(blob.content, 'base64').toString('utf-8');
  } else {
    return { data: defaultValue as T[], sha: '' };
  }

  const data = JSON.parse(content) as T[];

  // Update cache
  fileCache.set(filepath, { data, sha: meta.sha, timestamp: Date.now() });

  return { data, sha: meta.sha };
}

/**
 * Write a JSON file to the GitHub repo via Contents API.
 * Handles SHA conflicts with one automatic retry.
 */
export async function writeGithubJson<T>(
  filepath: string,
  data: T[],
  message?: string
): Promise<void> {
  const repo = getRepo();
  const branch = getBranch();

  // Get current SHA (prefer cache, fallback to fresh fetch)
  let sha = '';
  const cached = fileCache.get(filepath);
  if (cached) {
    sha = cached.sha;
  }

  if (!sha) {
    try {
      const metaRes = await fetch(
        `${GITHUB_API}/repos/${repo}/contents/${filepath}?ref=${branch}`,
        { headers: headers(), cache: 'no-store' }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        sha = meta.sha;
      }
    } catch {
      // File may not exist yet — will create
    }
  }

  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

  const body: Record<string, any> = {
    message: message || `Update ${filepath.split('/').pop()}`,
    content,
    branch,
  };
  if (sha) body.sha = sha;

  let res = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${filepath}`,
    {
      method: 'PUT',
      headers: headers(true),
      body: JSON.stringify(body),
    }
  );

  // Handle SHA conflict — retry once with fresh SHA
  if (res.status === 409) {
    const metaRes = await fetch(
      `${GITHUB_API}/repos/${repo}/contents/${filepath}?ref=${branch}`,
      { headers: headers(), cache: 'no-store' }
    );
    if (metaRes.ok) {
      const meta = await metaRes.json();
      body.sha = meta.sha;
      res = await fetch(
        `${GITHUB_API}/repos/${repo}/contents/${filepath}`,
        {
          method: 'PUT',
          headers: headers(true),
          body: JSON.stringify(body),
        }
      );
    }
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub write error ${res.status}: ${errText}`);
  }

  const result = await res.json();

  // Update cache with new SHA
  fileCache.set(filepath, {
    data,
    sha: result.content.sha,
    timestamp: Date.now(),
  });
}

/**
 * Invalidate a cached file entry.
 */
export function invalidateCache(filepath: string): void {
  fileCache.delete(filepath);
}
