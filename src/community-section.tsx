import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { StarHistoryChart } from "./star-history-chart";
import { useReveal } from "./use-reveal";

/**
 * 社区快照由 `scripts/generate-community.mjs` 生成，站点只读自己域名下的 community.json。
 *
 * 不在浏览器里直接调 GitHub：光 star 历史每 100 个 stargazer 就是一次分页请求，而匿名限额是每 IP 每小时 60 次，共用出口地址的访客会直接吃到 403。读自己的文件也守住了隐私说明里那句话 —— 浏览这个站不会联系除本站以外的任何人。头像仍然来自 GitHub 的 CDN，所以带上 no-referrer。
 */
const communitySchema = z.object({
  generatedAt: z.string(),
  totalStars: z.number().int().nonnegative(),
  repoCount: z.number().int().nonnegative(),
  starHistory: z.array(z.object({ month: z.string(), stars: z.number().int().nonnegative() })).min(1),
  contributors: z
    .array(
      z.object({
        login: z.string(),
        avatarUrl: z.string().url(),
        url: z.string().url(),
        contributions: z.number().int().nonnegative(),
        repos: z.number().int().nonnegative(),
      })
    )
    .min(1),
});

const fetchCommunity = async () => {
  const response = await fetch("/community.json");
  if (!response.ok) throw new Error(`Community snapshot returned ${response.status}`);
  return communitySchema.parse(await response.json());
};

const groupThousands = (value: number) => value.toLocaleString("en-US");

export function CommunitySection() {
  const community = useQuery({
    queryKey: ["community"],
    queryFn: fetchCommunity,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  // 这一节等数据到了才出现，那时首页那次 observeReveals 早跑完了。不补登记一次，整节会一直停在 opacity: 0。
  useReveal([community.data]);

  // 拿不到快照就整节不渲染。这是锦上添花的内容，缺了它首页依旧完整，没必要留一块报错占位。
  if (!community.data) return null;

  const { totalStars, repoCount, starHistory, contributors } = community.data;

  return (
    <section className="container section">
      <div className="section-eyebrow" data-reveal>
        <span>03 · 社区</span>
        <span className="section-rule" />
      </div>

      <h2 className="section-title" data-reveal>
        开源项目的实时动态
      </h2>
      <p className="section-lead" data-reveal>
        数据在构建时从 GitHub 取好并随站点一起发布，浏览这一页不会向第三方发出请求。
      </p>

      <div className="community-grid" data-reveal>
        <div className="card community-chart-card">
          <div className="community-chart-head">
            <div>
              <p className="community-kicker">GitHub Star 累计</p>
              <strong className="community-figure">{groupThousands(totalStars)}</strong>
            </div>
            <a
              className="community-link"
              href="https://github.com/metasequoiaime"
              target="_blank"
              rel="noreferrer"
            >
              在 GitHub 查看 →
            </a>
          </div>
          <StarHistoryChart series={starHistory} />
        </div>

        <div className="card community-people-card">
          <p className="community-kicker">核心贡献者</p>
          <p className="community-people-note">
            按 {repoCount} 个仓库的提交数合并排序，机器人账号不计入。
          </p>

          <ul className="community-people">
            {contributors.map((person) => (
              <li key={person.login}>
                <a href={person.url} target="_blank" rel="noreferrer">
                  <img
                    src={`${person.avatarUrl}${person.avatarUrl.includes("?") ? "&" : "?"}s=96`}
                    alt=""
                    width="40"
                    height="40"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <span className="community-person-name">{person.login}</span>
                  <span className="community-person-meta">
                    {groupThousands(person.contributions)} 次提交 · {person.repos} 个仓库
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
