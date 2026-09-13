const socket = io();

const usernameInput = document.getElementById('usernameInput');
const setUsernameBtn = document.getElementById('setUsernameBtn');
const roomsList = document.getElementById('roomsList');
const joinedRoomsList = document.getElementById('joinedRoomsList');
const privateRoomsList = document.getElementById('privateRoomsList');
const newRoomInput = document.getElementById('newRoomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const inviteInput = document.getElementById('inviteInput');
const joinInviteBtn = document.getElementById('joinInviteBtn');
const messageContainer = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const roomTitle = document.getElementById('roomTitle');
const currentUsernameEl = document.getElementById('currentUsername');
const typingIndicator = document.getElementById('typingIndicator');
const membersContainer = document.createElement('div');
membersContainer.id = 'membersContainer';
membersContainer.className = 'flex items-center gap-2';
// inject into header right side
const headerRight = document.querySelector('main > div > div.flex.items-center.gap-3');
if (headerRight) headerRight.appendChild(membersContainer);
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');

let username = null;
let currentRoom = null;

// Mobile sidebar elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const overlay = document.getElementById('overlay');

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('-translate-x-full');
  overlay.classList.remove('hidden');
}

function closeSidebar() {
  if (!sidebar) return;
  // on md and up sidebar should remain visible via css
  if (window.innerWidth >= 768) return;
  sidebar.classList.add('-translate-x-full');
  overlay.classList.add('hidden');
}

if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
if (overlay) overlay.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

// Add Username
setUsernameBtn.addEventListener("click", () => {
  const desiredName = usernameInput.value.trim();
  if (!desiredName) return alert('Enter a username');

  socket.emit('setUsername', desiredName, (response) => {
    if (response.success) {
      username = desiredName;
      if (currentUsernameEl) currentUsernameEl.textContent = username;
      alert(`Username set to ${username}`);
      // If a room is selected, join it
      if (currentRoom) socket.emit('joinRoom', currentRoom);
    } else {
      alert(response.message);
    }
  });
});

// Rooms list is rendered as buttons; helper to join a room
function joinRoom(roomName) {
  if (!roomName) return;
  if (currentRoom === roomName) return;
  currentRoom = roomName;
  // update UI
  if (roomTitle) roomTitle.textContent = `# ${roomName}`;
  // clear messages
  if (messageContainer) messageContainer.innerHTML = '';
  if (username) socket.emit('joinRoom', roomName);
  // close mobile sidebar after selecting a room
  try { closeSidebar(); } catch (e) { /* ignore if not available */ }
  // highlight active button
  if (roomsList) {
    Array.from(roomsList.children).forEach(btn => {
      btn.classList.toggle('bg-white/10', btn.dataset.room === roomName);
    });
  }
  // add to joinedRoomsList if not already present
  if (joinedRoomsList) {
    if (!Array.from(joinedRoomsList.children).some(c => c.dataset.room === roomName)) {
      const b = document.createElement('button');
      b.className = 'w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between';
      b.dataset.room = roomName;
      b.innerHTML = `<span># ${roomName}</span>`;
      b.addEventListener('click', () => joinRoom(roomName));
      joinedRoomsList.appendChild(b);
    }
  }
}

// Typing indicator: emit typing / stopTyping with debounce
let typingTimer = null;
const TYPING_TIMEOUT = 1200; // ms

messageInput.addEventListener('input', () => {
  if (!username || !currentRoom) return;
  socket.emit('typing');
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => socket.emit('stopTyping'), TYPING_TIMEOUT);
});

socket.on('typing', ({ user }) => {
  if (!typingIndicator) return;
  // add to set of typers
  activeTypers.add(user);
  renderTypers();
});
socket.on('stopTyping', ({ user }) => {
  if (!typingIndicator) return;
  activeTypers.delete(user);
  // small delay before re-render so quick typing blips don't flicker
  setTimeout(renderTypers, 150);
});

// File upload handling
if (uploadBtn && fileInput) {
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!currentRoom) return alert('Join a room first');
    if (!username) return alert('Set a username first');

    const form = new FormData();
    form.append('file', f);

    try {
      const res = await fetch('/upload', { method: 'POST', body: form });
      const json = await res.json();
      if (json && json.success) {
        // show locally in the same way others will see it
        let content = '';
        if (json.mime && json.mime.startsWith('image/')) {
          content = `<img src="${json.path}" alt="${escapeHtml(json.name)}" class="max-w-xs rounded-md" />`;
        } else {
          content = `<a href="${json.path}" target="_blank" class="underline">${escapeHtml(json.name)}</a>`;
        }
        addMessage(username, content, true, getTime());
        // notify server so others can see
        socket.emit('fileShared', { path: json.path, name: json.name, mime: json.mime });
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload error');
    } finally {
      fileInput.value = '';
    }
  });
}

// Display files shared by others
socket.on('fileShared', ({ username: from, path, name, mime, time }) => {
  const isOwn = from === username;
  let content = '';
  // if image mime type, display image tag
  if (mime && mime.startsWith('image/')) {
    content = `<img src="${path}" alt="${escapeHtml(name)}" class="max-w-xs rounded-md" />`;
  } else {
    content = `<a href="${path}" target="_blank" class="underline">${escapeHtml(name)}</a>`;
  }
  addMessage(from, content, isOwn, time);
});

// member list update from server
socket.on('memberList', (list) => {
  // list is array of usernames
  membersContainer.innerHTML = '';
  (list || []).slice(0, 6).forEach(name => {
    const el = document.createElement('div');
    el.className = 'w-7 h-7 rounded-full bg-gray-200 text-xs text-gray-700 flex items-center justify-center';
    el.textContent = (name || '')[0] ? String(name).charAt(0).toUpperCase() : '?';
    el.title = name;
    membersContainer.appendChild(el);
  });
  // show count if more
  if ((list || []).length > 6) {
    const more = document.createElement('div');
    more.className = 'text-xs text-gray-500';
    more.textContent = `+${(list || []).length - 6}`;
    membersContainer.appendChild(more);
  }
  // update room description member count
  const roomDesc = document.getElementById('roomDesc');
  if (roomDesc) {
    const count = (list || []).length;
    roomDesc.textContent = `Public room · ${count} member${count === 1 ? '' : 's'}`;
  }
});

// Typing aggregation
const activeTypers = new Set();
function renderTypers() {
  if (!typingIndicator) return;
  const arr = Array.from(activeTypers).filter(Boolean);
  if (arr.length === 0) {
    typingIndicator.textContent = '\u00A0';
    return;
  }
  if (arr.length === 1) typingIndicator.textContent = `${arr[0]} is typing...`;
  else if (arr.length === 2) typingIndicator.textContent = `${arr[0]} and ${arr[1]} are typing...`;
  else typingIndicator.textContent = `${arr[0]}, ${arr[1]} and ${arr.length - 2} others are typing...`;
}

// Create a new room
createRoomBtn.addEventListener('click', () => {
  const name = (newRoomInput.value || '').trim();
  if (!name) return alert('Enter a room name');
  socket.emit('createRoom', name, (res) => {
    if (res && res.success) {
      newRoomInput.value = '';
      // show invite code to creator
      if (res.inviteCode) {
        prompt('Room created (private). Share this invite code with others to join:', res.inviteCode);
      }
      // auto-join as owner
      // insert the private room into this client's private rooms list (visible only to creator)
      if (privateRoomsList && !Array.from(privateRoomsList.children).some(c => c.dataset.room === name)) {
        const btn = document.createElement('button');
        btn.className = 'w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between';
        btn.dataset.room = name;
        btn.dataset.private = 'true';
        btn.innerHTML = `<span># ${name}</span><span class="text-xs text-gray-500">🔒</span>`;
        btn.addEventListener('click', () => joinRoom(name));
        // add to top of private list so creator sees it immediately
        privateRoomsList.insertBefore(btn, privateRoomsList.firstChild);
      }
      joinRoom(name);
    } else {
      alert(res && res.message ? res.message : 'Failed to create room');
    }
  });
});

// Join by invite code
if (joinInviteBtn && inviteInput) {
  joinInviteBtn.addEventListener('click', () => {
    const code = (inviteInput.value || '').trim();
    if (!code) return alert('Enter an invite code');
    socket.emit('joinWithInvite', code, (res) => {
      if (res && res.success) {
        inviteInput.value = '';
        joinRoom(res.room);
      } else {
        alert(res && res.message ? res.message : 'Invalid invite code');
      }
    });
  });
}

// Listen for incoming messages
socket.on("chatMessage", ({ username: from, text, time }) => {
  const safeText = sanitizeAndFormat(text);
  const isOwn = from === username;
  addMessage(from, safeText, isOwn, time);
});

// Incoming system messages
socket.on("systemMessage", (message) => {
  // show transient floating notification instead of inline system message
  showNotification(sanitizeAndFormat(message));
});

// Notifications: top-center floating messages that disappear after 1s
function showNotification(htmlContent) {
  const container = document.getElementById('notifications');
  if (!container) return;
  const note = document.createElement('div');
  note.className = 'bg-white/95 text-gray-800 px-4 py-2 rounded-full shadow-md pointer-events-auto transition-opacity duration-300 opacity-0';
  note.innerHTML = htmlContent;
  container.appendChild(note);
  // trigger fade in
  requestAnimationFrame(() => { note.classList.remove('opacity-0'); note.classList.add('opacity-100'); });
  // remove after 1s (fade out then remove)
  setTimeout(() => {
    note.classList.remove('opacity-100');
    note.classList.add('opacity-0');
    setTimeout(() => { try { container.removeChild(note); } catch (e) { } }, 300);
  }, 1000);
}

// Update room list when server sends it
socket.on('roomList', (list) => {
  // list expected to be array of room names
  if (!roomsList) return;
  const prev = currentRoom;
  roomsList.innerHTML = '';
  (list || []).forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between';
    btn.dataset.room = r;
    btn.innerHTML = `<span># ${r}</span>`;
    btn.addEventListener('click', () => joinRoom(r));
    roomsList.appendChild(btn);
  });
  // if previous room still exists, keep it, else join first
  if (prev && Array.from(roomsList.children).some(c => c.dataset.room === prev)) {
    joinRoom(prev);
  } else if (roomsList.children.length) {
    joinRoom(roomsList.children[0].dataset.room);
  }
});


messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (messageInput.value || '').trim();
  if (!text) return;
  if (!username) return alert('Set a username first');
  if (!currentRoom) return alert('Join or create a room first');

  addMessage(username, sanitizeAndFormat(text), true, getTime()); // Show locally as own message
  socket.emit("chatMessage", text); // Send to server
  messageInput.value = "";
});

function addMessage(sender, message, isOwn, time) {
  const wrapper = document.createElement('div');
  wrapper.className = `flex items-start gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`;

  const bubble = document.createElement('div');
  const header = document.createElement('div');
  header.className = 'text-sm font-semibold';
  header.innerHTML = `${escapeHtml(sender)} <span class="text-xs text-gray-400 font-normal">· ${time || getTime()}</span>`;

  if (isOwn) {
    bubble.className = 'mt-1 inline-block px-4 py-2 bg-blue-600 text-white rounded-2xl shadow-sm max-w-xl break-words';
  } else if (String(sender).toLowerCase().includes('system')) {
    bubble.className = 'mt-1 px-4 py-2 bg-green-100 text-gray-800 rounded-2xl max-w-xl';
  } else {
    bubble.className = 'mt-1 px-4 py-2 bg-white text-gray-800 rounded-2xl shadow-sm max-w-xl break-words';
  }

  bubble.innerHTML = `${message}`; // message already sanitized

  const container = document.createElement('div');
  if (isOwn) {
    container.appendChild(header);
    container.appendChild(bubble);
  } else {
    container.appendChild(header);
    container.appendChild(bubble);
  }

  wrapper.appendChild(container);
  messageContainer.appendChild(wrapper);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}

function sanitizeAndFormat(text) {
  let safe = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"); // bold
  safe = safe.replace(/_(.*?)_/g, "<em>$1</em>"); // italic
  safe = safe.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="underline">$1</a>'); // links
  return safe;
}

function escapeHtml(unsafe) {
  return String(unsafe).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}