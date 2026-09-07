import { memo, useMemo, useRef, useState, type ReactNode } from "react";
import { renderContent } from "./markdown";
import { usePageMeta } from "./page-meta";
import { useTocScrollSpy, withHeadingIds } from "./toc";
import { TocNav } from "./toc-nav";
import { useReveal } from "./use-reveal";

type PageHeroProps = {
  kicker: string;
  title: string;
  leadHtml: string;
};

/** 文档、下载和几个内容页共用的页头。`is-ready` 放开入场动画：正文由打包进来的 markdown 同步渲染，首帧标题就已经在了。 */
export function PageHero({ kicker, title, leadHtml }: PageHeroProps) {
  return (
    <div className="page-hero is-ready">
      <div className="container page-hero-inner">
        <p className="page-hero-kicker" id="page-kicker">
          {kicker}
        </p>
        <h1 className="page-hero-title" id="page-title">
          {title}
        </h1>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 首段是本仓库自带 markdown 渲染出来的行内标记，markdown-it 关掉了 html 透传 */}
        <p className="page-hero-lead" id="page-lead" dangerouslySetInnerHTML={{ __html: leadHtml }} />
      </div>
    </div>
  );
}

/** 侧栏里的小节索引，窄屏时折叠成一个可展开的按钮 —— 和文档页是同一个控件。 */
function SectionIndex({
  entries,
  activeId,
  tocRef,
  sidebarRef,
  onSelect,
}: {
  entries: ReturnType<typeof withHeadingIds>["toc"];
  activeId: string | null;
  tocRef: React.RefObject<HTMLElement | null>;
  sidebarRef: React.RefObject<HTMLElement | null>;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      className={`docs-sidebar${isOpen ? " is-open" : ""}`}
      ref={sidebarRef as React.RefObject<HTMLElement>}
      aria-label="本页小节"
    >
      <button
        className="docs-toc-toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        <span>本页小节</span>
        <span className="docs-toc-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 12 12" focusable="false" aria-hidden="true">
            <path d="M2.25 4.25 6 8l3.75-3.75" />
          </svg>
        </span>
      </button>

      <TocNav
        entries={entries}
        activeId={activeId}
        tocRef={tocRef}
        onSelect={onSelect}
        onNavigateNarrow={() => {
          setIsOpen(false);
        }}
      />
    </aside>
  );
}

/**
 * 渲染 markdown 正文的那个 article。
 *
 * 必须 memo：React 更新这个元素时会重新写一遍 innerHTML，把里面的节点整批换掉。入场动画是靠摘掉节点上的 `data-reveal` 实现的 —— 那是 React 不知道的 DOM 改动，一旦重写就被抹掉，而 useReveal 的依赖没变、不会重新登记，整篇正文就永远停在 opacity: 0。加了小节索引之后父组件多了 activeId 这个状态，这条路径才第一次被走到。
 *
 * 包一层 memo 之后，只有 html 真的变了才重渲染，父组件因为高亮变化重渲染时它一动不动。
 */
const MarkdownArticle = memo(function MarkdownArticle({
  html,
  id,
  className,
  articleRef,
}: {
  html: string;
  id: string;
  className: string;
  articleRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <article
      className={className}
      id={id}
      ref={articleRef as React.RefObject<HTMLElement>}
      aria-live="polite"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文是本仓库自带 markdown 渲染出来的，markdown-it 关掉了 html 透传
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

type ContentPageProps = {
  documentTitle: string;
  description: string;
  kicker: string;
  /** 正文 markdown。下载页要等发布清单到位，这期间是 null，正文先留空。 */
  source: string | null;
  /** 页头取自另一份 markdown。下载页的正文会随清单重渲染，页头不该跟着闪。 */
  heroSource?: string;
  contentId: string;
  contentClass: string;
  /** 把每个二级标题及其后续内容包进独立卡片 */
  sectioned?: boolean;
  /** 开源代码页把列表项拆成仓库名和说明两行 */
  repoRows?: boolean;
  /** 排在正文之前、跨满整幅宽度的内容，目前只有下载页的下载入口用到 */
  banner?: ReactNode;
};

/**
 * 关于 / 开源代码 / 价格 / 隐私说明 / 下载共用的版式。
 *
 * 布局和文档页是同一套：左侧粘性小节索引，右侧正文。这既把一行压回 40 出头个汉字（整幅铺满时是 65 个，视线扫回行首容易串行），又不会像单纯收窄那样在两侧空出半屏 —— 多出来的宽度拿去放索引，而不是留白。
 */
export function ContentPage({
  documentTitle,
  description,
  kicker,
  source,
  heroSource,
  contentId,
  contentClass,
  sectioned = false,
  repoRows = false,
  banner,
}: ContentPageProps) {
  const articleRef = useRef<HTMLElement>(null);
  const tocRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const content = useMemo(() => {
    if (source === null) return { title: "", leadHtml: "", html: "", toc: [] };
    const rendered = renderContent(source, { sectioned, repoRows });
    // 只索引二级标题：内容页里每个二级标题就是一张卡片，把卡内小标题也列上会让索引失去概览的作用
    return { ...rendered, ...withHeadingIds(rendered.bodyHtml, "h2") };
  }, [source, sectioned, repoRows]);

  const hero = useMemo(
    () => (heroSource === undefined ? content : renderContent(heroSource)),
    [heroSource, content]
  );

  const { activeId, lockUntilScrollEnds } = useTocScrollSpy(content.toc, articleRef, tocRef, sidebarRef);

  usePageMeta(documentTitle, description);
  useReveal([content]);

  // 有两节以上就给索引。这不只是导航，也是这一栏宽度的用处：不放索引就得让正文自己撑满整幅，一行又回到 65 个汉字；只收窄不填东西，两侧就白空半屏。
  const hasIndex = content.toc.length >= 2;

  return (
    <>
      <PageHero kicker={kicker} title={hero.title} leadHtml={hero.leadHtml} />
      <main className="content-page">
        <div className={`container${hasIndex ? " docs-shell" : ""}`}>
          {banner}
          {hasIndex && (
            <SectionIndex
              entries={content.toc}
              activeId={activeId}
              tocRef={tocRef}
              sidebarRef={sidebarRef}
              onSelect={lockUntilScrollEnds}
            />
          )}
          <MarkdownArticle
            className={`docs-content ${contentClass}`}
            id={contentId}
            html={content.html}
            articleRef={articleRef}
          />
        </div>
      </main>
    </>
  );
}
