import { writeFile } from 'node:fs/promises';

// public/community.json backs the home page's community section. It is generated rather than fetched in the browser: the star history alone needs one request per 100 stargazers, and GitHub's anonymous limit is 60 per hour per IP, so visitors behind a shared address would see it fail. Serving our own file also keeps the promise the privacy page makes -- reading this site contacts no one but this site.
const organisation = 'metasequoiaime';

// Bots commit far more than people do; leaving them in would put github-actions at the top of a list titled "core contributors".
const isBot = account =>
  account?.type === 'Bot' || /\[bot\]$/i.test(account?.login ?? '');

export function aggregateContributors(perRepository, limit = 12) {
  const totals = new Map();

  for (const { repo, contributors } of perRepository) {
    for (const contributor of contributors) {
      if (isBot(contributor) || typeof contributor.login !== 'string') continue;
      const existing = totals.get(contributor.login) ?? {
        login: contributor.login,
        avatarUrl: contributor.avatar_url,
        url: contributor.html_url,
        contributions: 0,
        repos: [],
      };
      existing.contributions += contributor.contributions ?? 0;
      existing.repos.push(repo);
      totals.set(contributor.login, existing);
    }
  }

  return [...totals.values()]
    .sort((left, right) => right.contributions - left.contributions || left.login.localeCompare(right.login))
    .slice(0, limit)
    .map(entry => ({ ...entry, repos: entry.repos.length }));
}

/**
 * Turn raw `starred_at` timestamps into a cumulative monthly series.
 *
 * Monthly buckets, not one point per star: the chart is about the shape of the curve, and 1400 points would draw the same line while making the file 30x bigger. Months with no new stars still get a point so a quiet stretch reads as a plateau instead of a straight line between distant dates.
 */
export function monthlyStarHistory(timestamps) {
  const months = timestamps
    // The string check has to come first: `new Date(null)` is not an invalid date, it is 1970-01-01, so a single missing timestamp would stretch the series back fifty years.
    .filter(value => typeof value === 'string')
    .map(value => new Date(value))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((left, right) => left - right)
    .map(date => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);

  if (!months.length) return [];

  const perMonth = new Map();
  for (const month of months) perMonth.set(month, (perMonth.get(month) ?? 0) + 1);

  const series = [];
  let total = 0;
  const [firstYear, firstMonth] = months[0].split('-').map(Number);
  const cursor = new Date(Date.UTC(firstYear, firstMonth - 1, 1));
  const end = new Date();

  while (cursor <= end) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    total += perMonth.get(key) ?? 0;
    series.push({ month: key, stars: total });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return series;
}

const headers = () => {
  const value = { Accept: 'application/vnd.github+json' };
  if (process.env.GH_TOKEN) value.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  return value;
};

async function getJson(url, accept) {
  const response = await fetch(url, {
    headers: accept ? { ...headers(), Accept: accept } : headers(),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${url} failed: HTTP ${response.status}`);
  return response.json();
}

/** Walk `?page=` until a short page comes back. GitHub caps stargazers at 400 pages; this repo is nowhere near it. */
async function getAllPages(url, accept) {
  const collected = [];
  for (let page = 1; page <= 60; page += 1) {
    const batch = await getJson(`${url}${url.includes('?') ? '&' : '?'}per_page=100&page=${page}`, accept);
    if (!Array.isArray(batch) || batch.length === 0) break;
    collected.push(...batch);
    if (batch.length < 100) break;
  }
  return collected;
}

async function main() {
  const repositories = (await getAllPages(`https://api.github.com/orgs/${organisation}/repos?sort=full_name`))
    .filter(repo => !repo.fork && !repo.archived && !repo.private);

  const starEvents = [];
  const perRepository = [];

  for (const repo of repositories) {
    const contributors = await getAllPages(`https://api.github.com/repos/${organisation}/${repo.name}/contributors`)
      .catch(() => []);
    perRepository.push({ repo: repo.name, contributors });

    if (repo.stargazers_count > 0) {
      // The star+json media type is what turns /stargazers into timestamps instead of a list of users.
      const stargazers = await getAllPages(
        `https://api.github.com/repos/${organisation}/${repo.name}/stargazers`,
        'application/vnd.github.star+json'
      );
      for (const entry of stargazers) if (entry.starred_at) starEvents.push(entry.starred_at);
    }
  }

  const community = {
    generatedAt: new Date().toISOString(),
    totalStars: repositories.reduce((sum, repo) => sum + (repo.stargazers_count ?? 0), 0),
    repoCount: repositories.length,
    starHistory: monthlyStarHistory(starEvents),
    contributors: aggregateContributors(perRepository),
  };

  if (!community.starHistory.length || !community.contributors.length)
    throw new Error('Refusing to write an empty community snapshot');

  await writeFile(new URL('../public/community.json', import.meta.url), `${JSON.stringify(community, null, 2)}\n`);
  console.log(`Generated community snapshot: ${community.totalStars} stars, ${community.contributors.length} contributors`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
