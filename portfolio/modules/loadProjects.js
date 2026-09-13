export async function loadProjects() {
  try {
    const response = await fetch('../data/projects.json');
    const projects = await response.json();
    const projectsContainer = document.getElementById('projectsContainer');

    if (!projectsContainer) {
      console.warn('No #projectsContainer element found in the DOM.');
      return;
    }

    projects.forEach(project => {
      const projectCard = document.createElement('div');
      projectCard.className = 'bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-transform duration-200 transform hover:-translate-y-1';

      const imgSrc = project.image ? project.image : 'https://via.placeholder.com/320x200';

      projectCard.innerHTML = `
                <div class="h-40 bg-gray-100 flex items-center justify-center">
                  <img loading="lazy" src="${imgSrc}" alt="${project.title}" class="object-cover h-full w-full" onerror="this.onerror=null;this.src='https://via.placeholder.com/320x200'">
                </div>
                <div class="p-6 text-left">
                    <h3 class="text-lg font-semibold mb-2">${project.title}</h3>
                    <p class="text-sm text-gray-600 mb-4">${project.description}</p>
                    <p class="text-xs text-gray-500">${project.tech}</p>
                </div>
            `;

      projectsContainer.appendChild(projectCard);
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    document.getElementById('projectsContainer').innerHTML = '<p class="text-red-500">Error loading projects. Please try again later.</p>';
  }
}