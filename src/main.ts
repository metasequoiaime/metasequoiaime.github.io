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

const headerWrap = document.querySelector<HTMLElement>(".header-wrap");
if (headerWrap) {
  let lastScrollY = window.scrollY;
  let ticking = false;

  const updateHeader = () => {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;
    const shouldHide = delta > 8 && currentY > 60;
    const shouldShow = delta < -8 || currentY <= 10;

    if (shouldHide) {
      headerWrap.classList.add("header--hidden");
    } else if (shouldShow) {
      headerWrap.classList.remove("header--hidden");
    }

    lastScrollY = currentY;
    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    },
    { passive: true }
  );
}
