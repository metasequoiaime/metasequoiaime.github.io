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
