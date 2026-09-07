import { z } from "zod";

/**
 * 文档页的 `?platform=` 查询参数。
 *
 * 单独放一个模块：路由表要在启动时就拿到它做校验，跟它放同一个文件的话，文档正文和 markdown 渲染器会被一起拉进首包，而多数访客根本不打开文档页。
 *
 * 认不出来的值当作没写，回落到按 UA 猜，而不是让整页报错。
 */
export const docsSearchSchema = z.object({
  platform: z.enum(["windows", "macos", "macos-voice", "linux"]).optional().catch(undefined),
});
