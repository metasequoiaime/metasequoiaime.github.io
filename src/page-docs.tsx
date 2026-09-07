import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import linuxGuide from "../vendor/MSIME-Docs/guides/linux.md?raw";
import macosGuide from "../vendor/MSIME-Docs/guides/macos.md?raw";
import macosVoiceGuide from "../vendor/MSIME-Docs/guides/macos-voice.md?raw";
import windowsGuide from "../vendor/MSIME-Docs/guides/windows.md?raw";
import { renderContent } from "./markdown";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";

// The site distributes Windows, macOS and Linux builds, but this page only ever rendered the Windows
// guide -- the other three guides were written and sitting in the submodule unreferenced.
const GUIDES = [
  { id: "windows", label: "Windows", source: windowsGuide },
  { id: "macos", label: "macOS", source: macosGuide },
  { id: "macos-voice", label: "macOS 语音", source: macosVoiceGuide },
  { id: "linux", label: "Linux", source: linuxGuide },
] as const;

type GuideId = (typeof GUIDES)[number]["id"];

/** 没有 ?platform= 时按 UA 猜，猜不出用 Windows。 */
const guideIdFromUserAgent = (): GuideId => {
  const ua = navigator.userAgent;
  if (/Mac OS X|Macintosh/.test(ua)) return "macos";
  if (/Linux/.test(ua) && !/Android/.test(ua)) return "linux";
  return "windows";
};

type TocEntry = { id: string; text: string; isSubItem: boolean };

/** 给正文里的二三级标题编好锚点 id，同时把目录条目一并算出来。 */
const withHeadingIds = (bodyHtml: string) => {
  const holder = document.createElement("div");
  holder.innerHTML = bodyHtml;

  const usedIds = new Map<string, number>();
  const toc: TocEntry[] = [];

  holder.querySelectorAll<HTMLElement>("h2, h3").forEach((heading) => {
    const text = heading.textContent?.trim() ?? "";
    const baseId =
      text
        .toLocaleLowerCase()
        .replace(/[^\p{Letter}\p{Number}\s_-]/gu, "")
        .trim()
        .replace(/[\s_]+/g, "-") || "section";
    const occurrence = (usedIds.get(baseId) ?? 0) + 1;
    const headingId = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;

    usedIds.set(baseId, occurrence);
    heading.id = headingId;
    toc.push({ id: headingId, text, isSubItem: heading.tagName === "H3" });
  });

  return { html: holder.innerHTML, toc };
};

/**
 * 目录高亮跟随正文滚动。
 *
 * 点目录之后到滚动停下之前先锁住，否则平滑滚动会把沿途每一节都点亮一遍。长距离的平滑滚动要一秒多，`scrollend` 才是准点；没有这个事件的浏览器靠超时兜底。中途自己滚就交还控制权 —— 键盘翻页和拖滚动条都不产生 wheel / touchstart，所以 keydown 和 pointerdown 也要放行。
 */
const useTocScrollSpy = (
  toc: TocEntry[],
  articleRef: RefObject<HTMLElement | null>,
  tocRef: RefObject<HTMLElement | null>,
  sidebarRef: RefObject<HTMLElement | null>
) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const lockedRef = useRef(false);
  const unlockTimerRef = useRef(0);

  const lockUntilScrollEnds = useCallback((id: string) => {
    setActiveId(id);
    lockedRef.current = true;
    window.clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = window.setTimeout(() => {
      lockedRef.current = false;
    }, 2000);
  }, []);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || toc.length === 0) {
      setActiveId(null);
      return;
    }

    const headings = toc
      .map((entry) => article.querySelector<HTMLElement>(`#${CSS.escape(entry.id)}`))
      .filter((heading): heading is HTMLElement => heading !== null);

    // 顶栏是固定的，判定线要压到它下面。顶栏是静态节点，高度只跟 CSS 变量走，查一次就够了
    const headerWrap = document.querySelector<HTMLElement>(".header-wrap");

    const updateActive = () => {
      if (lockedRef.current || headings.length === 0) return;

      const offset = (headerWrap?.offsetHeight ?? 68) + 24;
      let index = 0;

      for (let i = 0; i < headings.length; i += 1) {
        if (headings[i].getBoundingClientRect().top - offset > 0) break;
        index = i;
      }

      // 触底时直接点亮最后一节，否则末尾几节永远轮不到
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;

      setActiveId(headings[atBottom ? headings.length - 1 : index].id);
    };

    const releaseLock = () => {
      lockedRef.current = false;
      window.clearTimeout(unlockTimerRef.current);
    };

    const onScrollEnd = () => {
      releaseLock();
      updateActive();
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        updateActive();
      });
    };

    window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("wheel", releaseLock, { passive: true });
    window.addEventListener("touchstart", releaseLock, { passive: true });
    window.addEventListener("keydown", releaseLock);
    window.addEventListener("pointerdown", releaseLock);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("load", updateActive);

    // 带 hash 进来时浏览器要等一帧才滚到位；图片加载完还会顶一次版面，落定后再校准一次
    const initialFrame = requestAnimationFrame(updateActive);

    return () => {
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("wheel", releaseLock);
      window.removeEventListener("touchstart", releaseLock);
      window.removeEventListener("keydown", releaseLock);
      window.removeEventListener("pointerdown", releaseLock);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", updateActive);
      cancelAnimationFrame(initialFrame);
      window.clearTimeout(unlockTimerRef.current);
    };
  }, [toc, articleRef]);

  /** 量出当前项的位置和高度，交给目录那块滑动胶囊。目录项高度不一（二三级字号不同），所以尺寸也要一起给。 */
  useLayoutEffect(() => {
    const element = tocRef.current;
    if (!element) return;

    // 依赖里带上 toc：换平台会整份重建目录，条目位置全变。两份指南可能出现同名小节（都有「下载与安装」），只盯着 activeId 的话那种情况不会重算。
    const link =
      activeId && toc.length > 0 ? element.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`) : null;

    if (!link) {
      element.style.setProperty("--toc-on", "0");
      return;
    }

    element.style.setProperty("--toc-y", `${link.offsetTop}px`);
    element.style.setProperty("--toc-h", `${link.offsetHeight}px`);
    element.style.setProperty("--toc-on", "1");
  }, [activeId, toc, tocRef]);

  /** 侧栏自己可滚动（窄屏时是目录本身），高亮项跑出可视区就带进来 */
  useLayoutEffect(() => {
    if (!activeId) return;

    const toc = tocRef.current;
    const box =
      toc && toc.scrollHeight > toc.clientHeight
        ? toc
        : sidebarRef.current && sidebarRef.current.scrollHeight > sidebarRef.current.clientHeight
          ? sidebarRef.current
          : null;
    const link = toc?.querySelector<HTMLElement>(`a[href="#${CSS.escape(activeId)}"]`);
    if (!box || !link) return;

    const linkRect = link.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();

    if (linkRect.top < boxRect.top + 8) {
      box.scrollTop -= boxRect.top + 8 - linkRect.top;
    } else if (linkRect.bottom > boxRect.bottom - 8) {
      box.scrollTop += linkRect.bottom - (boxRect.bottom - 8);
    }
  }, [activeId, tocRef, sidebarRef]);

  return { activeId, lockUntilScrollEnds };
};

export function DocsPage() {
  const { platform } = useSearch({ from: "/site-shell/docs" });
  const navigate = useNavigate({ from: "/docs" });
  const [uaGuide] = useState(guideIdFromUserAgent);
  const guideId = platform ?? uaGuide;

  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const tocRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const guide = useMemo(() => GUIDES.find((candidate) => candidate.id === guideId) ?? GUIDES[0], [guideId]);
  const content = useMemo(() => {
    const rendered = renderContent(guide.source);
    return { ...rendered, ...withHeadingIds(rendered.bodyHtml) };
  }, [guide]);

  const { activeId, lockUntilScrollEnds } = useTocScrollSpy(content.toc, articleRef, tocRef, sidebarRef);

  usePageMeta("文档 | 水杉输入法", "水杉输入法文档");

  const closeSidebar = useCallback(() => {
    setSidebarIsOpen(false);
  }, []);

  return (
    <>
      <PageHero kicker="文档" title={content.title} leadHtml={content.leadHtml} />

      <main className="docs-page">
        <div className="container docs-shell">
          <aside className={`docs-sidebar${sidebarIsOpen ? " is-open" : ""}`} ref={sidebarRef} aria-label="文档导航">
            <button
              className="docs-toc-toggle"
              id="docs-toc-toggle"
              type="button"
              aria-expanded={sidebarIsOpen}
              onClick={() => {
                setSidebarIsOpen((open) => !open);
              }}
            >
              <span>文档目录</span>
              <span className="docs-toc-toggle-icon" aria-hidden="true">
                <svg viewBox="0 0 12 12" focusable="false" aria-hidden="true">
                  <path d="M2.25 4.25 6 8l3.75-3.75" />
                </svg>
              </span>
            </button>

            <nav className="docs-platforms" id="docs-platforms" aria-label="平台">
              {GUIDES.map((candidate) => (
                <button
                  key={candidate.id}
                  className={`docs-platform${candidate.id === guideId ? " is-active" : ""}`}
                  type="button"
                  aria-current={candidate.id === guideId ? "page" : "false"}
                  onClick={() => {
                    // replace so the platform tabs do not fill the back button with history entries; hash 一并清掉，否则切了平台还会跳回上一份指南的锚点
                    void navigate({ search: () => ({ platform: candidate.id }), hash: "", replace: true });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {candidate.label}
                </button>
              ))}
            </nav>

            <nav className="docs-toc" id="docs-toc" ref={tocRef}>
              {content.toc.map((entry) => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  className={`${entry.isSubItem ? "docs-toc-subitem" : ""}${entry.id === activeId ? " is-active" : ""}`.trim()}
                  aria-current={entry.id === activeId ? "location" : undefined}
                  onClick={() => {
                    lockUntilScrollEnds(entry.id);
                    if (window.matchMedia("(max-width: 900px)").matches) closeSidebar();
                  }}
                >
                  {entry.text}
                </a>
              ))}
            </nav>
          </aside>

          <article
            className="docs-content docs-article"
            id="docs-content"
            ref={articleRef}
            aria-live="polite"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文来自随仓库固定的 MSIME-Docs gitlink，markdown-it 关掉了 html 透传
            dangerouslySetInnerHTML={{ __html: content.html }}
          />
        </div>
      </main>
    </>
  );
}
