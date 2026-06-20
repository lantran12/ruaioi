// ================= FIREBASE INIT =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, get, set, remove,
  onValue, query, orderByChild, equalTo, limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as fbUpdateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app = initializeApp({
  apiKey: "AIzaSyBimiEGQcW9at2pOxfdUaJHjim2fmyjjcc",
  authDomain: "dongchanrua.firebaseapp.com",
  databaseURL: "https://dongchanrua-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = getDatabase(app);
const auth = getAuth(app);

// ================= GLOBAL STATE =================
const state = {
  isSignUp: true,
  selectedAvatar: "",
  notiUnsub: null,
  bookshelfUnsub: null
};

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initFilters();
  loadGenres();
  loadStories();
  loadTop();
  listenNotifications();
});

// ================= EVENTS =================
function bindEvents() {
  document.getElementById("btnAuthSubmit")?.addEventListener("click", submitAuth);

  document.getElementById("searchInput")?.addEventListener("keypress", e => {
    if (e.key === "Enter") triggerSearch();
  });
}

// ================= FILTER =================
function initFilters() {
  document.querySelectorAll(".nav-link-btn").forEach(btn => {
    if (btn.id === "tagDropdownBtn") return;

    btn.onclick = () => {
      document.querySelectorAll(".nav-link-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const type = btn.dataset.filter;

      if (type === "new") {
        closeSearch();
        loadStories();
      }

      if (type === "completed") {
        loadByCondition("status", "Hoàn thành");
      }
    };
  });
}

// ================= STORIES =================
function loadStories() {
  const grid = document.getElementById("bookGrid");
  if (!grid) return;

  grid.innerHTML = "Đang tải...";

  const q = query(ref(db, "stories"), orderByChild("updatedAt"));

  get(q).then(snap => {
    grid.innerHTML = "";

    const arr = [];
    snap.forEach(c => arr.push({ id: c.key, ...c.val() }));

    renderFeatured(arr);

    arr.reverse().forEach(s => grid.appendChild(createCard(s)));
  });
}

// FEATURED
function renderFeatured(list) {
  if (!list.length) return;

  const s = list[Math.floor(Math.random() * list.length)];

  const title = document.getElementById("heroTitle");
  const desc = document.getElementById("heroSynopsis");
  const link = document.getElementById("heroLink");
  const box = document.getElementById("featuredBook");

  const url = `book.html?id=${s.id}`;

  if (title) title.textContent = s.title;
  if (desc) desc.textContent = s.description || s.synopsis || "";
  if (link) link.href = url;

  if (box && s.img) {
    box.style.background = `linear-gradient(to right, rgba(255,255,255,0.9), transparent), url(${s.img})`;
    box.onclick = () => location.href = url;
  }
}

// ================= TOP =================
function loadTop() {
  const container = document.getElementById("nominationListContainer");
  if (!container) return;

  const q = query(ref(db, "stories"), orderByChild("views"), limitToLast(5));

  get(q).then(snap => {
    container.innerHTML = "";

    const arr = [];
    snap.forEach(c => arr.push({ id: c.key, ...c.val() }));

    arr.reverse().forEach((s, i) => {
      const div = document.createElement("div");
      div.className = "story-card";

      div.innerHTML = `
        <img src="${s.img || ""}">
        <h4>TOP ${i + 1}. ${s.title}</h4>
      `;

      div.onclick = () => location.href = `book.html?id=${s.id}`;
      container.appendChild(div);
    });
  });
}

// ================= SEARCH =================
function triggerSearch() {
  const input = document.getElementById("searchInput");
  if (!input?.value) return;

  const keyword = input.value.toLowerCase();
  const grid = document.getElementById("resultsGrid");
  const section = document.getElementById("searchResultsSection");

  section.style.display = "block";
  grid.innerHTML = "Đang tìm...";

  get(ref(db, "stories")).then(snap => {
    grid.innerHTML = "";
    let found = false;

    snap.forEach(c => {
      const s = c.val();
      if ((s.title || "").toLowerCase().includes(keyword)) {
        grid.appendChild(createCard({ id: c.key, ...s }));
        found = true;
      }
    });

    if (!found) grid.innerHTML = "Không tìm thấy 🐢";
  });
}

function closeSearch() {
  document.getElementById("searchResultsSection").style.display = "none";
}

// ================= FILTER CONDITION =================
function loadByCondition(field, value) {
  const grid = document.getElementById("resultsGrid");
  const section = document.getElementById("searchResultsSection");

  section.style.display = "block";
  grid.innerHTML = "Đang lọc...";

  const q = query(ref(db, "stories"), orderByChild(field), equalTo(value));

  get(q).then(snap => {
    grid.innerHTML = "";
    snap.forEach(c => grid.appendChild(createCard({ id: c.key, ...c.val() })));
  });
}

// ================= CARD =================
function createCard(story) {
  const div = document.createElement("div");
  div.className = "story-card";

  div.innerHTML = `
    <img src="${story.img || ""}">
    <h4>${story.title}</h4>
    <p>${story.author || ""}</p>
  `;

  div.onclick = () => location.href = `book.html?id=${story.id}`;
  return div;
}

// ================= GENRES =================
function loadGenres() {
  const menu = document.getElementById("tagMenu");
  if (!menu) return;

  get(ref(db, "genres")).then(snap => {
    menu.innerHTML = "";

    snap.forEach(c => {
      const name = c.val().name || c.val();

      const span = document.createElement("span");
      span.textContent = name;
      span.onclick = () => loadByCondition("genre", name);

      menu.appendChild(span);
    });
  });
}

// ================= AUTH =================
onAuthStateChanged(auth, user => {
  const btn = document.getElementById("btnHeaderAuth");

  if (user) {
    btn.textContent = user.displayName || "User";
    btn.onclick = openProfile;

    renderProfile(user);
  } else {
    btn.innerHTML = "👤";
    btn.onclick = openAuthModal;

    state.bookshelfUnsub?.();
  }
});

function submitAuth() {
  const email = authEmail.value;
  const pass = authPassword.value;
  const name = authDisplayName.value;

  if (state.isSignUp) {
    createUserWithEmailAndPassword(auth, email, pass)
      .then(res => {
        if (name) fbUpdateProfile(res.user, { displayName: name });
      });
  } else {
    signInWithEmailAndPassword(auth, email, pass);
  }
}

// ================= PROFILE =================
function renderProfile(user) {
  renderAvatarGrid();

  // avatar realtime
  onValue(ref(db, `users/${user.uid}`), snap => {
    const data = snap.val();
    const img = document.getElementById("userAvatar");
    if (img && data?.avatar) img.src = data.avatar;
  });

  renderBookshelf(user);
}

// ================= AVATAR =================
function renderAvatarGrid() {
  const container = document.getElementById("avatarGridContainer");
  if (!container) return;

  const cuteAvatars = [
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Lily",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Mia",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Bear",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Cookie",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Buster",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Coco",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Milo",
        "https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver"
    ];

  container.innerHTML = avatars.map(url => `
    <img src="${url}" class="avatar-option"
      style="width:50px;height:50px;border-radius:50%;cursor:pointer;border:2px solid transparent"
      onclick="selectAvatar(this,'${url}')">
  `).join("");
}

function selectAvatar(el, url) {
  state.selectedAvatar = url;

  document.querySelectorAll(".avatar-option")
    .forEach(i => i.style.border = "2px solid transparent");

  el.style.border = "2px solid #ff4d6d";
}

function saveProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const name = document.getElementById("inputNewDisplayName").value;

  fbUpdateProfile(user, { displayName: name || user.displayName }).then(() => {
    if (state.selectedAvatar) {
      set(ref(db, `users/${user.uid}/avatar`), state.selectedAvatar);
    }
    alert("Đã lưu 🎉");
    location.reload();
  });
}

// ================= BOOKSHELF =================
function renderBookshelf(user) {
  const container = document.getElementById("userBookshelfContainer");
  if (!container) return;

  state.bookshelfUnsub?.();

  state.bookshelfUnsub = onValue(ref(db, `users/${user.uid}/tuSach`), snap => {
    container.innerHTML = "";

    if (!snap.exists()) {
      container.innerHTML = "Trống 🐢";
      return;
    }

    snap.forEach(c => {
      const b = c.val();

      const div = document.createElement("div");

      div.innerHTML = `
        <p>${b.tenTruyen}</p>
        <button>X</button>
      `;

      div.querySelector("button").onclick = () =>
        remove(ref(db, `users/${user.uid}/tuSach/${c.key}`));

      container.appendChild(div);
    });
  });
}

// ================= NOTIFICATION =================
function listenNotifications() {
  state.notiUnsub?.();

  state.notiUnsub = onValue(ref(db, "notifications"), snap => {
    document.getElementById("notiCount").textContent =
      snap.exists() ? snap.size : 0;
  });
}

// ================= UI =================
function openAuthModal() {
  document.getElementById("authModal").style.display = "flex";
}

function openProfile() {
  document.getElementById("homeMainContent").style.display = "none";
  document.getElementById("profileSection").style.display = "block";
}

function showHome() {
  document.getElementById("profileSection").style.display = "none";
  document.getElementById("homeMainContent").style.display = "block";
}

function logout() {
  signOut(auth);
}

// ================= GLOBAL =================
// EXPOSE GLOBAL
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.toggleAuthMode = toggleAuthMode;
window.submitAuthForm = submitAuthForm;
window.triggerSearch = triggerSearch;
window.closeSearch = closeSearch;
window.showHome = showHome;
window.logoutFromProfile = logoutFromProfile;
window.updateUserProfileData = updateUserProfileData;
