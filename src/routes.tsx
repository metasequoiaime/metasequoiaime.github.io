import { createRootRoute, createRoute, createRouter, lazyRouteComponent, Link, Outlet } from "@tanstack/react-router";
import { docsSearchSchema } from "./docs-search";
import { HomePage } from "./page-home";
import { SiteShell } from "./site-shell";

function NotFoundPage() {
  return (
    <main className="content-page">
      <div className="container">
        <div className="card">
          <h1>页面不存在</h1>
          <p>这个地址下没有内容，可能是链接过期或输错了。</p>
          <div className="btn-row">
            <Link className="btn btn-primary" to="/">
              回到首页
            </Link>
            <Link className="btn btn-ghost" to="/docs/">
              查看文档
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

const rootRoute = createRootRoute({ component: Outlet });

/**
 * 无路径的布局层：顶栏、导航和页脚都挂在这里，站内换页时它们不重挂，导航胶囊才能连续地滑过去。
 *
 * 简历页是独立排版，直接挂在根节点下，不进这一层。
 */
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "site-shell",
  component: SiteShell,
  notFoundComponent: NotFoundPage,
});

// 首页不拆包：它是最常见的落地页，而且不需要 markdown 渲染器。其余各页的正文各自成块，只有真的打开才下载。
const indexRoute = createRoute({ getParentRoute: () => shellRoute, path: "/", component: HomePage });

const docsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/docs",
  component: lazyRouteComponent(() => import("./page-docs"), "DocsPage"),
  validateSearch: docsSearchSchema,
});

const downloadRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/download",
  component: lazyRouteComponent(() => import("./page-download"), "DownloadPage"),
});

const aboutRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/about",
  component: lazyRouteComponent(() => import("./page-about"), "AboutPage"),
});

const codeRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/code",
  component: lazyRouteComponent(() => import("./page-code"), "CodePage"),
});

const priceRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/price",
  component: lazyRouteComponent(() => import("./page-price"), "PricePage"),
});

const privacyRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/privacy",
  component: lazyRouteComponent(() => import("./page-privacy"), "PrivacyPage"),
});

const resumeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/resume",
  component: lazyRouteComponent(() => import("./page-resume"), "ResumePage"),
});

const routeTree = rootRoute.addChildren([
  shellRoute.addChildren([indexRoute, docsRoute, downloadRoute, aboutRoute, codeRoute, priceRoute, privacyRoute]),
  resumeRoute,
]);

export const router = createRouter({
  routeTree,
  // 站点部署成目录结构，规范地址一直带尾斜杠（`/docs/` 而不是 `/docs`）。生成的链接必须跟着带，直接访问才不会先吃一次跳转。
  trailingSlash: "always",
  defaultNotFoundComponent: NotFoundPage,
  scrollRestoration: true,
  // 鼠标停到链接上就开始取该路由的代码块。限速网络下实测，不预取的话点完要等 1.4 秒内容才换，这段等待被挪到了用户还在瞄准的时候。真赶上没取完，顶栏下的进度线会顶上。
  defaultPreload: "intent",
  defaultPreloadDelay: 50,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
