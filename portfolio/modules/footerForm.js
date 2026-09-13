export function initContactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';

    const name = form.elements['name']?.value?.trim();
    const email = form.elements['email']?.value?.trim();
    const message = form.elements['message']?.value?.trim();

    // Simple validation
    if (!name) {
      status.textContent = 'Please enter your name.';
      status.className = 'text-red-600';
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      status.textContent = 'Please enter a valid email.';
      status.className = 'text-red-600';
      return;
    }
    if (!message) {
      status.textContent = 'Please enter a message.';
      status.className = 'text-red-600';
      return;
    }

    // Prepare payload
    const payload = { name, email, message, submittedAt: new Date().toISOString() };

    try {
      // Save locally as a fallback
      const submissions = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
      submissions.push(payload);
      localStorage.setItem('contactSubmissions', JSON.stringify(submissions));

      // Optionally attempt to POST to a server endpoint if you add one later.
      // If you have a real endpoint, replace the URL below with it.
      // await fetch('https://example.com/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });

      status.textContent = 'Thanks — your message was saved locally. I will get back to you soon.';
      status.className = 'text-green-600';
      form.reset();
    } catch (err) {
      console.error('Contact form error:', err);
      status.textContent = 'There was an error saving your message. Please try again.';
      status.className = 'text-red-600';
    }
  });
}
