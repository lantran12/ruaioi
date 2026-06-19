import { db, ref } from "./firebase.js";
import { get, onValue, update, remove, push, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// --- CẤU HÌNH & TRẠNG THÁI ---
const ADMIN_UID = "BrZQ9s07ujfIYG1iPtC4vIhGgx33";
const ADMIN_EMAIL = "dongbanggei@gmail.com";
let tuSachListenerRef = null;
let selectedAvatarUrl = "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix";
let globalListBooks = [];
let isSignUpMode = true;

// --- KHỞI TẠO TRANG ---
document.addEventListener("DOMContentLoaded", async () => {
    setupDropdowns();
    listenAuthState();
    globalListBooks = await fetchStoriesFromFirebase();

    renderBookGrid(globalListBooks);
    renderRandomFeatured(globalListBooks);
    listenTopViews(globalListBooks);
    
    updateFilterMenusAutomatically(globalListBooks);
    setupTagFilter(globalListBooks); // Đảm bảo bộ lọc hoạt động
});

// --- 1. QUẢN LÝ TÀI KHOẢN (AUTH) ---
function listenAuthState() {
    onAuthStateChanged(auth, (user) => {
        const btnAuth = document.getElementById('btnHeaderAuth');
        if (!btnAuth) return;

        if (user) {
            checkAndGrantAdmin(user);
            renderUserProfileData(user);
            btnAuth.innerText = "Chào, " + (user.displayName || "Thành Viên 🌸");
        } else {
            btnAuth.innerText = "Đăng Ký / Đăng Nhập";
            if (tuSachListenerRef) { tuSachListenerRef(); tuSachListenerRef = null; }
            const container = document.getElementById('userBookshelfContainer');
            if (container) container.innerHTML = `<div class="bookshelf-empty">🔒 Vui lòng đăng nhập để xem tủ sách!</div>`;
        }
    });
}

// --- 2. CÁC HÀM ADMIN ---
function checkAndGrantAdmin(user) {
    const adminBtn = document.getElementById('btnOpenAdminPanel');
    if (user && (user.uid === ADMIN_UID || user.email === ADMIN_EMAIL)) {
        if (adminBtn) {
            adminBtn.style.display = 'inline-block';
            adminBtn.onclick = () => {
                const p = document.getElementById('adminPanel');
                if (p) p.style.display = (p.style.display === 'none') ? 'block' : 'none';
            };
        }
    }
}

window.submitNewStory = function() {
    const id = document.getElementById('adminId').value.trim();
    const title = document.getElementById('adminTitle').value.trim();
    const author = document.getElementById('adminAuthor').value.trim();
    const img = document.getElementById('adminImg').value.trim();
    const tags = document.getElementById('adminTags').value.trim().split(',').map(t => t.trim());
    
    if (!id || !title || !author) return alert("Điền thiếu thông tin rồi Chị ơi!");
    
    set(ref(db, 'stories/' + id), { title, author, img, tags, status: "updating", updatedAt: Date.now() })
        .then(() => { alert("Đăng truyện mới thành công! 🐢"); document.getElementById('adminPanel').style.display = 'none'; })
        .catch(err => alert("Lỗi: " + err.message));
};

// --- 3. DỮ LIỆU & RENDER ---
async function fetchStoriesFromFirebase() {
    try {
        const snapshot = await get(ref(db, "stories"));
        if (!snapshot.exists()) return [];
        const data = snapshot.val();
        const list = Object.keys(data).map(id => ({ id, ...data[id] }));
        return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } catch (e) { console.error(e); return []; }
}

function renderBookGrid(books) {
    const grid = document.getElementById("bookGrid");
    if (!grid) return;
    grid.innerHTML = books.length ? books.map(b => `
        <div class="book-card">
            <div class="book-cover"><img src="${b.img}" alt="${b.title}"></div>
            <div class="book-info"><h3 class="book-title"><a href="book.html?id=${b.id}">${b.title}</a></h3></div>
        </div>`).join('') : `<p>Không tìm thấy truyện nào... 🌸</p>`;
}

// --- 4. CÁC HÀM TÌM KIẾM & BỘ LỌC ---
function setupTagFilter(books) {
    window.filterByAuthor = (name) => {
        renderBookGrid(books.filter(b => b.author === name));
        document.getElementById('authorDropdownBtn').innerHTML = `${name} <i class="fa-solid fa-caret-down"></i>`;
        document.getElementById('authorMenu').style.display = 'none';
    };
    window.filterByTag = (tag) => {
        renderBookGrid(books.filter(b => b.tags?.includes(tag)));
        document.getElementById('tagDropdownBtn').innerHTML = `${tag} <i class="fa-solid fa-caret-down"></i>`;
        document.getElementById('tagMenu').style.display = 'none';
    };
}

function updateFilterMenusAutomatically(books) {
    const authors = [...new Set(books.map(b => b.author).filter(a => a))];
    const authorMenu = document.getElementById('authorMenu');
    if (authorMenu) authorMenu.innerHTML = authors.map(a => `<span class="author-item" onclick="filterByAuthor('${a}')">${a}</span>`).join('');
    
    const tags = [...new Set(books.flatMap(b => b.tags || []))];
    const tagMenu = document.getElementById('tagMenu');
    if (tagMenu) tagMenu.innerHTML = tags.map(t => `<span class="tag-item" onclick="filterByTag('${t}')">${t}</span>`).join('');
}

// --- HÀM UI HỖ TRỢ (Dropdowns, Modals) ---
function setupDropdowns() {
    document.addEventListener("click", () => {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
    });
}
