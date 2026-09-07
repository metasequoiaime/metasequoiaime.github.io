import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { Link, createRootRoute, createRoute, createRouter, RouterProvider, useLocation } from "@tanstack/react-router";
import { z } from "zod";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createRoot } from "react-dom/client";
import "./app.css";

const siteConfig = z.object({
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
});

const config = siteConfig.parse({
  name: "水杉输入法",
  tagline: "一套引擎，四个平台",
  description: "开源中文输入法，各平台共用同一套 C++ 引擎。",
});
const githubRepoSchema = z.object({ name: z.string(), html_url: z.string().url(), stargazers_count: z.number().int().nonnegative(), description: z.string().nullable() });
const githubMemberSchema = z.object({ login: z.string(), avatar_url: z.string().url(), html_url: z.string().url() });
const githubReposSchema = z.array(githubRepoSchema);
const githubMembersSchema = z.array(githubMemberSchema);
const pageSchema = z.object({ title: z.string(), description: z.string(), action: z.string() });
const pageCopy = z.record(z.string(), pageSchema).parse({
  "/": { title: "改善中英文输入体验，", description: `${config.description} Windows、macOS、Linux 与 iOS 前端各自原生实现界面与文本注入。`, action: "下载输入法" },
  "/docs": { title: "从文档开始了解水杉", description: "查看 Windows、macOS、Linux 与输入方案的安装和配置指南。", action: "查看文档" },
  "/download": { title: "下载水杉输入法", description: "选择适合你的平台，获取最新稳定版本和安装说明。", action: "查看下载" },
  "/code": { title: "开放源代码，共同改进", description: "引擎和各平台前端均在 GitHub 开源，欢迎提交 issue 与 pull request。", action: "访问 GitHub" },
  "/about": { title: "关于水杉输入法", description: "水杉输入法由社区维护，致力于提供可靠、可扩展的中文输入体验。", action: "了解项目" },
  "/price": { title: "免费且完全开源", description: "水杉输入法不收取授权费用，核心引擎和平台前端均以 GPL-3.0 发布。", action: "查看开源代码" },
  "/privacy": { title: "隐私与数据", description: "本地输入优先，配置保存在你的设备上；可选云服务只在启用时发送请求。", action: "阅读隐私说明" },
  "/resume": { title: "加入水杉输入法", description: "如果你关心中文输入体验，欢迎通过 GitHub 参与代码、文档和测试。", action: "参与贡献" },
});

const queryClient = new QueryClient();
const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
if (window.location.pathname.length > 1 && window.location.pathname.endsWith("/")) {
  window.history.replaceState({}, "", `${window.location.pathname.slice(0, -1)}${window.location.search}${window.location.hash}`);
}
const features = [
  ["输入方案", "全拼 · 双拼 · 五笔", "多种方案共用同一套跨平台引擎。"],
  ["云候选与 AI", "本地优先，云端可选", "网络服务异常时不影响本地输入。"],
  ["界面与工具", "候选窗之外的部分", "主题、皮肤、语音和手写工具均可自定义。"],
] as const;
const routeCards: Record<string, readonly (readonly [string, string, string])[]> = {
  "/docs": [["Windows", "安装与配置", "从安装输入法到切换输入方案，按步骤完成首次设置。"], ["macOS", "系统输入源", "了解权限、输入源和语音输入的配置方式。"], ["Linux", "发行版指南", "在主流 Linux 桌面环境中编译并启用水杉输入法。"]],
  "/download": [["Windows", "安装包", "下载最新 Windows 安装包，安装后即可开始输入。"], ["macOS", "原生前端", "使用 macOS 原生输入源，保持系统级体验。"], ["Linux / iOS", "平台支持", "查看各平台的可用状态和构建说明。"]],
  "/code": [["MSIME", "核心引擎", "跨平台 C++ 输入引擎，统一方案、词库和候选逻辑。"], ["MSIME-Windows", "Windows 前端", "Windows 平台的原生文本注入和候选窗实现。"], ["MSIME-Docs", "文档仓库", "安装、配置和开发文档，欢迎贡献改进。"]],
  "/about": [["开源许可", "GPL-3.0", "代码、构建和发布流程公开透明。"], ["社区协作", "在 GitHub 讨论", "通过 issue、讨论和 pull request 参与项目。"], ["设计原则", "本地优先", "输入体验首先可靠，网络能力始终是可选增强。"]],
  "/price": [["授权", "完全免费", "个人和商业使用都不收取授权费用。"], ["代码", "GPL-3.0", "修改和分发请遵守 GPL-3.0 条款。"], ["支持", "社区维护", "通过公开 issue 获取帮助并参与改进。"]],
  "/privacy": [["本地配置", "留在你的设备", "主题、词库和 API Token 不上传到本站。"], ["可选服务", "按需请求", "云候选和 AI 联想只有在你主动启用时才会请求。"], ["透明", "开放实现", "客户端和服务调用方式均可在源码中审阅。"]],
  "/resume": [["代码贡献", "修复和功能", "从 issue 开始，提交清晰、可验证的改动。"], ["文档贡献", "让输入更容易", "补充安装、配置和平台使用经验。"], ["测试贡献", "覆盖真实场景", "反馈不同系统和输入方案下的体验。"]],
};

function useSiteStats() {
  return useQuery({ queryKey: ["site-stats"], queryFn: async () => ({ schemes: 3, platforms: 4, license: "GPL-3.0" }), staleTime: Infinity });
}

function useGithubData() {
  return useQuery({
    queryKey: ["github", "metasequoiaime"],
    queryFn: async () => {
      const headers = { Accept: "application/vnd.github+json" };
      const [reposResponse, membersResponse] = await Promise.all([
        fetch("https://api.github.com/orgs/metasequoiaime/repos?per_page=100&sort=stars", { headers }),
        fetch("https://api.github.com/orgs/metasequoiaime/members?per_page=12", { headers }),
      ]);
      if (!reposResponse.ok || !membersResponse.ok) throw new Error("GitHub 数据暂时不可用");
      return { repos: githubReposSchema.parse(await reposResponse.json()).slice(0, 6), members: githubMembersSchema.parse(await membersResponse.json()) };
    },
    staleTime: 1000 * 60 * 15,
    retry: 1,
  });
}

function App() {
  const { data: stats } = useSiteStats();
  const github = useGithubData();
  const pathname = useLocation({ select: (location) => location.pathname.replace(/\/$/, "") || "/" });
  const copy = pageCopy[pathname] ?? pageCopy["/"];
  const isHome = pathname === "/";
  const cards = routeCards[pathname] ?? features;
  const reduceMotion = useReducedMotion();
  return <div className="min-h-screen bg-[#f4f7fb] text-slate-900 selection:bg-blue-200 dark:bg-[#101827] dark:text-white">
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#101827]/80">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 font-semibold"><img src="/msime-logo.png" width="36" height="36" alt="" /><span>{config.name}</span></Link>
        <div className="flex items-center gap-3 text-sm text-slate-600 sm:gap-5 dark:text-slate-300"><Link to="/docs">文档</Link><Link to="/price">价格</Link><Link to="/code">开源代码</Link><Link to="/download">下载</Link><Link to="/about">关于</Link><Link className="rounded-full bg-blue-600 px-4 py-2 font-medium text-white" to="/download">立即下载</Link></div>
      </nav>
    </header>
    <main>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : .6 }}>
          <p className="mb-5 font-mono text-sm font-semibold tracking-[.2em] text-blue-600">MSIME · OPEN SOURCE IME</p>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight sm:text-7xl">{copy.title}{isHome && <span className="text-blue-600">{config.tagline}</span>}</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">{copy.description}</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link to="/download" className={cn("rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-600/20", "transition-transform hover:-translate-y-0.5")}>{copy.action}</Link><Link to="/docs" className="rounded-full border border-slate-300 px-6 py-3 font-semibold dark:border-white/20">阅读文档</Link></div>
        </motion.div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .7, delay: reduceMotion ? 0 : .1 }} className="overflow-hidden rounded-3xl border border-white/60 bg-slate-900 p-3 shadow-2xl shadow-blue-900/20"><div className="overflow-hidden rounded-2xl bg-slate-800"><video className="aspect-video w-full object-cover" muted loop autoPlay playsInline poster="/img/typing_words_light_poster.jpg" aria-label="水杉输入法输入演示"><source src="/img/typing_words_light.mp4" type="video/mp4" /></video></div></motion.div>
      </section>
      <section className="mx-auto grid max-w-6xl grid-cols-3 gap-3 px-6 pb-20">{[[stats?.schemes ?? 3,"输入方案"],[stats?.platforms ?? 4,"平台前端"],[stats?.license ?? "GPL-3.0","100% 开源"]].map(([value,label]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5"><strong className="block text-2xl">{value}</strong><span className="text-sm text-slate-500 dark:text-slate-400">{label}</span></div>)}</section>
      <section className="mx-auto max-w-6xl px-6 pb-28"><p className="mb-6 font-mono text-sm text-blue-600">{isHome ? "01 · 能力" : "继续探索"}</p><div className="grid gap-5 md:grid-cols-3">{cards.map(([kicker,title,desc]) => <motion.article whileHover={reduceMotion ? undefined : { y: -5 }} transition={{ type: "spring", stiffness: 300 }} key={title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/5"><p className="text-sm font-semibold text-blue-600">{kicker}</p><h2 className="mt-4 text-xl font-bold">{title}</h2><p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{desc}</p></motion.article>)}</div></section>
      <section className="mx-auto max-w-6xl px-6 pb-28"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="font-mono text-sm text-blue-600">02 · 社区</p><h2 className="mt-2 text-3xl font-bold">开源项目的实时动态</h2></div><a className="text-sm font-semibold text-blue-600" href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">在 GitHub 查看 →</a></div>{github.isPending ? <div className="rounded-3xl border border-slate-200 bg-white p-7 text-slate-500 dark:border-white/10 dark:bg-white/5">正在读取 GitHub 数据…</div> : github.isError ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">GitHub 数据暂时不可用，项目主页仍可正常浏览。</div> : <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="grid gap-3 sm:grid-cols-2">{github.data.repos.map((repo) => <a key={repo.name} href={repo.html_url} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-300 dark:border-white/10 dark:bg-white/5"><div className="flex items-center justify-between gap-3"><strong>{repo.name}</strong><span className="text-sm text-amber-600">★ {repo.stargazers_count}</span></div><p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{repo.description ?? "暂无项目描述"}</p></a>)}</div><div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5"><h3 className="font-semibold">核心团队成员</h3><div className="mt-4 flex flex-wrap gap-3">{github.data.members.map((member) => <a key={member.login} href={member.html_url} target="_blank" rel="noreferrer" title={member.login}><img src={member.avatar_url} alt={member.login} className="h-11 w-11 rounded-full ring-2 ring-white dark:ring-slate-800" /></a>)}</div><p className="mt-4 text-sm text-slate-500 dark:text-slate-400">公开成员头像来自 GitHub 组织资料。</p></div></div>}</section>
    </main>
    <footer className="border-t border-slate-200 px-6 py-10 text-sm text-slate-500 dark:border-white/10"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5"><span>{config.name} · GPL-3.0</span><nav className="flex flex-wrap gap-5"><Link to="/docs">文档</Link><Link to="/download">下载</Link><Link to="/price">价格</Link><Link to="/privacy">隐私说明</Link><a href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">GitHub 组织</a></nav></div></footer>
  </div>;
}

const rootRoute = createRootRoute({ component: App, notFoundComponent: App });
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });
const docsRoute = createRoute({ getParentRoute: () => rootRoute, path: "/docs" });
const downloadRoute = createRoute({ getParentRoute: () => rootRoute, path: "/download" });
const codeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/code" });
const aboutRoute = createRoute({ getParentRoute: () => rootRoute, path: "/about" });
const priceRoute = createRoute({ getParentRoute: () => rootRoute, path: "/price" });
const privacyRoute = createRoute({ getParentRoute: () => rootRoute, path: "/privacy" });
const resumeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/resume" });
const routeTree = rootRoute.addChildren([indexRoute, docsRoute, downloadRoute, codeRoute, aboutRoute, priceRoute, privacyRoute, resumeRoute]);
const router = createRouter({ routeTree, trailingSlash: "never" });

createRoot(document.getElementById("root")!).render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
