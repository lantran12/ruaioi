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
   3. TRUYỆN ĐỀ CỬ NGẪU NHIÊN (Đã giới hạn ký tự)
   ========================================================================== */
function handleFeaturedRandomBook(storiesData) {
    const keys = Object.keys(storiesData);
    if (keys.length === 0) return;

    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const story = storiesData[randomKey];

    const heroTitle = document.getElementById('heroTitle');
    const heroSynopsis = document.getElementById('heroSynopsis');
    const featuredBookSection = document.getElementById('featuredBook');

    if (heroTitle) heroTitle.innerText = story.title || "Tác phẩm độc quyền";
    
    // Giới hạn ký tự: 100 ký tự đổ lại
    let rawSynopsis = story.description || story.synopsis || "Bấm vào để khám phá thế giới nội tâm đầy cảm xúc của tác phẩm này...";
    if (rawSynopsis.length > 100) {
        rawSynopsis = rawSynopsis.substring(0, 100) + "...";
    }
    if (heroSynopsis) heroSynopsis.innerText = rawSynopsis;

    const storyReadUrl = `book.html?id=${randomKey}`;
    const storyImg = story.img || story.cover || story.image;

    if (storyImg && featuredBookSection) {
        // Ảnh rõ nét hơn với độ mờ 0.2
        featuredBookSection.style.setProperty('background', `linear-gradient(to right, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.2) 100%), url('${storyImg}')`, 'important');
        featuredBookSection.style.setProperty('background-size', 'cover', 'important');
        featuredBookSection.style.setProperty('background-position', 'center', 'important');
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
                loadStoriesByCondition('genres', genreName, `📜 Thể Loại: ${genreName}`);
            });
            tagMenu.appendChild(span);
        });
    });
}

/* ==========================================================================
   5. BỘ LỌC ĐA THỂ LOẠI (Lọc truyện chứa TẤT CẢ các tag được chọn)
   ========================================================================== */
function loadStoriesByCondition(field, selectedTags, titleText) {
    // selectedTags lúc này là một MẢNG, ví dụ: ["Vô Hạn Lưu", "Hài hước"]
    const searchSection = document.getElementById('searchResultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    const rowTitle = searchSection.querySelector('.row-title');

    if (!searchSection || !resultsGrid) return;

    if (rowTitle) rowTitle.innerText = titleText;
    searchSection.style.display = 'block';
    resultsGrid.innerHTML = '<div style="grid-column: 1/-1; color: var(--smoke);">Đang lọc tác phẩm...</div>';
    searchSection.scrollIntoView({ behavior: 'smooth' });

    // Dùng db.ref V8 để lấy dữ liệu
    db.ref('stories').once('value').then((snapshot) => {
        resultsGrid.innerHTML = '';
        if (!snapshot.exists()) {
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--smoke);">Chưa có truyện nào cả 🐢</p>`;
            return;
        }

        let found = false;
        snapshot.forEach((childSnapshot) => {
            const story = childSnapshot.val();
            const id = childSnapshot.key;
            let match = true; // Mặc định giả định là khớp

            if (field === 'genres' && story.genres) {
                // Chuyển thể loại của truyện thành mảng chữ thường để so sánh
                const storyGenres = Object.values(story.genres).map(g => String(g).trim().toLowerCase());
                
                // Kiểm tra: Phải chứa ĐỦ các tag trong danh sách selectedTags
                selectedTags.forEach(tag => {
                    if (!storyGenres.includes(String(tag).trim().toLowerCase())) {
                        match = false; // Nếu thiếu 1 tag là loại ngay
                    }
                });
            } else if (field !== 'genres') {
                if (story[field] !== selectedTags[0]) match = false;
            }

            if (match) {
                resultsGrid.appendChild(createNetflixCard(id, story));
                found = true;
            }
        });

        if (!found) {
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--smoke);">Không tìm thấy truyện nào có đủ các tag này 🐢</p>`;
        }
    });
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
   7. TOP 5 ĐỘT PHÁ LƯỢT XEM (Đã sửa để lấy đúng nhánh 'views')
   ========================================================================== */
function loadTopViews() {
    const nominationContainer = document.getElementById('nominationListContainer');
    if (!nominationContainer) return;

    // 1. Lấy dữ liệu truyện (stories)
    db.ref('stories').once('value').then((snapshot) => {
        const allStories = snapshot.val();
        if (!allStories) return;

        // 2. Lấy dữ liệu lượt xem (views)
        db.ref('views').once('value').then((viewsSnapshot) => {
            const viewsData = viewsSnapshot.val();
            
            // 3. Kết hợp 2 dữ liệu
            const storiesWithViews = Object.keys(allStories).map(id => {
                return {
                    id: id,
                    ...allStories[id],
                    views: viewsData[id] || 0 // Lấy view từ nhánh 'views' dựa theo ID truyện
                };
            });

            // 4. Sắp xếp theo view giảm dần và lấy top 5
            const topStories = storiesWithViews
                .sort((a, b) => b.views - a.views)
                .slice(0, 5);

            nominationContainer.innerHTML = '';
            topStories.forEach((story, index) => {
                const card = document.createElement('div');
                card.className = 'story-card';
                card.onclick = () => window.location.href = `book.html?id=${story.id}`;
                
                const currentImg = story.img || story.cover || story.image || 'https://via.placeholder.com/180x250';
                
                card.innerHTML = `
                    <img src="${currentImg}" alt="${story.title}">
                    <div style="flex: 1; min-width: 0;">
                        <h4 style="margin-top:0; font-size:0.95rem; font-weight:700;">TOP ${index + 1} . ${story.title}</h4>
                        <p style="margin-bottom:0; font-size:0.8rem; color: var(--netflix-red); font-weight:600;"><i class="fa-regular fa-eye"></i> ${story.views} lượt xem</p>
                    </div>
                `;
                nominationContainer.appendChild(card);
            });
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
    const btnHeaderAuth = document.getElementById('btnHeaderAuth'); 
    const btnNotification = document.getElementById('btnNotification'); 
    
    // 1. Đảm bảo nút Admin luôn tồn tại trong DOM
    let btnAdminCrown = document.getElementById('btnOpenAdminPanel');
    if (!btnAdminCrown && btnHeaderAuth && btnHeaderAuth.parentNode) {
        btnAdminCrown = document.createElement('button');
        btnAdminCrown.id = 'btnOpenAdminPanel';
        btnAdminCrown.innerHTML = '👑';
        btnAdminCrown.style.cssText = "background: #2e8b57; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; font-size: 16px; cursor: pointer; display: none; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 8px;";
        btnHeaderAuth.parentNode.insertBefore(btnAdminCrown, btnHeaderAuth.nextSibling);
    }

    // 2. Xử lý logic khi ĐÃ ĐĂNG NHẬP
    if (user) {
        console.log("Đã đăng nhập với UID:", user.uid); // <--- KIỂM TRA DÒNG NÀY TRONG CONSOLE
        
        if (btnNotification) btnNotification.style.display = 'inline-flex';
        
        if (btnHeaderAuth) {
            btnHeaderAuth.innerHTML = (user.uid === 'BrZQ9s07ujfIYG1iPtC4vIhGgx33') ? "Chào, Chị Trân ạ" : `Chào, ${user.displayName || 'Thành Viên'}`;
            btnHeaderAuth.style.cssText = "width: auto; padding: 0 12px; border-radius: 20px; font-size: 13px; background: #ff4d6d; color: white; border: none; height: 36px; cursor: pointer;";
            
            // Chỉ gán hàm nếu nó tồn tại
            if (typeof openProfileZone === 'function') {
                btnHeaderAuth.onclick = openProfileZone;
            } else {
                console.error("Hàm openProfileZone chưa được định nghĩa!");
            }
        }

        renderUserProfileData(user);

        // PHÂN QUYỀN ADMIN - ĐƯỢC ÉP HIỂN THỊ
        if (user.uid === 'BrZQ9s07ujfIYG1iPtC4vIhGgx33') {
            if (btnAdminCrown) {
                btnAdminCrown.style.display = 'flex'; 
                btnAdminCrown.onclick = () => { window.location.href = "studio.html"; };
            }
        } else {
            if (btnAdminCrown) btnAdminCrown.style.display = 'none';
        }
    }
    // 3. Xử lý logic khi CHƯA ĐĂNG NHẬP
    else {
        if (btnNotification) btnNotification.style.display = 'none';
        if (btnHeaderAuth) {
            btnHeaderAuth.innerHTML = `<i class="fa-regular fa-user"></i>`;
            btnHeaderAuth.style.cssText = "width: 40px; height: 40px; border-radius: 50%; background: #ff4d6d; color: white; border: none; cursor: pointer;";
            btnHeaderAuth.onclick = null;
            btnHeaderAuth.onclick = openAuthModal;
        }
        if (btnAdminCrown) btnAdminCrown.style.display = 'none';

        const container = document.getElementById('userBookshelfContainer');
        if (container) container.innerHTML = `<div class="bookshelf-empty" style="color: #ff4d6d; font-weight: bold; text-align: center; width: 100%; padding: 20px 0;">⚠️ Vui lòng đăng nhập để sử dụng tủ sách cá nhân!</div>`;
        showHome();
    }
});

// --- B. CÁC HÀM XỬ LÝ HỒ SƠ & AVATAR (THU NHỎ ẢNH & LOAD TỦ SÁCH) ---
function renderUserProfileData(user) {
    renderAvatarSelectionGrid(); 
    
    const currentAvatarImg = document.getElementById('userCurrentAvatar');

    // Lấy avatar từ DB trước, fallback sang Google
    db.ref('users/' + user.uid + '/profile').once('value').then(snapshot => {
        const data = snapshot.val();

        let avatar = 'https://via.placeholder.com/100';

        if (data?.avatarType === "custom") {
            avatar = data.avatar;
        } else if (data?.avatarType === "google") {
            avatar = user.photoURL;
        } else {
            avatar = user.photoURL || data?.avatar;
        }

        if (currentAvatarImg) {
            currentAvatarImg.src = avatar;
            currentAvatarImg.style.cssText = "width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 15px auto; border: 3px solid #ff4d6d;";
        }
    });

    // ===== TỦ SÁCH =====
    const container = document.getElementById('userBookshelfContainer');
    if (!container) return;

    if (tuSachListenerRef) {
        tuSachListenerRef.off();
    }

    tuSachListenerRef = db.ref('users/' + user.uid + '/tuSach');

    tuSachListenerRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) { 
            container.innerHTML = `<div class="bookshelf-empty">Tủ sách trống trơn! Chị hãy thêm vào ngay đi ạ! 🐾</div>`; 
            return; 
        }
        buildBookshelfHTML(data, container);
    });
}

function updateUserProfileData() {
    const user = auth.currentUser;
    const newName = document.getElementById('editDisplayNameInput').value.trim();

    if (!user) {
        alert("Chưa đăng nhập nha chị 🐢");
        return;
    }

    const updates = {};

    // Đổi tên
    if (newName) {
        updates.displayName = newName;
        user.updateProfile({ displayName: newName });
        document.getElementById('userProfileName').textContent = newName;
    }

    // Đổi avatar
    if (selectedAvatarUrl) {
        updates.avatar = selectedAvatarUrl;
        updates.avatarType = "custom"; // QUAN TRỌNG
        document.getElementById('userCurrentAvatar').src = selectedAvatarUrl;
    }

    // Nếu không thay đổi gì
    if (Object.keys(updates).length === 0) {
        alert("Chưa thay đổi gì hết nha chị 😅");
        return;
    }

    // Lưu DB
    db.ref('users/' + user.uid + '/profile').update(updates);

    alert("Cập nhật hồ sơ thành công ✨");
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
    document.getElementById('userCurrentAvatar').src = url;
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
        authTitle.textContent = "GIA NHẬP ĐỘNG RÙA"; nickNameGroup.style.display = 'block';
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
            if (displayName) {
                userCredential.user.updateProfile({ displayName: displayName }).then(() => {
                    // Cập nhật xong tên thì mới reload để UI refresh
                    window.location.reload();
                });
            } else {
                window.location.reload();
            }
            alert("🎉 Đăng ký thành công!"); closeAuthModal();
        }).catch(err => alert(err.message));
    } else {
        auth.signInWithEmailAndPassword(email, password).then(() => {
            alert("🎉 Chào mừng chị trở lại!"); 
            closeAuthModal();
            window.location.reload(); // Reload để header cập nhật tên ngay
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
function openProfileZone() {
    const profileSection = document.getElementById('profileSection');
    const homeMainContent = document.getElementById('homeMainContent');
    
    if (profileSection) {
        profileSection.style.display = 'block';
    }
    if (homeMainContent) {
        homeMainContent.style.display = 'none';
    }
    // Chắc chắn cuộn lên đầu trang
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
// ==========================================================================
// FIX LỖI: THIẾU HÀM FILTER THEO THỂ LOẠI
// ==========================================================================
function filterBy(genreName) {
    loadStoriesByCondition('genres', genreName, `📜 Thể loại: ${genreName}`);
}
