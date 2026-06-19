import { db, ref } from "./firebase.js";
import { get, onValue, update, remove, push, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const ADMIN_UID = "BrZQ9s07ujfIYG1iPtC4vIhGgx33"; 
const ADMIN_EMAIL = "dongbanggei@gmail.com"; 

let tuSachListenerRef = null; 
let selectedAvatarUrl = "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix"; 
let globalListBooks = []; 
let isSignUpMode = true; 

// --- GẮN HÀM VÀO WINDOW ĐỂ HTML GỌI ĐƯỢC ---
window.toggleAdminPanel = toggleAdminPanel;
window.submitNewChapter = submitNewChapter;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.closeAuthModalOverlay = closeAuthModalOverlay;
window.toggleAuthMode = toggleAuthMode;
window.submitAuthForm = submitAuthForm;
window.handleForgotPassword = handleForgotPassword;
window.selectAvatarOption = selectAvatarOption;
window.updateUserProfileData = updateUserProfileData;
window.removeFromBookshelf = removeFromBookshelf;
window.logoutFromProfile = logoutFromProfile;
window.showHome = showHome;
window.triggerSearch = triggerSearch;
window.closeSearch = closeSearch;
window.closeAdminModal = closeAdminModal;
window.closeAdminModalOverlay = closeAdminModalOverlay;
window.filterByAuthor = filterByAuthor;
window.filterByTag = filterByTag;

// --- KHỞI TẠO ỨNG DỤNG ---
document.addEventListener("DOMContentLoaded", async () => {
    setupDropdowns();
    listenAuthState();
    globalListBooks = await fetchStoriesFromFirebase();
    renderBookGrid(globalListBooks);
    renderRandomFeatured(globalListBooks);
    listenTopViews(globalListBooks); 
    updateFilterMenusAutomatically(globalListBooks);
    setupTagFilter(globalListBooks);
});

// --- THEO DÕI TRẠNG THÁI ĐĂNG NHẬP ---
function listenAuthState() {
    onAuthStateChanged(auth, (user) => {
        const btnAuth = document.getElementById('btnHeaderAuth');
        const adminBtn = document.getElementById('btnOpenAdminPanel'); // Nút "👑 Admin" trên hình của bạn
        const adminPanel = document.getElementById('adminPanel'); // Bảng đăng bài ẩn/hiện

        if (!btnAuth) return;

        if (user) {
            btnAuth.innerText = "Chào, " + (user.displayName || "Thành Viên 🌸");
            renderUserProfileData(user);
            
            // --- LOGIC KIỂM TRA QUYỀN ADMIN ---
            if (user.uid === ADMIN_UID || user.email === ADMIN_EMAIL) {
                if (adminBtn) adminBtn.style.display = 'inline-block'; // Hiện nút "👑 Admin" như trên ảnh
                if (adminPanel) adminPanel.style.display = 'none';    // Nhưng bảng đăng bài vẫn phải MẶC ĐỊNH ẨN
            } else {
                if (adminBtn) adminBtn.style.display = 'none';
                if (adminPanel) adminPanel.style.display = 'none';
            }
        } else {
            btnAuth.innerText = "Đăng Ký / Đăng Nhập";
            if (adminBtn) adminBtn.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'none'; // Đăng xuất thì ẩn sạch luôn
            
            if (tuSachListenerRef) { 
                tuSachListenerRef(); 
                tuSachListenerRef = null; 
            }
            const container = document.getElementById('userBookshelfContainer');
            if (container) {
                container.innerHTML = `<div class="bookshelf-empty">🔒 Vui lòng đăng nhập để xem tủ sách cá nhân nha Chị!</div>`;
            }
        }
    });
}

// --- HÀM BẤM NÚT ĐỂ XỔ / ẨN BẢNG ĐĂNG TRUYỆN ---
function toggleAdminPanel() {
    const p = document.getElementById('adminPanel');
    if (!p) return;

    // Lấy trạng thái display hiện tại (kể cả từ file CSS bên ngoài)
    const currentDisplay = window.getComputedStyle(p).display;

    if (currentDisplay === 'none') {
        p.style.display = 'block'; // Xổ bảng ra
        // Mẹo nhỏ: Bạn có thể cuộn màn hình xuống bảng đăng bài cho mượt
        p.scrollIntoView({ behavior: 'smooth' }); 
    } else {
        p.style.display = 'none';  // Thu bảng lại
    }
}
// --- QUẢN LÝ PANEL ADMIN ---
function toggleAdminPanel() {
    const p = document.getElementById('adminPanel');
    if (p) p.style.display = window.getComputedStyle(p).display === 'none' ? 'block' : 'none';
}

function submitNewChapter() {
    const user = auth.currentUser;
    
    // Kiểm tra quyền trước khi push dữ liệu
    if (!user || (user.uid !== ADMIN_UID && user.email !== ADMIN_EMAIL)) {
        alert("Chị không có quyền đăng bài đâu nha! 🚫");
        return;
    }

    const story = document.getElementById('adminStorySelect').value;
    const title = document.getElementById('adminChapterTitle').value.trim();
    const content = document.getElementById('adminChapterContent').value.trim();
    
    if (!title || !content) { 
        alert("Chị ơi điền nốt tên chương với nội dung nha!"); 
        return; 
    }
    
    push(ref(db, `stories/${story}/chapters`), {
        title: title,
        content: content,
        timestamp: Date.now()
    }).then(() => {
        alert("Đã phát hành chương mới thành công rực rỡ! 🚀");
        // Nếu có dùng modal admin, có thể gọi closeAdminModal() ở đây
        document.getElementById('adminChapterTitle').value = "";
        document.getElementById('adminChapterContent').value = "";
    }).catch(err => alert("Lỗi đăng chương: " + err.message));
}

// --- LẤY DỮ LIỆU TRUYỆN ---
async function fetchStoriesFromFirebase() {
    try {
        const snapshot = await get(ref(db, "stories"));
        if (!snapshot.exists()) return [];
        const data = snapshot.val();
        return Object.keys(data).map(id => ({ id, ...data[id] }));
    } catch (error) {
        console.error("Lỗi lấy dữ liệu truyện:", error);
        return [];
    }
}

// --- THEO DÕI TOP LƯỢT XEM ---
function listenTopViews(listBooks) {
    const container = document.getElementById('nominationListContainer');
    if (!container) return;

    onValue(ref(db, 'views'), (snapshot) => {
        const data = snapshot.val() || {};
        const arr = Object.keys(data)
            .map(id => ({ id, views: data[id] }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 5);

        container.innerHTML = arr.map((item, index) => {
            const match = listBooks.find(t => t.id === item.id);
            const medal = ["🥇", "🥈", "🥉"][index] || "";
            return `
                <a href="book.html?id=${item.id}" class="nomination-item">
                    <div class="nomination-medal">${medal}</div>
                    <div class="nomination-thumb"><img src="${match?.img || ''}" alt="Cover"></div>
                    <div class="nomination-detail">
                        <p>${match?.title || item.id}</p>
                        <p>👁️ ${item.views.toLocaleString()} lượt xem</p>
                    </div>
                </a>
            `;
        }).join('');
    });
}

// --- HỒ SƠ THÀNH VIÊN & TỦ SÁCH ---
function renderUserProfileData(user) {
    renderAvatarSelectionGrid(); // Khởi tạo danh sách avatar lựa chọn
    
    const tuSachRef = ref(db, 'users/' + user.uid + '/tuSach');
    if (tuSachListenerRef) tuSachListenerRef(); // Xóa listener cũ tránh trùng lặp

    tuSachListenerRef = onValue(tuSachRef, (snapshot) => {
        const container = document.getElementById('userBookshelfContainer');
        if (!container) return;

        const data = snapshot.val();
        if (!data) { 
            container.innerHTML = `<div class="bookshelf-empty">Tủ sách trống trơn! 🐾</div>`; 
            return; 
        }

        container.innerHTML = Object.keys(data).map(key => {
            const b = data[key];
            return `
                <div class="bookshelf-item">
                    <div class="bookshelf-left">
                        <img src="${b.image}" class="bookshelf-thumb" alt="Cover">
                        <div>
                            <p>${b.tenTruyen}</p>
                            <p>Đọc đến: ${b.chuongGanNhat}</p>
                        </div>
                    </div>
                    <button class="btn-remove-book" onclick="removeFromBookshelf('${key}')">❌</button>
                </div>
            `;
        }).join('');
    });
}

function removeFromBookshelf(key) {
    if (confirm("Chị có muốn xóa truyện này không ạ?")) {
        const user = auth.currentUser;
        if (user) {
            remove(ref(db, 'users/' + user.uid + '/tuSach/' + key))
                .catch(err => alert("Lỗi khi xóa truyện: " + err.message));
        }
    }
}

// --- QUẢN LÝ CHỌN AVATAR ---
function renderAvatarSelectionGrid() {
    const container = document.getElementById('avatarGridContainer');
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

    container.innerHTML = cuteAvatars.map(url => `
        <img src="${url}" class="avatar-option-img" onclick="selectAvatarOption(this, '${url}')" alt="Cute Avatar">
    `).join('');
}

function selectAvatarOption(imgEl, url) { 
    selectedAvatarUrl = url; 
    document.querySelectorAll('.avatar-option-img').forEach(img => img.classList.remove('selected')); 
    if (imgEl) imgEl.classList.add('selected'); 
}
