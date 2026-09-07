import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { THEME_CHOICES, THEME_LABELS, useTheme } from "./theme";

const NAV_ITEMS = [
  { to: "/", label: "首页", icon: "home" },
  { to: "/docs/", label: "文档", icon: "docs" },
  { to: "/price/", label: "价格", icon: "price" },
  { to: "/code/", label: "开源代码", icon: "code" },
  { to: "/download/", label: "下载", icon: "download" },
  { to: "/about/", label: "关于", icon: "about" },
] as const;

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function ThemeSwitcher() {
  const { theme, isLight, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 要两帧：单帧的回调跑在本帧样式计算之前，is-dark 和 is-ready 会落进同一次样式变更，过渡照样会启动 —— 那正是这个开关要拦掉的首帧淡入。
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => buttonRef.current?.classList.add("is-ready"));
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("click", closeOnOutsideClick);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className={`theme-switcher${isOpen ? " is-open" : ""}`} id="theme-switcher" ref={switcherRef}>
      <button
        className={`theme-button${isLight ? "" : " is-dark"}`}
        id="theme-button"
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`主题：${THEME_LABELS[theme]}`}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
      >
        <svg className="theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
        </svg>
        <svg className="theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8z" />
        </svg>
      </button>

      <div className="theme-options" id="theme-options" role="menu" aria-label="主题模式">
        {THEME_CHOICES.map((choice) => (
          <button
            key={choice}
            className={`theme-option${theme === choice ? " is-selected" : ""}`}
            type="button"
            role="menuitemradio"
            aria-checked={theme === choice}
            onClick={() => {
              setTheme(choice);
              setIsOpen(false);
            }}
          >
            {THEME_LABELS[choice]}
          </button>
        ))}
      </div>
    </div>
  );
}

function NavMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const listRef = useRef<HTMLUListElement>(null);
  const activeLinkRef = useRef<HTMLElement | null>(null);

  // 当前 tab 的胶囊从上一页的位置滑过来。偏移要在浏览器画这一帧之前写好，否则胶囊会先出现在终点再跳回起点。
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname 不在函数体里用，它是触发条件 —— 换页之后才去量新旧两个标签的位置差
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const active = list.querySelector<HTMLElement>('.nav-link[aria-current="page"]');
    const previous = activeLinkRef.current;
    activeLinkRef.current = active;

    if (!active || !previous || previous === active) return;

    list.style.setProperty("--pill-from", `${previous.offsetLeft - active.offsetLeft}px`);
    list.classList.add("is-sliding");
  }, [pathname]);

  return (
    <nav className={`nav-menu${isOpen ? " show" : ""}`} id="nav-menu" aria-label="站点导航">
      <button className="btn-close" id="btn-close" type="button" aria-label="关闭导航菜单" onClick={onClose}>
        <img src="/img/icons/Close_round.svg" alt="" className="nav-icon" />
      </button>

      <ul
        className="nav-list"
        ref={listRef}
        // 动画挂在活动链接的 ::before 上，事件从伪元素冒泡到链接再到这里。跑完就摘掉 is-sliding，下次换页才能重新触发。
        onAnimationEnd={() => listRef.current?.classList.remove("is-sliding")}
      >
        {NAV_ITEMS.map((item) => (
          <li className="nav-item" key={item.to}>
            <Link to={item.to} className="nav-link" activeOptions={{ exact: item.to === "/" }} onClick={onClose}>
              <img src={`/img/icons/nav/${item.icon}.svg`} alt="" className="nav-link-icon" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** 向下滚动时收起顶栏，向上滚或回到顶部时放出来 */
function useHeaderAutoHide(menuIsOpen: boolean) {
  const menuIsOpenRef = useRef(menuIsOpen);
  menuIsOpenRef.current = menuIsOpen;

  useEffect(() => {
    const headerWrap = document.querySelector<HTMLElement>(".header-wrap");
    if (!headerWrap) return;

    let lastScrollY = Math.max(0, window.scrollY);
    let ticking = false;
    let hidden = false;

    const updateHeader = () => {
      // 菜单打开时保持顶栏可见
      if (menuIsOpenRef.current) {
        if (hidden) {
          headerWrap.classList.remove("header--hidden");
          hidden = false;
        }

        lastScrollY = Math.max(0, window.scrollY);
        ticking = false;
        return;
      }

      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollY;
      const shouldHide = delta > 2 && currentY > 4;
      const shouldShow = delta < -2 || currentY <= 4;

      if (shouldHide && !hidden) {
        headerWrap.classList.add("header--hidden");
        hidden = true;
      } else if (shouldShow && hidden) {
        headerWrap.classList.remove("header--hidden");
        hidden = false;
      }

      lastScrollY = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHeader);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-grid">
          <div>
            <div className="site-footer-brand">
              <img src="/msime-logo.png" width="30" height="30" decoding="async" alt="" />
              <span>水杉输入法</span>
            </div>
            <p className="site-footer-desc">开源中文输入法。各平台共用同一套 C++ 引擎，界面与文本注入各自原生实现。GPL-3.0。</p>
            <div className="site-footer-chips">
              <a href="https://t.me/msimegroup" target="_blank" rel="noreferrer">Telegram</a>
              <span>QQ 群 829919142</span>
              <a href="mailto:metasequoiaime@gmail.com">邮箱</a>
            </div>
          </div>

          <div>
            <div className="site-footer-col-title">产品</div>
            <div className="site-footer-links">
              <Link to="/download/">下载</Link>
              <Link to="/price/">价格</Link>
              <Link to="/docs/">文档</Link>
            </div>
          </div>

          <div>
            <div className="site-footer-col-title">项目</div>
            <div className="site-footer-links">
              <Link to="/code/">开源代码</Link>
              <Link to="/about/">关于</Link>
              <Link to="/privacy/">隐私说明</Link>
              <a href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">GitHub 组织</a>
            </div>
          </div>

          <div>
            <div className="site-footer-col-title">参与</div>
            <div className="site-footer-links">
              <a href="https://github.com/metasequoiaime/.github/blob/main/RECRUITING.md" target="_blank" rel="noreferrer">招募开源开发者</a>
              <a href="https://github.com/metasequoiaime/.github/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">贡献指南</a>
              <a href="https://github.com/metasequoiaime/.github/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noreferrer">行为准则</a>
            </div>
          </div>
        </div>

        <div className="site-footer-bottom">
          <span>Copyright © 2026-present</span>
          <a href="https://github.com/fanlusky" target="_blank" rel="noreferrer">fanlusky</a>
          <span>@<span className="lxl">乱序楼</span></span>
          <span className="site-footer-license">GPL-3.0</span>
          <a className="site-footer-site" href="https://msime.app" target="_blank" rel="noreferrer">msime.app</a>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell() {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const closeMenu = useCallback(() => {
    setMenuIsOpen(false);
  }, []);

  useHeaderAutoHide(menuIsOpen);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuIsOpen);
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [menuIsOpen]);

  useEffect(() => {
    if (!menuIsOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuIsOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuIsOpen]);

  return (
    <>
      <div className="header-wrap">
        <header className="container header">
          <Link className="logo" to="/">
            <img src="/msime-logo.png" width="34" height="34" decoding="async" alt="logo" />
            <span className="logo-text">水杉输入法</span>
          </Link>

          <div className="header-actions">
            <a className="header-github" href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">
              <GithubMark />
              <span>GitHub</span>
            </a>

            <ThemeSwitcher />

            <button
              className="btn-toggle"
              id="btn-toggle"
              type="button"
              aria-label="打开导航菜单"
              onClick={() => {
                setMenuIsOpen(true);
              }}
            >
              <img src="/img/icons/Menu.svg" alt="" className="nav-icon" />
            </button>
          </div>
        </header>
      </div>

      <NavMenu isOpen={menuIsOpen} onClose={closeMenu} />

      <Outlet />

      <SiteFooter />
    </>
  );
}
