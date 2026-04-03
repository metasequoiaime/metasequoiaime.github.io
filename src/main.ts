import "./style.scss";

document.documentElement.classList.remove("preload");

const navId = document.getElementById("nav-menu");
const toggleBtnId = document.getElementById("btn-toggle");
const closeBtnId = document.getElementById("btn-close");

if (navId && toggleBtnId) {
  toggleBtnId.addEventListener("click", () => {
    navId.classList.add("show");
  });
}

if (navId && closeBtnId) {
  closeBtnId.addEventListener("click", () => {
    navId.classList.remove("show");
  });
}

const heroVideo = document.querySelector<HTMLVideoElement>(".hero-media");
if (heroVideo && "IntersectionObserver" in window) {
  let isInView = false;
  let scrollPauseTimer: number | undefined;

  const safePlay = () => {
    const maybePromise = heroVideo.play();
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.catch(() => { });
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        isInView = entry.isIntersecting;
        if (isInView) {
          safePlay();
        } else {
          heroVideo.pause();
        }
      }
    },
    { threshold: 0.25 }
  );

  const onScroll = () => {
    if (!isInView) return;
    heroVideo.pause();
    if (scrollPauseTimer) {
      window.clearTimeout(scrollPauseTimer);
    }
    scrollPauseTimer = window.setTimeout(() => {
      if (isInView) {
        safePlay();
      }
    }, 160);
  };

  observer.observe(heroVideo);
  window.addEventListener("scroll", onScroll, { passive: true });
}
