function initializeNavbar() {
  const toggler = document.querySelector(".meetdo-toggler");
  const navLinksContainer = document.querySelector(".meetdo-collapse");

  if (toggler && navLinksContainer) {
    const oldToggler = toggler.cloneNode(true);
    oldToggler.removeAttribute("onclick");
    toggler.parentNode.replaceChild(oldToggler, toggler);

    const toggleNav = () => {
      const ariaToggle =
        oldToggler.getAttribute("aria-expanded") === "true" ? "false" : "true";
      oldToggler.setAttribute("aria-expanded", ariaToggle);
      navLinksContainer.classList.toggle("show");
    };

    oldToggler.addEventListener("click", toggleNav);

    new ResizeObserver((entries) => {
      if (entries[0].contentRect.width > 991) {
        navLinksContainer.classList.remove("show");
        oldToggler.setAttribute("aria-expanded", "false");
      }
    }).observe(document.body);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initializeNavbar, 100);
});

window.initializeNavbar = initializeNavbar;
