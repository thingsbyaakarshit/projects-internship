import { loadProjects } from '../modules/loadProjects.js';
import { initContactForm } from '../modules/footerForm.js';

document.getElementById("down-btn").addEventListener("click", () => {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
});

document.getElementById("up-btn").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("about-link").addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({ top: document.getElementById("about").offsetTop, behavior: "smooth" });
});

const homeLink = document.getElementById('home-link');
if (homeLink) {
  homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    // smooth scroll to top / hero
    const hero = document.getElementById('hero');
    if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


const loadHTML = async (filePath, targetId) => {
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
    const htmlContent = await response.text();
    document.getElementById(targetId).innerHTML = htmlContent;
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

(async () => {
  await loadHTML("./pages/about.html", "about");
  const footerLoaded = await loadHTML("./components/footer.html", "footer");
  if (footerLoaded) {
    // initialize contact form handlers once footer is rendered
    initContactForm();
  }

  loadProjects();
})();