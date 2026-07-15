const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const gamesToggle = document.querySelector(".games-toggle");
const gamesMenu = document.querySelector(".games-menu");

function setExpanded(button, expanded) {
  if (button) {
    button.setAttribute("aria-expanded", String(expanded));
  }
}

if (menuToggle && primaryNav) {
  menuToggle.addEventListener("click", () => {
    const open = primaryNav.classList.toggle("is-open");
    setExpanded(menuToggle, open);
  });
}

if (gamesToggle && gamesMenu) {
  gamesToggle.addEventListener("click", () => {
    const hidden = gamesMenu.hasAttribute("hidden");
    if (hidden) {
      gamesMenu.removeAttribute("hidden");
      setExpanded(gamesToggle, true);
    } else {
      gamesMenu.setAttribute("hidden", "");
      setExpanded(gamesToggle, false);
    }
  });

  gamesMenu.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      gamesMenu.setAttribute("hidden", "");
      setExpanded(gamesToggle, false);
    }
  });
}
