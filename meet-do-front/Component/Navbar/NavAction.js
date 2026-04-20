function initializeNavbar() {
  const toggler = document.querySelector(".hamburger");
  const navLinksContainer = document.querySelector(".nav-links");

  if (toggler && navLinksContainer) {
    const oldToggler = toggler.cloneNode(true);
    toggler.parentNode.replaceChild(oldToggler, toggler);

    const toggleNav = () => {
      oldToggler.classList.toggle("open");
      const ariaToggle =
        oldToggler.getAttribute("aria-expanded") === "true" ? "false" : "true";
      oldToggler.setAttribute("aria-expanded", ariaToggle);
      navLinksContainer.classList.toggle("open");
    };

    oldToggler.addEventListener("click", toggleNav);

    new ResizeObserver((entries) => {
      if (entries[0].contentRect.width <= 900) {
        navLinksContainer.style.transition = "transform 0.4s ease-out";
      } else {
        navLinksContainer.style.transition = "none";
      }
    }).observe(document.body);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initializeNavbar, 100);
});

window.initializeNavbar = initializeNavbar;
