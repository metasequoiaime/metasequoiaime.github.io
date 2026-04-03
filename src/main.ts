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
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const maybePromise = heroVideo.play();
          if (maybePromise && typeof maybePromise.catch === "function") {
            maybePromise.catch(() => { });
          }
        } else {
          heroVideo.pause();
        }
      }
    },
    { threshold: 0.25 }
  );

  observer.observe(heroVideo);
}
