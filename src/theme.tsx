import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

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

/** 圆形擦除的圆心，用视口坐标。传的是刚点下的那个按钮的中心。 */
export type RevealOrigin = { x: number; y: number };

type ThemeContextValue = {
  theme: ThemeChoice;
  /** 当前实际渲染的是不是亮色。跟随系统时随系统设置变化，主题图标和 hero 演示媒体都按它选。 */
  isLight: boolean;
  setTheme: (theme: ThemeChoice, origin?: RevealOrigin) => void;
};

/** 圆心到视口四角的最远距离，擦除圆长到这个半径才能盖满整屏 */
const radiusToFarthestCorner = ({ x, y }: RevealOrigin) =>
  Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

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

  const setTheme = useCallback((next: ThemeChoice, origin?: RevealOrigin) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The theme still applies for this session when storage is unavailable.
    }

    const root = document.documentElement;
    const canReveal =
      origin !== undefined &&
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canReveal) {
      setThemeState(next);
      return;
    }

    root.style.setProperty("--theme-origin-x", `${origin.x}px`);
    root.style.setProperty("--theme-origin-y", `${origin.y}px`);
    root.style.setProperty("--theme-radius", `${radiusToFarthestCorner(origin)}px`);
    root.classList.add("theme-transition");

    // flushSync：startViewTransition 要在回调返回前就看到新的 DOM，React 默认的批处理会把更新推到回调之后，那样拍到的新快照还是旧配色。
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setThemeState(next);
      });
    });

    void transition.finished
      .catch(() => {})
      .finally(() => {
        root.classList.remove("theme-transition");
      });
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
