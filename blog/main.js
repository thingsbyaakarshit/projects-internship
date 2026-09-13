import { renderBlogsCard, renderBlogPost } from "./src/modules/renderData.js";
import initLogin from './src/modules/login.js';
import './src/modules/comments.js';

// Function to fetch and inject HTML content
async function loadComponent(componentPath, targetId) {
  try {
    const response = await fetch(componentPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${componentPath}: ${response.statusText}`);
    }
    const htmlContent = await response.text();
    document.getElementById(targetId).innerHTML = htmlContent;
  } catch (error) {
    console.error(`Error loading component into #${targetId}:`, error);
  }
}

// Load components into respective divs
document.addEventListener("DOMContentLoaded", async () => {
  await initLogin();

  loadComponent('./components/about.html', 'about');
  loadComponent('./components/footer.html', 'footer');

  renderBlogsCard();
  renderBlogPost();
});