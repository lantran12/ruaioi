// ==========================================================================
// 1. CẤU HÌNH FIREBASE 
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBimiEGQcW9at2pOxfdUaJHjim2fmyjjcc",
    authDomain: "dongchanrua.firebaseapp.com",
    databaseURL: "https://dongchanrua-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dongchanrua",
    storageBucket: "dongchanrua.firebasestorage.app",
    messagingSenderId: "640115424540",
    appId: "1:640115424540:web:c9713b7921c09283150ed9"
};

// Khởi tạo Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();

// Chạy các hàm chức năng khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    initSubBarFilters();
    loadGenresDropdown();
    loadMainStories();
    loadTopViews();
    listenToNotifications();
});

/* ==========================================================================
   2. XỬ LÝ BỘ LỌC TẠI SUB-BAR (Mới phát hành / Đã trọn bộ)
   ========================================================================== */
function initSubBarFilters() {
    const filterButtons = document.querySelectorAll('.nav-link-btn');
    
    filterButtons.forEach(btn => {
        if (btn.id === 'tagDropdownBtn') return;

        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterType = btn.getAttribute('data-filter');
            if (filterType === 'new') {
                closeSearch();
                loadMainStories();
            } else if (filterType === 'completed') {
                loadStoriesByCondition('status', 'Hoàn thành', '🍿 Danh Sách Truyện Đã Hoàn Thành');
            }
        });
    });
}

/* ==========================================================================
   3. TRUYỆN ĐỀ CỬ NGẪU NHIÊN (Đọc trường 'img' chị tạo)
   ========================================================================== */
function handleFeaturedRandomBook(storiesData) {
    const keys = Object.keys(storiesData);
    if (keys.length === 0) return;

    // Bốc ngẫu nhiên 1 Key (ID) truyện từ Firebase
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const story = storiesData[randomKey];

    const heroTitle = document.getElementById('heroTitle');
    const heroSynopsis = document.getElementById('heroSynopsis');
    const heroLink = document.getElementById('heroLink');
    const featuredBookSection = document.getElementById('featuredBook');

    if (heroTitle) heroTitle.innerText = story.title || "Tác phẩm độc quyền";
    if (heroSynopsis) heroSynopsis.innerText = story.description || story.synopsis || "Bấm vào để khám phá thế giới nội tâm đầy cảm xúc của tác phẩm này...";

    // Tạo link dẫn tới trang chi tiết truyện của chị
    const storyReadUrl = `book.html?id=${randomKey}`;
    if (heroLink) heroLink.setAttribute('href', storyReadUrl);

    // Ưu tiên đọc trường 'img' từ Form Admin của chị, nếu không có mới tìm trường 'cover' hoặc 'image'
    const storyImg = story.img || story.cover || story.image;

    if (storyImg && featuredBookSection) {
        featuredBookSection.style.setProperty('background', `linear-gradient(to right, rgba(252,249,250,0.95) 40%, rgba(252,249,250,0.4)), url('${storyImg}')`, 'important');
        featuredBookSection.style.setProperty('background-size', 'cover', 'important');
        featuredBookSection.style.setProperty('background-position', 'center 20%', 'important');
    }

    if (featuredBookSection) {
        featuredBookSection.onclick = function(e) {
            if (e.target.tagName !== 'A' && e.target.parentElement.tagName !== 'A') {
                window.location.href = storyReadUrl;
            }
        };
    }
}

/* ==========================================================================
   4. THẢ MENU THỂ LOẠI TẠI DROP-DOWN
   ========================================================================== */
function loadGenresDropdown() {
    const tagMenu = document.getElementById('tagMenu');
    if (!tagMenu) return;

    db.ref('genres').once('value').then((snapshot) => {
        tagMenu.innerHTML = '';
        if (!snapshot.exists()) return;

        snapshot.forEach((childSnapshot) => {
            const genreName = childSnapshot.val().name || childSnapshot.val();
            const span = document.createElement('span');
            span.textContent = genreName;
            
            span.addEventListener('click', () => {
                loadStoriesByCondition('genre', genreName, `🍿 Thể Loại: ${genreName}`);
            });
            tagMenu.appendChild(span);
        });
    });
}

/* ==========================================================================
   5. BỘ LỌC ĐIỀU KIỆN (Xổ dữ liệu ra vùng Tìm kiếm chuyên sâu)
   ========================================================================== */
function loadStoriesByCondition(field, value, titleText) {
    const searchSection = document.getElementById('searchResultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    const rowTitle = searchSection.querySelector('.row-title');

    if (!searchSection || !resultsGrid) return;

    if (rowTitle) rowTitle.innerText = titleText;
    searchSection.style.display = 'block';
    resultsGrid.innerHTML = '<div style="grid-column: 1/-1; color: var(--smoke);">Đang lọc tác phẩm...</div>';

    searchSection.scrollIntoView({ behavior: 'smooth' });

    db.ref('stories').orderByChild(field).equalTo(value).once('value')
    .then((snapshot) => {
        resultsGrid.innerHTML = '';
        if (!snapshot.exists()) {
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--smoke);">Động chưa tìm thấy truyện nào tương ứng 🐢</p>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            resultsGrid.appendChild(createNetflixCard(childSnapshot.key, childSnapshot.val()));
        });
    })
    .catch((err) => {
        console.error("Lỗi lọc dữ liệu:", err);
        resultsGrid.innerHTML = '<p style="grid-column: 1/-1;">Đã xảy ra lỗi khi tìm kiếm.</p>';
    });
}

function closeSearch() {
    const searchSection = document.getElementById('searchResultsSection');
    if (searchSection) searchSection.style.display = 'none';
}

/* ==========================================================================
   6. THƯ VIỆN CHÍNH (Mới Cập Nhật Trên Hệ Thống)
   ========================================================================== */
function loadMainStories() {
    const bookGrid = document.getElementById('bookGrid');
    if (!bookGrid) return;

    bookGrid.innerHTML = '<div style="grid-column: 1/-1; color: var(--smoke);">Đang liên kết Động Chăn Rùa...</div>';

    db.ref('stories').orderByChild('updatedAt').once('value')
    .then((snapshot) => {
        bookGrid.innerHTML = '';
        if (!snapshot.exists()) return;

        const storiesData = snapshot.val();
        
        // Gọi hàm Random Banner Hero ngay tại đây
        handleFeaturedRandomBook(storiesData);

        const storiesArray = [];
        snapshot.forEach((childSnapshot) => {
            storiesArray.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        storiesArray.reverse().forEach((story) => {
            bookGrid.appendChild(createNetflixCard(story.id, story));
        });
    })
    .catch((err) => {
        console.error("Lỗi tải truyện chính:", err);
        bookGrid.innerHTML = '<p style="grid-column: 1/-1;">Lỗi kết nối thư viện chính.</p>';
    });
}

/* ==========================================================================
   7. TOP 5 ĐỘT PHÁ LƯỢT XEM (Hàng Ngang Kiểu Dáng Xịn)
   ========================================================================== */
function loadTopViews() {
    const nominationContainer = document.getElementById('nominationListContainer');
    if (!nominationContainer) return;

    db.ref('stories').orderByChild('views').limitToLast(5).once('value')
    .then((snapshot) => {
        nominationContainer.innerHTML = '';
        if (!snapshot.exists()) return;

        const topStories = [];
        snapshot.forEach((childSnapshot) => {
            topStories.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        topStories.reverse();

        topStories.forEach((story, index) => {
            const card = document.createElement('div');
            card.className = 'story-card';
            card.onclick = () => window.location.href = `book.html?id=${story.id}`;
            
            // Tự động kiểm tra trường ảnh mượt mà
            const currentImg = story.img || story.cover || story.image || 'https://via.placeholder.com/180x250';
            
            card.innerHTML = `
                <img src="${currentImg}" alt="${story.title}">
                <div style="flex: 1; min-width: 0;">
                    <h4 style="margin-top:0; font-size:0.95rem; font-weight:700;">TOP ${index + 1} . ${story.title}</h4>
                    <p style="margin-bottom:0; font-size:0.8rem; color: var(--netflix-red); font-weight:600;"><i class="fa-regular fa-eye"></i> ${story.views || 0} lượt xem</p>
                </div>
            `;
            nominationContainer.appendChild(card);
        });
    });
}

/* ==========================================================================
   8. LẮNG NGHE THÔNG BÁO REALTIME (Chuông thông báo trên Header)
   ========================================================================== */
function listenToNotifications() {
    const notiCountBadge = document.getElementById('notiCount');
    if (!notiCountBadge) return;
    
    db.ref('notifications').on('value', (snapshot) => {
        if (snapshot.exists()) {
            notiCountBadge.textContent = snapshot.numChildren();
        } else {
            notiCountBadge.textContent = "0";
        }
    });
}

/* ==========================================================================
   9. HÀM BỔ TRỢ: TẠO CARD TRUYỆN PHONG CÁCH NETFLIX (Kiểm tra trường 'img')
   ========================================================================== */
function createNetflixCard(id, story) {
    const div = document.createElement('div');
    div.className = 'story-card';
    div.onclick = () => window.location.href = `book.html?id=${id}`;
    
    // Tự động dùng 'img' chị tạo, hoặc các trường cũ dự phòng
    const currentImg = story.img || story.cover || story.image || 'https://via.placeholder.com/180x250';
    
    div.innerHTML = `
        <img src="${currentImg}" alt="${story.title}">
        <h4>${story.title}</h4>
        <p>${story.author || 'Động Chăn Rùa'}</p>
    `;
    return div;
}

// Hàm Tìm kiếm thủ công khi bấm kính lúp
function triggerSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput || !searchInput.value.trim()) return;
    
    const keyword = searchInput.value.trim().toLowerCase();
    
    const searchSection = document.getElementById('searchResultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    const rowTitle = searchSection.querySelector('.row-title');

    if (rowTitle) rowTitle.innerText = `🍿 Kết quả tìm kiếm cho: "${searchInput.value}"`;
    searchSection.style.display = 'block';
    resultsGrid.innerHTML = '';

    db.ref('stories').once('value').then((snapshot) => {
        if(!snapshot.exists()) return;
        
        let hasResult = false;
        snapshot.forEach((childSnapshot) => {
            const story = childSnapshot.val();
            const title = (story.title || '').toLowerCase();
            const author = (story.author || '').toLowerCase();
            
            if(title.includes(keyword) || author.includes(keyword)) {
                resultsGrid.appendChild(createNetflixCard(childSnapshot.key, story));
                hasResult = true;
            }
        });
        
        if(!hasResult) {
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--smoke);">Không tìm thấy tác phẩm nào khớp từ khóa 🐢</p>`;
        }
    });
}
/* ==========================================================================
   10. QUẢN LÝ ĐĂNG NHẬP VÀ KÍCH HOẠT NÚT ADMIN QUA UID BẢO MẬT
   ========================================================================== */

// Theo dõi trạng thái đăng nhập Realtime từ Firebase
auth.onAuthStateChanged((user) => {
    const loginBtn = document.querySelector('.login-btn') || document.querySelector('.nav-btn'); // Nút đăng nhập trên Header
    const adminPanel = document.getElementById('adminPanel') || document.querySelector('.admin-panel'); // Khối bảng đăng truyện của chị

    if (user) {
        // --- TRƯỜNG HỢP: ĐÃ ĐĂNG NHẬP ---
        console.log("Đăng nhập thành công với UID:", user.uid);

        // Kiểm tra chính xác chuỗi UID quyền lực của chị
        if (user.uid === 'BrZQ9s07ujfIYG1iPtC4vIhGgx33') {
            
            // 1. Biến nút Đăng nhập thành nút ADMIN bản Premium
            if (loginBtn) {
                loginBtn.innerHTML = `<i class="fa-solid fa-crown" style="color: #ffca28; margin-right: 5px;"></i> Admin`;
                loginBtn.style.background = "var(--netflix-red)"; // Màu đỏ nổi bật
                
                // 2. Click vào nút Admin sẽ đóng/mở (Toggle) bảng đăng truyện mượt mà
                loginBtn.onclick = () => {
                    if (adminPanel) {
                        if (adminPanel.style.display === 'block' || adminPanel.classList.contains('active')) {
                            adminPanel.style.display = 'none';
                            adminPanel.classList.remove('active');
                        } else {
                            adminPanel.style.display = 'block';
                            adminPanel.classList.add('active');
                            adminPanel.scrollIntoView({ behavior: 'smooth' }); // Cuộn màn hình xuống form đăng
                        }
                    } else {
                        if (typeof toggleAdminPanel === 'function') toggleAdminPanel();
                    }
                };
            }
        } else {
            // Nếu là tài khoản người đọc bình thường (Không trùng UID admin)
            if (loginBtn) {
                loginBtn.textContent = "Đăng xuất";
                loginBtn.onclick = handleSignOut;
            }
            if (adminPanel) adminPanel.style.display = 'none';
        }

    } else {
        // --- TRƯỜNG HỢP: CHƯA ĐĂNG NHẬP HOẶC VỪA ĐĂNG XUẤT ---
        if (loginBtn) {
            loginBtn.innerHTML = `<i class="fa-regular fa-user"></i> Đăng nhập`;
            loginBtn.style.background = "transparent"; // Reset giao diện nút
            loginBtn.onclick = showLoginPopup; // Gọi hộp thoại đăng nhập
        }
        if (adminPanel) {
            adminPanel.style.display = 'none';
            adminPanel.classList.remove('active');
        }
    }
});

// Hàm đăng xuất
function handleSignOut() {
    auth.signOut().then(() => {
        alert("Đã đăng xuất tài khoản Động Chăn Rùa 🐢");
    });
}

// Hàm hiển thị hộp thoại đăng nhập bảo mật
function showLoginPopup() {
    const email = prompt("Nhập Email tài khoản Admin của chị:");
    if (!email) return;
    const password = prompt("Nhập mật khẩu Admin:");
    if (!password) return;

    auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        alert("🎉 Chào mừng Quản trị viên tối cao trở lại Động!");
    })
    .catch((error) => {
        console.error("Lỗi xác thực:", error);
        alert("⚠️ Tài khoản hoặc mật khẩu không chính xác rồi chị ơi!");
    });
}
