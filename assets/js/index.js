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
/* ==========================================================================
   3. TRUYỆN ĐỀ CỬ NGẪU NHIÊN (Đã sửa link)
   ========================================================================== */
function handleFeaturedRandomBook(storiesData) {
    const keys = Object.keys(storiesData);
    if (keys.length === 0) return;

    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const story = storiesData[randomKey];

    const heroTitle = document.getElementById('heroTitle');
    const heroSynopsis = document.getElementById('heroSynopsis');
    const heroLink = document.getElementById('heroLink'); // Thêm dòng này
    const featuredBookSection = document.getElementById('featuredBook');

    if (heroTitle) heroTitle.innerText = story.title || "Tác phẩm độc quyền";
    
    // Gán link cho nút Đọc Ngay
    if (heroLink) {
        heroLink.href = `book.html?id=${randomKey}`;
    }
    
    let rawSynopsis = story.description || story.synopsis || "Bấm vào để khám phá thế giới nội tâm đầy cảm xúc của tác phẩm này...";
    if (rawSynopsis.length > 100) {
        rawSynopsis = rawSynopsis.substring(0, 100) + "...";
    }
    if (heroSynopsis) heroSynopsis.innerText = rawSynopsis;

    const storyImg = story.img || story.cover || story.image;

    if (storyImg && featuredBookSection) {
        featuredBookSection.style.setProperty('background', `linear-gradient(to right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.2) 100%), url('${storyImg}')`, 'important');
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
   5. BỘ LỌC ĐIỀU KIỆN (Bản chuẩn cuối cùng cho chị)
   ========================================================================== */
function loadStoriesByCondition(field, value, titleText) {
    // 1. TÌM TÊN THẬT TỪ ID
    let filterValue = value;
    let finalTitle = titleText; // Tiêu đề mặc định
    
    if (field === 'genres' && typeof GENDERS !== 'undefined') {
        const foundGenre = GENDERS.find(g => g.id === value);
        if (foundGenre) {
            filterValue = foundGenre.name; 
            finalTitle = `📜 Thể loại: ${foundGenre.name}`; // Cập nhật tiêu đề hiển thị
        }
    }

    const searchSection = document.getElementById('searchResultsSection');
    const resultsGrid = document.getElementById('resultsGrid');
    const rowTitle = searchSection.querySelector('.row-title');

    // Cập nhật tiêu đề hiển thị bằng finalTitle
    if (rowTitle) rowTitle.innerText = finalTitle; 
    
    searchSection.style.display = 'block';
    resultsGrid.innerHTML = '<div style="grid-column: 1/-1; color: var(--smoke);">Đang lọc tác phẩm...</div>';
    searchSection.scrollIntoView({ behavior: 'smooth' });

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
            let match = false;

            if (field === 'genres') {
                const genresData = story.genres ? Object.values(story.genres) : [];
                // So sánh bằng tên thật (filterValue)
                if (genresData.some(g => String(g).trim().toLowerCase() === String(filterValue).trim().toLowerCase())) {
                    match = true;
                }
            } else {
                if (story[field] === value) {
                    match = true;
                }
            }

            if (match) {
                resultsGrid.appendChild(createNetflixCard(id, story));
                found = true;
            }
        });

        if (!found) {
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--smoke);">Không tìm thấy truyện nào có tag "${filterValue}" 🐢</p>`;
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

    // 1. Đổi .once('value') thành .on('value')
    db.ref('stories').orderByChild('updatedAt').on('value', (snapshot) => {
        bookGrid.innerHTML = ''; 
        if (!snapshot.exists()) return;

        const storiesData = snapshot.val();
        
        // Gọi hàm Random Banner Hero
        handleFeaturedRandomBook(storiesData);

        const storiesArray = [];
        snapshot.forEach((childSnapshot) => {
            storiesArray.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        // 2. Vì đã dùng on('value'), mỗi khi dữ liệu thay đổi nó sẽ tự render lại từ đầu
        storiesArray.reverse().forEach((story) => {
            bookGrid.appendChild(createNetflixCard(story.id, story));
        });
    }, (err) => {
        // 3. Xử lý lỗi cho .on()
        console.error("Lỗi kết nối Firebase:", err);
        bookGrid.innerHTML = '<p style="grid-column: 1/-1;">Lỗi kết nối thư viện chính.</p>';
    });
}

/* ==========================================================================
   7. TOP 5 ĐỘT PHÁ LƯỢT XEM (Đã sửa để lấy đúng nhánh 'views')
   ========================================================================== */
function loadTopViews() {
    const nominationContainer = document.getElementById('nominationListContainer');
    if (!nominationContainer) return;

    // Lắng nghe cả 2 nhánh dữ liệu cùng lúc
    db.ref('stories').on('value', (storiesSnapshot) => {
        db.ref('views').on('value', (viewsSnapshot) => {
            
            const allStories = storiesSnapshot.val();
            const viewsData = viewsSnapshot.val() || {}; // Phòng trường hợp chưa có dữ liệu views
            
            if (!allStories) return;

            // Kết hợp dữ liệu
            const storiesWithViews = Object.keys(allStories).map(id => {
                return {
                    id: id,
                    ...allStories[id],
                    views: viewsData[id] || 0
                };
            });

            // Sắp xếp và lấy top 5
            const topStories = storiesWithViews
                .sort((a, b) => b.views - a.views)
                .slice(0, 5);

            // Render lại danh sách
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
                        <p style="margin-bottom:0; font-size:0.8rem; color: var(--netflix-red); font-weight:600;">
                            <i class="fa-regular fa-eye"></i> ${story.views} lượt xem
                        </p>
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
async function createNetflixCard(id, story) {
    const div = document.createElement('div');
    div.className = 'story-card';
    div.onclick = () => window.location.href = `book.html?id=${id}`;
    
    const currentImg = story.img || story.cover || story.image || 'https://via.placeholder.com/180x250';
    
    // --- ĐÂY LÀ KHUNG MỚI, CHỊ BỎ ĐOẠN chapterInfo CŨ ĐI NHÉ ---
    div.innerHTML = `
        <img src="${currentImg}" alt="${story.title}" style="width: 100%; height: 250px; object-fit: cover; border-radius: 8px;">
        <h4 style="margin: 10px 0 5px 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${story.title}</h4>
        <p style="margin: 0; font-size: 12px; color: #888;">${story.author || 'Động Chăn Rùa'}</p>
        <div id="chapter-container-${id}" style="margin-top: 6px;">
            <div style="font-size: 11px; color: #aaa;">Đang tải chương...</div>
        </div>
    `;

    // Sau khi tạo xong khung, mình mới đi "bốc" dữ liệu chương bỏ vào cái div đó
    const chaptersRef = ref(db, `chapters/${id}`);
    get(chaptersRef).then((snapshot) => {
        const container = div.querySelector(`#chapter-container-${id}`);
        if (!snapshot.exists()) {
            container.innerHTML = `<div style="font-size: 11px; color: #aaa;">Chưa có chương mới</div>`;
            return;
        }

        let chapters = [];
        snapshot.forEach(child => {
            chapters.push({ id: child.key, ...child.val() });
        });

        // Sắp xếp lấy 2 chương mới nhất
        chapters.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
        const latestTwo = chapters.slice(0, 2);

        container.innerHTML = latestTwo.map(ch => {
            let title = ch.title;
            if (title.length > 20) title = title.substring(0, 18) + "...";
            
            const d = new Date(ch.updatedAt || ch.createdAt);
            const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
            
            return `
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; font-size: 11px; font-weight: 600;">
                   <span style="color: #ff4d6d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">
                       <i class="fa-solid fa-feather-pointed"></i> ${title}
                   </span>
                   <span style="color: #999; flex-shrink: 0; margin-left: 5px;">${dateStr}</span>
               </div>`;
        }).join('');
    });

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
    const profileNameEl = document.getElementById('userProfileName');
    const profileEmailEl = document.getElementById('userProfileEmail');

    // Lấy thông tin từ Database
    db.ref('users/' + user.uid + '/profile').once('value').then(snapshot => {
        const data = snapshot.val();

        // 1. XỬ LÝ TÊN HIỂN THỊ (BIỆT DANH)
        // Ưu tiên lấy từ Database, nếu không có thì lấy từ Auth, cuối cùng là "Thành Viên"
        const displayName = data?.displayName || user.displayName || "Thành Viên";
        if (profileNameEl) profileNameEl.textContent = displayName;
        
        // Hiển thị Email
        if (profileEmailEl) profileEmailEl.textContent = user.email;

        // 2. XỬ LÝ AVATAR
        let avatar = 'https://via.placeholder.com/100';
        if (data?.avatarType === "custom") {
            avatar = data.avatar;
        } else if (data?.avatarType === "google") {
            avatar = user.photoURL;
        } else {
            avatar = user.photoURL || data?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix';
        }

        if (currentAvatarImg) {
            currentAvatarImg.src = avatar;
            currentAvatarImg.style.cssText = "width: 100px; height: 100px; border-radius: 50%; object-fit: cover; display: block; margin: 0 auto 15px auto; border: 3px solid #ff4d6d;";
        }
    });

    // ===== TỦ SÁCH (Phần cũ của chị giữ nguyên) =====
    const container = document.getElementById('userBookshelfContainer');
    if (!container) return;

    if (tuSachListenerRef) {
        tuSachListenerRef.off();
    }

    tuSachListenerRef = db.ref('users/' + user.uid + '/tuSach');
    tuSachListenerRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) { 
            container.innerHTML = `<div class="bookshelf-empty" style="text-align: center; color: #aaa; padding: 20px;">Tủ sách trống trơn! Chị hãy thêm vào ngay đi ạ! 🐾</div>`; 
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
    if (!data) {
        container.innerHTML = `<div style="text-align: center; color: #aaa; padding: 20px;">Tủ sách trống trơn! Chị hãy thêm vào ngay đi ạ! 🐾</div>`;
        return;
    }

    container.innerHTML = Object.keys(data).map(key => {
        const b = data[key];
        
        // Dùng template string để tạo giao diện, thêm sự kiện click trực tiếp vào div
        return `
        <div class="bookshelf-item" 
             onclick="window.location.href='book.html?id=${key}'" 
             style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;">
            
            <div class="bookshelf-left" style="display: flex; align-items: center; gap: 10px;">
                <img src="${b.image}" class="bookshelf-thumb" style="width: 45px; height: 60px; object-fit: cover; border-radius: 4px;" alt="Cover">
                <div>
                    <p style="margin: 0; font-weight: bold; font-size: 14px;">${b.tenTruyen}</p>
                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #777;">Đọc đến: ${b.chuongGanNhat}</p>
                </div>
            </div>
            
            <button class="btn-remove-book" 
                    onclick="event.stopPropagation(); removeFromBookshelf('${key}')" 
                    style="background: none; border: none; cursor: pointer; font-size: 14px; padding: 5px;">
                ❌
            </button>
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
            const user = userCredential.user;
            
            // 1. Cập nhật tên lên Firebase Auth (để dùng chung cho các dịch vụ Google)
            user.updateProfile({ displayName: displayName || "Thành Viên" });

            // 2. LƯU VÀO DATABASE (Đây là bước quan trọng để load lên Profile)
            db.ref('users/' + user.uid + '/profile').set({
                displayName: displayName || "Thành Viên",
                email: email,
                avatarType: 'default',
                avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
                createdAt: Date.now()
            }).then(() => {
                alert("🎉 Đăng ký thành công!");
                closeAuthModal();
                window.location.reload(); // Reload để cập nhật toàn bộ UI
            });

        }).catch(err => alert(err.message));

    } else {
        // Đăng nhập bình thường
        auth.signInWithEmailAndPassword(email, password).then(() => {
            alert("🎉 Chào mừng chị trở lại!"); 
            closeAuthModal();
            window.location.reload(); 
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
function closeSearch() {
    const section = document.getElementById("searchResultsSection");

    if (section) {
        section.style.display = "none";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
function applyGenreFilter() {

    const checked = document.querySelectorAll(".genre-checkbox:checked");

    if (checked.length === 0) {
        closeGenreModal();
        return;
    }

    const ids = [...checked].map(cb => cb.value);

    loadStoriesByGenres(ids);

    closeGenreModal();
}
// Biến này để lưu lại "người nghe" của bộ lọc
let genreListenerRef = null; 

function loadStoriesByGenres(ids) {
    const resultsGrid = document.getElementById("resultsGrid");
    const section = document.getElementById("searchResultsSection");
    const rowTitle = section.querySelector(".row-title");

    section.style.display = "block";
    resultsGrid.innerHTML = "Đang kết nối...";

    if (rowTitle) {
        rowTitle.innerText = "📜 Kết quả theo thể loại";
    }

    // 1. Nếu trước đó đã có bộ lọc đang chạy, phải tắt nó đi để không bị chồng chéo
    if (genreListenerRef) {
        genreListenerRef.off();
    }

    // 2. Gán ref vào biến để quản lý
    genreListenerRef = db.ref("stories");

    // 3. Sử dụng .on('value') để lắng nghe realtime
    genreListenerRef.on("value", (snapshot) => {
        resultsGrid.innerHTML = "";
        let found = false;

        const selectedNames = ids
            .map(id => GENDERS.find(g => g.id == id)?.name)
            .filter(Boolean)
            .map(name => name.trim().toLowerCase());

        snapshot.forEach(child => {
            const story = child.val();
            const genres = story.genres
                ? Object.values(story.genres).map(g => String(g).trim().toLowerCase())
                : [];

            const ok = selectedNames.some(name => genres.includes(name));

            if (ok) {
                resultsGrid.appendChild(createNetflixCard(child.key, story));
                found = true;
            }
        });

        if (!found) {
            resultsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center">Không có truyện phù hợp 🐢</p>`;
        }
    });

    section.scrollIntoView({ behavior: "smooth" });
}
// Logic ẩn hiện nút và trượt trang
document.addEventListener("DOMContentLoaded", () => {
    const scrollBtn = document.getElementById("scrollToTopBtn");

    if (scrollBtn) { // Kiểm tra xem nút có tồn tại không rồi mới chạy
        window.addEventListener("scroll", () => {
            if (window.scrollY > 300) {
                scrollBtn.style.display = "flex";
            } else {
                scrollBtn.style.display = "none";
            }
        });

        scrollBtn.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }
});
