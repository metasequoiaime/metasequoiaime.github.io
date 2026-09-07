import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import linuxGuide from "../vendor/MSIME-Docs/guides/linux.md?raw";
import macosGuide from "../vendor/MSIME-Docs/guides/macos.md?raw";
import macosVoiceGuide from "../vendor/MSIME-Docs/guides/macos-voice.md?raw";
import windowsGuide from "../vendor/MSIME-Docs/guides/windows.md?raw";
import { renderContent } from "./markdown";
import { PageHero } from "./page-content";
import { usePageMeta } from "./page-meta";
import { detectPlatform } from "./platform";
import { useTocScrollSpy, withHeadingIds } from "./toc";
import { TocNav } from "./toc-nav";

// The site distributes Windows, macOS and Linux builds, but this page only ever rendered the Windows guide -- the other three guides were written and sitting in the submodule unreferenced.
const GUIDES = [
  { id: "windows", label: "Windows", source: windowsGuide },
  { id: "macos", label: "macOS", source: macosGuide },
  { id: "macos-voice", label: "macOS 语音", source: macosVoiceGuide },
  { id: "linux", label: "Linux", source: linuxGuide },
] as const;

type GuideId = (typeof GUIDES)[number]["id"];

/** 没有 ?platform= 时按 UA 猜。三个系统各自对应一份主指南，macOS 语音那份要自己点。 */
const guideIdFromUserAgent = (): GuideId => detectPlatform();

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

            <TocNav
              entries={content.toc}
              activeId={activeId}
              tocRef={tocRef}
              onSelect={lockUntilScrollEnds}
              onNavigateNarrow={closeSidebar}
            />
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
