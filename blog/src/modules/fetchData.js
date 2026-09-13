const fetchBlogs = async () => {
  const response = await fetch('/src/data/blogs.json');
  if (!response.ok) {
    throw new Error('Failed to fetch blogs.json');
  }
  return await response.json();
};

export default fetchBlogs;