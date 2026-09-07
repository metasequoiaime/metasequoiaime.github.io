import MarkdownIt from "markdown-it";

export const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const SITE_ORIGIN = "https://msime.app";

/** Docs 是独立仓库，正文里写的是绝对地址，便于在别处引用。渲染到本站时换回站内路径，否则自己的图片和链接要绕一圈生产域名，本地预览和非生产部署都会走外网。 */
const localizeSiteLinks = (root: ParentNode) => {
  const strip = (element: Element, attribute: string) => {
    const value = element.getAttribute(attribute);
    if (value?.startsWith(`${SITE_ORIGIN}/`)) element.setAttribute(attribute, value.slice(SITE_ORIGIN.length));
  };

  root.querySelectorAll("a[href]").forEach((element) => {
    strip(element, "href");
  });
  root.querySelectorAll("img[src]").forEach((element) => {
    strip(element, "src");
  });
};

/** 一级标题与首段属于页头 hero，正文继续由 markdown 驱动 */
const liftHero = (root: ParentNode) => {
  const heading = root.querySelector("h1");
  if (!heading) return { title: "", leadHtml: "" };

  const title = heading.textContent ?? "";
  const intro = heading.nextElementSibling;
  let leadHtml = "";

  if (intro instanceof HTMLParagraphElement) {
    leadHtml = intro.innerHTML;
    intro.remove();
  }

  heading.remove();
  return { title, leadHtml };
};

const groupSections = (root: HTMLElement) => {
  const cards: HTMLElement[] = [];
  let current: HTMLElement | null = null;

  for (const node of Array.from(root.childNodes)) {
    if (current === null || (node instanceof HTMLElement && node.tagName === "H2")) {
      current = document.createElement("section");
      current.className = "card doc-card";
      current.setAttribute("data-reveal", "");
      cards.push(current);
    }

    current.appendChild(node);
  }

  root.replaceChildren(...cards.filter((card) => card.textContent?.trim()));
};

/** 仓库条目拆成两行：仓库名一行，说明一行 */
const splitRepoRows = (root: ParentNode) => {
  root.querySelectorAll<HTMLLIElement>("li").forEach((item) => {
    const link = item.firstChild;
    if (!(link instanceof HTMLAnchorElement)) return;

    const name = document.createElement("span");
    name.className = "repo-name";
    name.appendChild(link);

    const desc = document.createElement("span");
    desc.className = "repo-desc";
    while (item.firstChild) desc.appendChild(item.firstChild);

    // 冒号原本是名称和说明之间的分隔符，拆成两行之后不需要了
    const lead = desc.firstChild;
    if (lead?.nodeType === Node.TEXT_NODE) {
      lead.textContent = (lead.textContent ?? "").replace(/^\s*[：:]\s*/, "");
    }

    item.append(name, desc);
  });
};

export type ContentDocument = {
  /** 一级标题，交给页头渲染 */
  title: string;
  /** 首段，已经是 markdown 渲染过的行内 HTML */
  leadHtml: string;
  bodyHtml: string;
};

type RenderOptions = {
  /** 把每个二级标题及其后续内容包进独立卡片 */
  sectioned?: boolean;
  /** 开源代码页把列表项拆成仓库名和说明两行 */
  repoRows?: boolean;
};

/**
 * 把一份 markdown 正文变成页头 + 正文两部分。
 *
 * 后处理仍然靠 DOM API，和之前直接操作页面时是同一套逻辑；区别是这里在一个游离节点里做完再交出 HTML 字符串，页面上不会出现处理到一半的中间状态。`html: false` 让 markdown 不会透传原始标签，游离节点里的 innerHTML 也不会执行脚本。
 */
export const renderContent = (source: string, { sectioned = false, repoRows = false }: RenderOptions = {}): ContentDocument => {
  const holder = document.createElement("div");
  holder.innerHTML = markdown.render(source);

  localizeSiteLinks(holder);
  const { title, leadHtml } = liftHero(holder);

  if (sectioned) groupSections(holder);
  if (repoRows) splitRepoRows(holder);

  return { title, leadHtml, bodyHtml: holder.innerHTML };
};
