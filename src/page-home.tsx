import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { CommunitySection } from "./community-section";
import { useReveal } from "./use-reveal";
import { useTheme } from "./theme";

/**
 * 演示视频只在两个条件同时成立时播：处于当前主题、且在视口里。滚动过程中先暂停解码，停滑 140ms 后再恢复，兼顾演示动画和滚动流畅。
 *
 * 暗色主题下显示的是 GIF，样式表已经把不匹配的那个藏起来了，这里只管别让藏起来的视频在后台空转。
 */
function useHeroVideo(videoRef: React.RefObject<HTMLVideoElement | null>, matchesTheme: boolean) {
  const matchesThemeRef = useRef(matchesTheme);
  matchesThemeRef.current = matchesTheme;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let inView = false;
    let scrollPaused = false;
    let resumeTimer = 0;

    const sync = () => {
      if (!inView || scrollPaused || !matchesThemeRef.current) {
        video.pause();
        return;
      }

      void video.play().catch(() => {});
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = entry.isIntersecting;
          sync();
        }
      },
      { rootMargin: "64px 0px", threshold: 0.05 }
    );

    observer.observe(video);

    const onScroll = () => {
      if (!scrollPaused) {
        scrollPaused = true;
        video.pause();
      }

      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        scrollPaused = false;
        sync();
      }, 140);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(resumeTimer);
    };
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (matchesTheme) {
      void video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [videoRef, matchesTheme]);
}

const FEATURES = [
  {
    kicker: "输入方案",
    title: "全拼 · 双拼 · 五笔",
    desc: "双拼支持小鹤、自然码、首道与微软方案，五笔提供 86 版。辅助码可选蓝天小雨点、自然码、首右 2.0、首右 Plus 和小鹤，把同音候选缩小到更容易挑选的范围。",
  },
  {
    kicker: "云候选与 AI",
    title: "本地优先，云端可选",
    desc: "谷歌云候选插入第一页第 2 项，DeepSeek AI 联想插入第 3 项。两者都需要网络，接口异常时不影响本地候选；API Token 只保存在本机配置里。",
  },
  {
    kicker: "界面与工具",
    title: "候选窗之外的部分",
    desc: "候选窗支持横排与纵排、自定义字体与皮肤，另有悬浮工具栏、语音输入、手写识别板和屏幕键盘，各界面主题都可以单独设置。",
  },
] as const;

const HERO_STATS = [
  { value: "3 套", label: "输入方案", isText: false },
  { value: "5 套", label: "辅助码方案", isText: false },
  { value: "4 个", label: "平台前端", isText: false },
  { value: "GPL-3.0", label: "100% 开源", isText: true },
] as const;

const PLATFORMS = [
  { name: "Windows 10 / 11", desc: "纯 TSF 前端 + 常驻 Server", status: "公开内测", isLive: true },
  { name: "macOS 12+", desc: "InputMethodKit + AppKit", status: "开发中", isLive: false },
  { name: "Linux", desc: "IBus 前端，另含 GTK 设置程序", status: "开发中", isLive: false },
  { name: "iOS", desc: "宿主 App + 键盘扩展", status: "开发中", isLive: false },
] as const;

export function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isLight } = useTheme();

  useHeroVideo(videoRef, isLight);
  useReveal();

  return (
    <main>
      <div className="hero-band">
        <div className="hero-glow" aria-hidden="true" />
        <svg className="hero-mark" viewBox="0 0 100 110" aria-hidden="true">
          <path d="M74.7 14L35.2 29.2L74.7 40.6L35.2 59.5C72.6 65.8 107.7 71 33 95" />
        </svg>

        <div className="container hero">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-line" />
              <span className="hero-eyebrow-text">MSIME · OPEN SOURCE IME</span>
            </div>

            <h1 className="hero-title">
              改善中英文输入体验，<span>一套引擎，四个平台</span>
            </h1>

            <p className="hero-desc">全拼、双拼、五笔共用同一套跨平台 C++ 引擎，Windows、macOS、Linux 与 iOS 前端各自原生实现界面与文本注入。</p>

            <p className="hero-quote">墨池飞出北溟鱼，笔锋杀尽中山兔。</p>

            <div className="hero-buttons btn-row">
              <Link className="btn btn-lg btn-primary" to="/download/">
                下载
                <img src="/img/icons/Download.svg" alt="" className="btn-icon" />
              </Link>
              <Link className="btn btn-lg btn-ghost" to="/docs/">
                阅读文档
              </Link>
            </div>
          </div>

          <div className="hero-stats card-lift">
            {HERO_STATS.map((stat) => (
              <div key={stat.label}>
                <div className={`hero-stat-value${stat.isText ? " is-text" : ""}`}>{stat.value}</div>
                <div className="hero-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="hero-demo">
            <div className="hero-screenshot">
              <div className="hero-screenshot-bar">
                <span className="hero-screenshot-dot" />
                <span className="hero-screenshot-dot" />
                <span className="hero-screenshot-dot" />
                <span className="hero-screenshot-title">水杉输入法 · 输入演示</span>
              </div>
              <img className="hero-media hero-media-dark" src="/img/typing_words_dark.gif" alt="输入演示" />
              <video
                className="hero-media hero-media-light"
                ref={videoRef}
                muted
                loop
                playsInline
                preload="metadata"
                poster="/img/typing_words_light_poster.jpg"
                aria-label="输入演示"
              >
                <source src="/img/typing_words_light.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </div>

      <section className="container section">
        <div className="section-eyebrow" data-reveal>
          <span>能力</span>
          <span className="section-rule" />
        </div>

        <div className="feature-grid" data-reveal-stagger>
          {FEATURES.map((feature) => (
            <div className="card card-lift feature-card" data-reveal key={feature.kicker}>
              <div className="feature-kicker">{feature.kicker}</div>
              <div className="feature-title">{feature.title}</div>
              <div className="feature-desc">{feature.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-eyebrow" data-reveal>
          <span>开源</span>
          <span className="section-rule" />
        </div>

        <div className="card open-card" data-reveal>
          <h2>100% 开源，GPL-3.0</h2>
          <p>输入法能看到用户输入的一切，隐私边界不该只靠承诺保证，而该能被任何人读代码检查。桌面工具软件长期由少数大厂主导，我们想留一个用户可以自己改、自己分发的选择。</p>
          <p>
            项目长期招募贡献者，方向不限于写代码 —— 词库、文档、本地化、兼容性测试同样算贡献。主仓的 Issue 已经按可接手程度分类，<code>no-code</code> 完全不需要写代码。
          </p>
          <div className="btn-row">
            <a className="btn btn-primary" href="https://github.com/metasequoiaime" target="_blank" rel="noreferrer">
              在 GitHub 上参与
            </a>
            <Link className="btn btn-soft" to="/code/">
              看全部仓库
            </Link>
          </div>
        </div>
      </section>

      <CommunitySection />

      <section className="container section">
        <div className="section-eyebrow" data-reveal>
          <span>平台与下载</span>
          <span className="section-rule" />
        </div>

        <h2 className="section-title" data-reveal>
          四个平台，一套引擎
        </h2>
        <p className="section-lead" data-reveal>
          前端各自原生实现，下载与安装说明统一在下载页。
        </p>

        <div className="platform-list" data-reveal>
          {PLATFORMS.map((platform) => (
            <div className="platform-row" key={platform.name}>
              <span className="platform-name">{platform.name}</span>
              <span className="platform-desc">{platform.desc}</span>
              <span className={`platform-status${platform.isLive ? " is-live" : ""}`}>{platform.status}</span>
            </div>
          ))}
        </div>

        <div className="btn-row platform-cta" data-reveal>
          <Link className="btn btn-primary" to="/download/">
            前往下载页
            <img src="/img/icons/Download.svg" alt="" className="btn-icon" />
          </Link>
          <Link className="btn btn-ghost" to="/code/">
            查看仓库
          </Link>
        </div>
      </section>
    </main>
  );
}
