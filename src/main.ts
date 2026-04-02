import "./style.scss";

const root = document.documentElement;
root.classList.remove("preload");
root.classList.add("ready");

type WindowWithLibs = Window & {
  AOS?: { init: () => void };
  gsap?: { from: (target: string, vars: Record<string, unknown>) => void };
};

const navId = document.getElementById("nav_menu");
const toggleBtnId = document.getElementById("toggle_btn");
const closeBtnId = document.getElementById("close_btn");

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

const { AOS, gsap } = window as WindowWithLibs;

if (AOS?.init) {
  AOS.init();
}

if (gsap?.from) {
  gsap.from(".logo", {
    opacity: 0,
    y: -10,
    delay: 0,
    duration: 0.3,
  });

  gsap.from(".nav_menu_list .nav_menu_item", {
    opacity: 0,
    y: -10,
    delay: 0.1,
    duration: 0.3,
    stagger: 0.08,
  });

  gsap.from(".toggle_btn", {
    opacity: 0,
    y: -10,
    delay: 0.1,
    duration: 0.3,
  });

  gsap.from(".main-heading", {
    opacity: 0,
    y: 20,
    delay: 0.2,
    duration: 0.4,
  });

  gsap.from(".info-text", {
    opacity: 0,
    y: 20,
    delay: 0.3,
    duration: 0.4,
  });

  gsap.from(".btn_wrapper", {
    opacity: 0,
    y: 20,
    delay: 0.3,
    duration: 0.4,
  });

  gsap.from(".team_img_wrapper img", {
    opacity: 0,
    y: 20,
    delay: 0.4,
    duration: 0.4,
  });
}
