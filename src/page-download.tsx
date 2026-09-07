import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import downloadSource from "./content/download.md?raw";
import { ContentPage } from "./page-content";
import { detectPlatform, PLATFORM_LABELS, PLATFORMS, type Platform } from "./platform";

const RELEASES_PAGE_URL = "https://github.com/metasequoiaime/MSIME-Windows/releases";

// The name is substituted into a fenced command the reader is meant to paste. Restricting it to the shape the release workflow actually produces keeps a manifest value from carrying its own fence or shell metacharacters into that block.
const installerNameSchema = z
  .string()
  .regex(/^MetasequoiaIME_Setup_v[\w.-]+\.exe$/i)
  .optional()
  .catch(undefined);

/**
 * 版本号和 Release 地址读不出来就整份作废，回落到「暂时无法获取」；其余字段坏了只是它自己缺席，不该拖垮整页。
 *
 * Release 地址必须落在本项目的 releases 路径下：这个值会直接变成页面上的下载链接。
 */
const updateManifestSchema = z.object({
  version: z.string().regex(/^\d+(?:\.\d+)*$/),
  releaseUrl: z.string().refine((value) => value === RELEASES_PAGE_URL || value.startsWith(`${RELEASES_PAGE_URL}/`)),
  // 直接指向安装包的地址，按钮点下去就开始下。它比 releaseUrl 更需要限死前缀：这是唯一一个用户不看地址栏就会执行的文件。
  installerUrl: z
    .string()
    .refine((value) => value.startsWith(`${RELEASES_PAGE_URL}/download/`))
    .optional()
    .catch(undefined),
  installerName: installerNameSchema,
  installerSha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional()
    .catch(undefined),
  signed: z.boolean().optional().catch(undefined),
});

type UpdateManifest = z.infer<typeof updateManifestSchema>;

const FALLBACK_INSTALLER_NAME = "MetasequoiaIME_Setup_v<版本>.exe";

// The page must never claim the installer is signed when it is not. The manifest reports what the published asset actually is, so the security note is derived from that rather than written by hand -- an earlier hard-coded note told users to refuse anything without a signature while the only downloadable build was unsigned, which trains people to ignore signature warnings.
const securityNote = (manifest: Partial<UpdateManifest>): string => {
  const lines: string[] = [];

  if (manifest.signed === true) {
    lines.push("Windows 安装包带有数字签名。安装前请在文件属性的「数字签名」标签页确认签名；签名缺失，请勿安装。");
  } else if (manifest.signed === false) {
    lines.push(
      "**当前 Windows 构建未经代码签名**（文件名带 `unsigned`）。SmartScreen 会拦截，需要手动放行，且输入法的 uiAccess 会失效——候选窗无法浮在以管理员身份运行的程序之上。"
    );
    lines.push("");
    lines.push("在签名恢复之前，请改用 SHA256 校验下载的完整性：");
  } else {
    // The manifest could not be read, or predates the field. Saying "unsigned" here would be a claim about a release the page failed to look up -- and the sentence about checking SHA256 instead has nothing to follow it, because the digest comes from the same manifest.
    lines.push("无法读取发布信息，请到 Releases 页面确认该版本是否带有数字签名，并核对页面上给出的 SHA256。");
  }

  if (manifest.installerSha256) {
    const name = manifest.installerName ?? FALLBACK_INSTALLER_NAME;
    lines.push("");
    lines.push("```powershell");
    lines.push(`Get-FileHash .\\${name} -Algorithm SHA256`);
    lines.push("```");
    lines.push("");
    lines.push(`应得到：\`${manifest.installerSha256}\``);
    lines.push("");
    lines.push("这个值由 GitHub 对已存储的文件计算，不是发布说明里手写的，所以走网盘等镜像下载时同样可以用它核对。");
  }

  return lines.join("\n");
};

const fillTemplate = (version: string, releaseUrl: string, manifest: Partial<UpdateManifest>) =>
  downloadSource
    .replaceAll("{{version}}", version)
    .replaceAll("{{releaseUrl}}", releaseUrl)
    .replaceAll("{{securityNote}}", securityNote(manifest))
    .replaceAll("{{installerName}}", manifest.installerName ?? FALLBACK_INSTALLER_NAME);

// Windows 的版本信息来自 update.json；另外两个平台各自在自己的仓库发版，没有等价的清单，所以只能把人送到发布页。
const RELEASE_PAGES: Record<Platform, string> = {
  windows: RELEASES_PAGE_URL,
  macos: "https://github.com/metasequoiaime/MSIME-Apple/releases",
  linux: "https://github.com/metasequoiaime/MSIME-Linux/releases",
};

const PLATFORM_HINTS: Record<Platform, string> = {
  windows: "适用于 Windows 10 与 Windows 11",
  macos: "适用于 macOS 12 及以上，Apple Silicon 与 Intel 通用",
  linux: "IBus 前端，提供 .deb、.rpm 与 .tar.gz",
};

/**
 * 页面顶部的下载入口。
 *
 * 在这之前，这一页最主要的操作是正文项目符号里的一个文字链接，和旁边的镜像链接、说明文字一样重 —— 来下载的人得先读一段才找得到它。这里把它提到页头之下，并且让人自己选平台：按 UA 猜到的那个只是默认选中，三个入口一直都在。
 */
function DownloadPanel({ manifest }: { manifest: UpdateManifest | undefined }) {
  const [platform, setPlatform] = useState(detectPlatform);

  const canDownloadInstaller = platform === "windows" && manifest?.installerUrl !== undefined;
  const href = canDownloadInstaller ? (manifest?.installerUrl as string) : RELEASE_PAGES[platform];
  const label = canDownloadInstaller
    ? `下载 Windows 安装包 v${manifest?.version}`
    : `前往 ${PLATFORM_LABELS[platform]} 发布页`;

  return (
    <div className="download-panel">
      <nav className="download-panel-tabs" aria-label="选择平台">
        {PLATFORMS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={`docs-platform${candidate === platform ? " is-active" : ""}`}
            aria-current={candidate === platform ? "true" : "false"}
            onClick={() => {
              setPlatform(candidate);
            }}
          >
            {PLATFORM_LABELS[candidate]}
          </button>
        ))}
      </nav>

      <div className="download-panel-action">
        <a className="btn btn-lg btn-primary" href={href} rel="noreferrer">
          {label}
          {/* 只有真的开始下文件时才配下载箭头；跳去发布页是导航，配个下载图标是在说假话 */}
          {canDownloadInstaller && <img src="/img/icons/Download.svg" alt="" className="btn-icon" />}
        </a>

        <div className="download-panel-meta">
          <p>{PLATFORM_HINTS[platform]}</p>
          {canDownloadInstaller && manifest?.installerName && (
            <p className="download-panel-file">
              <code>{manifest.installerName}</code>
              {manifest.signed === true && <span className="download-panel-signed">已签名</span>}
              {manifest.signed === false && <span className="download-panel-unsigned">未签名</span>}
            </p>
          )}
        </div>
      </div>

      <p className="download-panel-note">安装步骤、校验值与常见问题见下方 {PLATFORM_LABELS[platform]} 小节。</p>
    </div>
  );
}

const fetchUpdateManifest = async (): Promise<UpdateManifest> => {
  const response = await fetch(`/update.json?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Update manifest returned ${response.status}`);

  return updateManifestSchema.parse(await response.json());
};

export function DownloadPage() {
  const manifest = useQuery({
    queryKey: ["update-manifest"],
    queryFn: fetchUpdateManifest,
    // 清单只在发新版时变，一次会话取一遍就够；`no-store` 加时间戳是为了绕开 CDN 和浏览器缓存，别让它拿到上一版。
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  useEffect(() => {
    if (manifest.error) console.warn("[download] failed to load update manifest:", manifest.error);
  }, [manifest.error]);

  const source = useMemo(() => {
    if (manifest.isPending) return null;
    if (!manifest.data) return fillTemplate("暂时无法获取", RELEASES_PAGE_URL, {});
    return fillTemplate(manifest.data.version, manifest.data.releaseUrl, manifest.data);
  }, [manifest.isPending, manifest.data]);

  return (
    <ContentPage
      documentTitle="下载 | 水杉输入法"
      description="下载水杉输入法"
      kicker={manifest.data ? `Windows v${manifest.data.version}` : "下载"}
      source={source}
      // 页头取未代入版本号的模板：正文会随清单重渲染，标题和摘要不该跟着闪一下
      heroSource={downloadSource}
      contentId="download-content"
      contentClass="download-content"
      sectioned
      banner={<DownloadPanel manifest={manifest.data} />}
    />
  );
}
