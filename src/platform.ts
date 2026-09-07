export const PLATFORMS = ["windows", "macos", "linux"] as const;

export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

/**
 * 按 UA 猜访客的系统，猜不出当作 Windows。
 *
 * 只用来决定默认给谁看哪一份内容，三个平台的入口始终都在页面上 —— 猜错了也只是多点一下，不会挡住任何人。Android 会带 Linux 字样，得排掉。
 */
export const detectPlatform = (): Platform => {
  const ua = navigator.userAgent;
  if (/Mac OS X|Macintosh/.test(ua)) return "macos";
  if (/Linux/.test(ua) && !/Android/.test(ua)) return "linux";
  return "windows";
};
