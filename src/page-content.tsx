import { useMemo } from "react";
import { renderContent } from "./markdown";
import { usePageMeta } from "./page-meta";
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

type ContentPageProps = {
  documentTitle: string;
  description: string;
  kicker: string;
  source: string;
  contentId: string;
  contentClass: string;
  /** 把每个二级标题及其后续内容包进独立卡片 */
  sectioned?: boolean;
  /** 开源代码页把列表项拆成仓库名和说明两行 */
  repoRows?: boolean;
};

/** 关于 / 开源代码 / 价格 / 隐私说明四页共用：正文全部来自 `src/content` 下的 markdown。 */
export function ContentPage({
  documentTitle,
  description,
  kicker,
  source,
  contentId,
  contentClass,
  sectioned = false,
  repoRows = false,
}: ContentPageProps) {
  const content = useMemo(() => renderContent(source, { sectioned, repoRows }), [source, sectioned, repoRows]);

  usePageMeta(documentTitle, description);
  useReveal([content]);

  return (
    <>
      <PageHero kicker={kicker} title={content.title} leadHtml={content.leadHtml} />
      <main className="content-page">
        <div className="container">
          <article
            className={`docs-content ${contentClass}`}
            id={contentId}
            aria-live="polite"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: 正文是本仓库自带 markdown 渲染出来的，markdown-it 关掉了 html 透传
            dangerouslySetInnerHTML={{ __html: content.bodyHtml }}
          />
        </div>
      </main>
    </>
  );
}
