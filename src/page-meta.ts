import { useLayoutEffect } from "react";

/**
 * 客户端换页只改地址栏，标题和描述得自己跟上。
 *
 * 每个入口 HTML 里仍然写着本页的静态 title 和 description —— 直接访问该地址时那份才是首帧和爬虫看到的内容，这里只负责站内跳转之后的同步。
 */
export const usePageMeta = (title: string, description: string) => {
  useLayoutEffect(() => {
    document.title = title;

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.content = description;
  }, [title, description]);
};
