import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

export const THEME_CHOICES = ["light", "dark", "system"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "亮色",
  dark: "暗色",
  system: "跟随系统",
};

const STORAGE_KEY = "msime-theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

const isThemeChoice = (value: unknown): value is ThemeChoice =>
  typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);

/** The inline bootstrap in each HTML head already wrote `data-theme` before first paint, so read it back rather than storage: it is the value the document is actually rendering with. */
const readInitialTheme = (): ThemeChoice => {
  const applied = document.documentElement.dataset.theme;
  if (isThemeChoice(applied)) return applied;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

const prefersLight = () => window.matchMedia(LIGHT_QUERY).matches;

const resolveIsLight = (theme: ThemeChoice, systemIsLight: boolean) =>
  theme === "light" ? true : theme === "dark" ? false : systemIsLight;

type ThemeContextValue = {
  theme: ThemeChoice;
  /** 当前实际渲染的是不是亮色。跟随系统时随系统设置变化，主题图标和 hero 演示媒体都按它选。 */
  isLight: boolean;
  setTheme: (theme: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(readInitialTheme);
  const [systemIsLight, setSystemIsLight] = useState(prefersLight);

  useEffect(() => {
    const query = window.matchMedia(LIGHT_QUERY);
    const sync = () => {
      setSystemIsLight(query.matches);
    };

    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme =
      theme === "light" ? "light" : theme === "dark" ? "dark" : "light dark";

    // preload 只是给 dev 兜底：那时样式由脚本注入，得先把整页遮住。React 把首屏提交进 DOM 之后再放开，这一帧就已经是带样式的内容了。
    document.documentElement.classList.remove("preload");
  }, [theme]);

  const setTheme = useCallback((next: ThemeChoice) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }

    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isLight: resolveIsLight(theme, systemIsLight), setTheme }),
    [theme, systemIsLight, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
};
