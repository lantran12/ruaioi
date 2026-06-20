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
                loadStoriesByCondition('status', 'Hoàn thành', '📜 Danh Sách Truyện Đã Hoàn Thành');
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
                loadStoriesByCondition('genre', genreName, `📜 Thể Loại: ${genreName}`);
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

    if (rowTitle) rowTitle.innerText = `🔍 Kết quả tìm kiếm cho: "${searchInput.value}"`;
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
   10. QUẢN LÝ ĐĂNG NHẬP, ĐIỀU KHIỂN VƯƠNG MIỆN ADMIN VÀ HỒ SƠ / AVATAR
   ========================================================================== */
let isSignUpMode = true; 
let selectedAvatarUrl = "";
let tuSachListenerRef = null; // Quản lý lắng nghe tủ sách realtime

// --- A. THEO DÕI TRẠNG THÁI TÀI KHOẢN REALTIME ---
auth.onAuthStateChanged((user) => {
    const btnHeaderAuth = document.getElementById('btnHeaderAuth'); // Nút Account gốc

    // Tự động tạo nút Vương Miện màu xanh Admin nằm CẠNH NHAU (ngang hàng)
    let btnAdminCrown = document.getElementById('btnOpenAdminPanel');
    if (!btnAdminCrown && btnHeaderAuth) {
        btnAdminCrown = document.createElement('button');
        btnAdminCrown.id = 'btnOpenAdminPanel';
        btnAdminCrown.innerHTML = '👑';
        
        // CSS ép nút vương miện có nền màu xanh admin, nằm ngang với nút chào
        btnAdminCrown.style.cssText = "background: #2e8b57; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 16px; cursor: pointer; display: none; align-items: center; justify-content: center; flex-shrink: 0;";
        
        if (btnHeaderAuth.parentNode) {
            btnHeaderAuth.parentNode.style.display = "flex";
            btnHeaderAuth.parentNode.style.alignItems = "center";
            btnHeaderAuth.parentNode.style.gap = "8px"; // Khoảng cách giữa nút chào và vương miện
            btnHeaderAuth.parentNode.insertBefore(btnAdminCrown, btnHeaderAuth.nextSibling);
        }
    }

    if (user) {
        // TRƯỜNG HỢP: ĐÃ ĐĂNG NHẬP
        console.log("Đăng nhập thành công với UID:", user.uid);
        
        // Gắn dữ liệu Email và Tên vào form profile ẩn phía dưới
        if (document.getElementById('userProfileEmail')) document.getElementById('userProfileEmail').textContent = user.email;
        if (document.getElementById('userProfileName')) document.getElementById('userProfileName').textContent = user.displayName || "Thành viên Động Rùa";

        // KÍCH HOẠT CHẠY HÀM TẢI TỦ SÁCH THẬT TỪ DATABASE CỦA CHỊ
        renderUserProfileData(user);

        // PHÂN QUYỀN ADMIN CHO CHỊ ĐỘNG CHĂN RÙA (UID CHUẨN)
        if (user.uid === 'BrZQ9s07ujfIYG1iPtC4vIhGgx33') {
            if (btnHeaderAuth) {
                btnHeaderAuth.innerHTML = `<i class="fa-regular fa-user"></i> Chào, Admin`;
                btnHeaderAuth.style.cssText = "width: auto; padding: 0 12px; border-radius: 20px; font-size: 13px; flex-shrink: 0; background: #ff4d6d; color: white; border: none; height: 36px; cursor: pointer;";
                btnHeaderAuth.onclick = openProfileZone;
            }
            if (btnAdminCrown) {
                btnAdminCrown.style.display = 'inline-flex'; // Hiện vương miện xanh kế bên
                btnAdminCrown.onclick = () => {
                    const adminModal = document.getElementById('adminModal');
                    if (adminModal) adminModal.style.display = 'flex'; // Hiện popup đăng chương
                };
            }
        } else {
            // Nếu là người đọc bình thường
            if (btnHeaderAuth) {
                btnHeaderAuth.innerHTML = `<i class="fa-regular fa-user"></i> Chào, ${user.displayName || 'Thành Viên'}`;
                btnHeaderAuth.style.cssText = "width: auto; padding: 0 12px; border-radius: 20px; font-size: 13px; flex-shrink: 0; background: #ff4d6d; color: white; border: none; height: 36px; cursor: pointer;";
                btnHeaderAuth.onclick = openProfileZone;
            }
            if (btnAdminCrown) btnAdminCrown.style.display = 'none';
        }
    } else {
        // TRƯỜNG HỢP: CHƯA ĐĂNG NHẬP / ĐĂNG XUẤT
        if (btnHeaderAuth) {
            btnHeaderAuth.innerHTML = `<i class="fa-regular fa-user"></i>`;
            btnHeaderAuth.style.cssText = "width: 40px; height: 40px; padding: 0; border-radius: 50%; background: #ff4d6d; color: white; border: none; cursor: pointer;";
            btnHeaderAuth.onclick = openAuthModal;
        }
        if (btnAdminCrown) btnAdminCrown.style.display = 'none';

        // Khóa tủ sách nếu là khách vãng lai chưa đăng nhập
        const container = document.getElementById('userBookshelfContainer');
        if (container) {
            container.innerHTML = `<div class="bookshelf-empty" style="color: #ff4d6d; font-weight: bold; text-align: center; width: 100%; padding: 20px 0;">⚠️ Vui lòng đăng nhập để sử dụng tủ sách cá nhân!</div>`;
        }
        showHome();
    }
});

function openProfileZone() {
    if (document.getElementById('homeMainContent')) document.getElementById('homeMainContent').style.display = 'none';
    if (document.getElementById('profileSection')) document.getElementById('profileSection').style.display = 'block';
}

// --- B. CÁC HÀM XỬ LÝ HỒ SƠ & AVATAR (THU NHỎ ẢNH & LOAD TỦ SÁCH) ---
function renderUserProfileData(user) {
    renderAvatarSelectionGrid(); 
    
    // Thu nhỏ Avatar hiển thị cho vừa vặn, không bị chiếm hết màn hình
    const currentAvatarImg = document.getElementById('userCurrentAvatar');
    if (currentAvatarImg) {
        currentAvatarImg.style.cssText = "width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 15px auto; border: 3px solid #ff4d6d;";
    }

    // Kết nối database lấy tủ sách thật (Hỗ trợ cả Realtime Database v8/v9 tùy cấu hình của chị)
    const container = document.getElementById('userBookshelfContainer');
    if (!container) return;

    // Chỗ này kiểm tra nếu chị đang xài Firebase database cũ
    if (typeof db !== 'undefined' && typeof firebase !== 'undefined') {
        firebase.database().ref('users/' + user.uid + '/tuSach').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) { container.innerHTML = `<div class="bookshelf-empty">Tủ sách trống trơn! 🐾</div>`; return; }
            buildBookshelfHTML(data, container);
        });
    }
}

function buildBookshelfHTML(data, container) {
    container.innerHTML = Object.keys(data).map(key => {
        const b = data[key];
        return `<div class="bookshelf-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee;">
            <div class="bookshelf-left" style="display: flex; align-items: center; gap: 10px;">
                <img src="${b.image}" class="bookshelf-thumb" style="width: 45px; height: 60px; object-fit: cover; border-radius: 4px;" alt="Cover">
                <div>
                    <p style="margin: 0; font-weight: bold; font-size: 14px;">${b.tenTruyen}</p>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #777;">Đọc đến: ${b.chuongGanNhat}</p>
                </div>
            </div>
            <button class="btn-remove-book" onclick="removeFromBookshelf('${key}')" style="background: none; border: none; cursor: pointer; font-size: 14px;">❌</button>
        </div>`;
    }).join('');
}

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
        <img src="${url}" class="avatar-option-img" style="width: 50px; height: 50px; cursor: pointer; margin: 5px; border-radius: 50%; border: 2px solid transparent;" onclick="selectAvatarOption(this, '${url}')" alt="Cute Avatar">
    `).join('');
}

function selectAvatarOption(imgEl, url) { 
    selectedAvatarUrl = url; 
    document.querySelectorAll('.avatar-option-img').forEach(img => img.style.border = '2px solid transparent'); 
    imgEl.style.border = '2px solid #ff4d6d'; 
}

function removeFromBookshelf(key) {
    if (confirm("Chị có muốn xóa truyện này không ạ? 🐢")) {
        firebase.database().ref('users/' + auth.currentUser.uid + '/tuSach/' + key).remove();
    }
}

// --- C. ĐIỀU KHIỂN POPUP ĐĂNG NHẬP VÀ FORM SUBMIT ---
function openAuthModal() { const modal = document.getElementById('authModal'); if (modal) modal.style.display = 'flex'; }
function closeAuthModal() { const modal = document.getElementById('authModal'); if (modal) modal.style.display = 'none'; }
function closeAuthModalOverlay(event) { if (event.target.id === 'authModal') closeAuthModal(); }

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const authTitle = document.getElementById('authTitle');
    const nickNameGroup = document.getElementById('nickNameGroup');
    const btnAuthSubmit = document.getElementById('btnAuthSubmit');
    const authToggleLink = document.getElementById('authToggleLink');
    if (isSignUpMode) {
        authTitle.textContent = "GIA NHẬP RÙA STREAM"; nickNameGroup.style.display = 'block';
        btnAuthSubmit.textContent = "BẮT ĐẦU TRẢI NGHIỆM"; authToggleLink.textContent = "Đã có tài khoản rồi? Bấm vào đây để Đăng nhập";
    } else {
        authTitle.textContent = "ĐĂNG NHẬP THÀNH VIÊN"; nickNameGroup.style.display = 'none';
        btnAuthSubmit.textContent = "ĐĂNG NHẬP VÀO ĐỘNG NGAY"; authToggleLink.textContent = "Chưa có tài khoản? Bấm vào đây để Đăng ký";
    }
}

function submitAuthForm() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const displayName = document.getElementById('authDisplayName').value.trim();
    if (!email || !password) { alert("Chị vui lòng điền đủ thông tin nha!"); return; }

    if (isSignUpMode) {
        auth.createUserWithEmailAndPassword(email, password).then((userCredential) => {
            if (displayName) userCredential.user.updateProfile({ displayName: displayName });
            alert("🎉 Đăng ký thành công!"); closeAuthModal();
        }).catch(err => alert(err.message));
    } else {
        auth.signInWithEmailAndPassword(email, password).then(() => {
            alert("🎉 Chào mừng chị trở lại!"); closeAuthModal();
        }).catch(err => alert(err.message));
    }
}
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
                loadStoriesByCondition('status', 'Hoàn thành', '📜 Danh Sách Truyện Đã Hoàn Thành');
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
                loadStoriesByCondition('genre', genreName, `📜 Thể Loại: ${genreName}`);
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

    if (rowTitle) rowTitle.innerText = `🔍 Kết quả tìm kiếm cho: "${searchInput.value}"`;
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
   10. QUẢN LÝ ĐĂNG NHẬP, ĐIỀU KHIỂN VƯƠNG MIỆN ADMIN VÀ HỒ SƠ / AVATAR
   ========================================================================== */
let isSignUpMode = true; 
let selectedAvatarUrl = "";
let tuSachListenerRef = null; // Quản lý lắng nghe tủ sách realtime

// --- A. THEO DÕI TRẠNG THÁI TÀI KHOẢN REALTIME ---
auth.onAuthStateChanged((user) => {
    const btnHeaderAuth = document.getElementById('btnHeaderAuth'); // Nút Account gốc

    // Tự động tạo nút Vương Miện màu xanh Admin nằm CẠNH NHAU (ngang hàng)
    let btnAdminCrown = document.getElementById('btnOpenAdminPanel');
    if (!btnAdminCrown && btnHeaderAuth) {
        btnAdminCrown = document.createElement('button');
        btnAdminCrown.id = 'btnOpenAdminPanel';
        btnAdminCrown.innerHTML = '👑';
        
        // CSS ép nút vương miện có nền màu xanh admin, nằm ngang với nút chào
        btnAdminCrown.style.cssText = "background: #2e8b57; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 16px; cursor: pointer; display: none; align-items: center; justify-content: center; flex-shrink: 0;";
        
        if (btnHeaderAuth.parentNode) {
            btnHeaderAuth.parentNode.style.display = "flex";
            btnHeaderAuth.parentNode.style.alignItems = "center";
            btnHeaderAuth.parentNode.style.gap = "8px"; // Khoảng cách giữa nút chào và vương miện
            btnHeaderAuth.parentNode.insertBefore(btnAdminCrown, btnHeaderAuth.nextSibling);
        }
    }

    if (user) {
        // TRƯỜNG HỢP: ĐÃ ĐĂNG NHẬP
        console.log("Đăng nhập thành công với UID:", user.uid);
        
        // Gắn dữ liệu Email và Tên vào form profile ẩn phía dưới
        if (document.getElementById('userProfileEmail')) document.getElementById('userProfileEmail').textContent = user.email;
        if (document.getElementById('userProfileName')) document.getElementById('userProfileName').textContent = user.displayName || "Thành viên Động Rùa";

        // KÍCH HOẠT CHẠY HÀM TẢI TỦ SÁCH THẬT TỪ DATABASE CỦA CHỊ
        renderUserProfileData(user);

        // PHÂN QUYỀN ADMIN CHO CHỊ ĐỘNG CHĂN RÙA (UID CHUẨN)
        if (user.uid === 'BrZQ9s07ujfIYG1iPtC4vIhGgx33') {
            if (btnHeaderAuth) {
                // Đã đổi thành hiển thị tên biệt danh của chị
                btnHeaderAuth.innerHTML = `<i class="fa-regular fa-user" style="margin-right: 4px;"></i> Chào, ${user.displayName || 'Admin'}`;
                btnHeaderAuth.style.cssText = "width: auto; padding: 0 12px; border-radius: 20px; font-size: 13px; flex-shrink: 0; background: #ff4d6d; color: white; border: none; height: 36px; cursor: pointer;";
                btnHeader

function openProfileZone() {
    if (document.getElementById('homeMainContent')) document.getElementById('homeMainContent').style.display = 'none';
    if (document.getElementById('profileSection')) document.getElementById('profileSection').style.display = 'block';
}

// --- B. CÁC HÀM XỬ LÝ HỒ SƠ & AVATAR (THU NHỎ ẢNH & LOAD TỦ SÁCH) ---
function renderUserProfileData(user) {
    renderAvatarSelectionGrid(); 
    
    // Thu nhỏ Avatar hiển thị cho vừa vặn, không bị chiếm hết màn hình
    const currentAvatarImg = document.getElementById('userCurrentAvatar');
    if (currentAvatarImg) {
        currentAvatarImg.style.cssText = "width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 15px auto; border: 3px solid #ff4d6d;";
    }

    // Kết nối database lấy tủ sách thật (Hỗ trợ cả Realtime Database v8/v9 tùy cấu hình của chị)
    const container = document.getElementById('userBookshelfContainer');
    if (!container) return;

    // Chỗ này kiểm tra nếu chị đang xài Firebase database cũ
    if (typeof db !== 'undefined' && typeof firebase !== 'undefined') {
        firebase.database().ref('users/' + user.uid + '/tuSach').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) { container.innerHTML = `<div class="bookshelf-empty">Tủ sách trống trơn! 🐾</div>`; return; }
            buildBookshelfHTML(data, container);
        });
    }
}

function buildBookshelfHTML(data, container) {
    container.innerHTML = Object.keys(data).map(key => {
        const b = data[key];
        return `<div class="bookshelf-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee;">
            <div class="bookshelf-left" style="display: flex; align-items: center; gap: 10px;">
                <img src="${b.image}" class="bookshelf-thumb" style="width: 45px; height: 60px; object-fit: cover; border-radius: 4px;" alt="Cover">
                <div>
                    <p style="margin: 0; font-weight: bold; font-size: 14px;">${b.tenTruyen}</p>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #777;">Đọc đến: ${b.chuongGanNhat}</p>
                </div>
            </div>
            <button class="btn-remove-book" onclick="removeFromBookshelf('${key}')" style="background: none; border: none; cursor: pointer; font-size: 14px;">❌</button>
        </div>`;
    }).join('');
}

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
        <img src="${url}" class="avatar-option-img" style="width: 50px; height: 50px; cursor: pointer; margin: 5px; border-radius: 50%; border: 2px solid transparent;" onclick="selectAvatarOption(this, '${url}')" alt="Cute Avatar">
    `).join('');
}

function selectAvatarOption(imgEl, url) { 
    selectedAvatarUrl = url; 
    document.querySelectorAll('.avatar-option-img').forEach(img => img.style.border = '2px solid transparent'); 
    imgEl.style.border = '2px solid #ff4d6d'; 
}

function removeFromBookshelf(key) {
    if (confirm("Chị có muốn xóa truyện này không ạ? 🐢")) {
        firebase.database().ref('users/' + auth.currentUser.uid + '/tuSach/' + key).remove();
    }
}

// --- C. ĐIỀU KHIỂN POPUP ĐĂNG NHẬP VÀ FORM SUBMIT ---
function openAuthModal() { const modal = document.getElementById('authModal'); if (modal) modal.style.display = 'flex'; }
function closeAuthModal() { const modal = document.getElementById('authModal'); if (modal) modal.style.display = 'none'; }
function closeAuthModalOverlay(event) { if (event.target.id === 'authModal') closeAuthModal(); }

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const authTitle = document.getElementById('authTitle');
    const nickNameGroup = document.getElementById('nickNameGroup');
    const btnAuthSubmit = document.getElementById('btnAuthSubmit');
    const authToggleLink = document.getElementById('authToggleLink');
    if (isSignUpMode) {
        authTitle.textContent = "GIA NHẬP RÙA STREAM"; nickNameGroup.style.display = 'block';
        btnAuthSubmit.textContent = "BẮT ĐẦU TRẢI NGHIỆM"; authToggleLink.textContent = "Đã có tài khoản rồi? Bấm vào đây để Đăng nhập";
    } else {
        authTitle.textContent = "ĐĂNG NHẬP THÀNH VIÊN"; nickNameGroup.style.display = 'none';
        btnAuthSubmit.textContent = "ĐĂNG NHẬP VÀO ĐỘNG NGAY"; authToggleLink.textContent = "Chưa có tài khoản? Bấm vào đây để Đăng ký";
    }
}

function submitAuthForm() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const displayName = document.getElementById('authDisplayName').value.trim();
    if (!email || !password) { alert("Chị vui lòng điền đủ thông tin nha!"); return; }

    if (isSignUpMode) {
        auth.createUserWithEmailAndPassword(email, password).then((userCredential) => {
            if (displayName) userCredential.user.updateProfile({ displayName: displayName });
            alert("🎉 Đăng ký thành công!"); closeAuthModal();
        }).catch(err => alert(err.message));
    } else {
        auth.signInWithEmailAndPassword(email, password).then(() => {
            alert("🎉 Chào mừng chị trở lại!"); closeAuthModal();
        }).catch(err => alert(err.message));
    }
}

function showHome() {
    if(document.getElementById('profileSection')) document.getElementById('profileSection').style.display = 'none';
    if(document.getElementById('homeMainContent')) document.getElementById('homeMainContent').style.display = 'block';
}

function logoutFromProfile() {
    if(confirm("Chị muốn đăng xuất tài khoản đúng không ạ? 🐢")) {
        auth.signOut();
    }
}
function showHome() {
    if(document.getElementById('profileSection')) document.getElementById('profileSection').style.display = 'none';
    if(document.getElementById('homeMainContent')) document.getElementById('homeMainContent').style.display = 'block';
}

function logoutFromProfile() {
    if(confirm("Chị muốn đăng xuất tài khoản đúng không ạ? 🐢")) {
        auth.signOut();
    }
}
