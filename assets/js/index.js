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
        // Bỏ qua nút Thể Loại vì nó dùng cơ chế Hover xổ Dropdown
        if (btn.id === 'tagDropdownBtn') return;

        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterType = btn.getAttribute('data-filter');
            if (filterType === 'new') {
                // Quay lại nạp danh sách truyện mới cập nhật tổng hợp
                closeSearch();
                loadMainStories();
            } else if (filterType === 'completed') {
                // Lọc truyện theo trạng thái Hoàn thành
                loadStoriesByCondition('status', 'Hoàn thành', '🍿 Danh Sách Truyện Đã Hoàn Thành');
            }
        });
    });
}

/* ==========================================================================
   3. TRUYỆN ĐỀ CỬ NGẪU NHIÊN (Đổ trực tiếp lên Banner Hero Premium)
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

    // Cập nhật text tiêu đề và mô tả truyện công tâm
    if (heroTitle) heroTitle.innerText = story.title || "Tác phẩm độc quyền";
    if (heroSynopsis) heroSynopsis.innerText = story.description || story.synopsis || "Bấm vào để khám phá thế giới nội tâm đầy cảm xúc của tác phẩm này...";

    // Tạo link dẫn tới trang chi tiết truyện (giữ nguyên cấu trúc book.html của chị)
    const storyReadUrl = `book.html?id=${randomKey}`;
    if (heroLink) heroLink.setAttribute('href', storyReadUrl);

    // Dùng ảnh bìa truyện (story.cover) làm background mờ ảo chuẩn phong cách Netflix
    if (story.cover && featuredBookSection) {
        featuredBookSection.style.setProperty('background', `linear-gradient(to right, rgba(252,249,250,0.95) 40%, rgba(252,249,250,0.4)), url('${story.cover}')`, 'important');
        featuredBookSection.style.setProperty('background-size', 'cover', 'important');
        featuredBookSection.style.setProperty('background-position', 'center 20%', 'important');
    }

    // Độc giả click vào bất cứ đâu trên Banner cũng bay thẳng vào trang đọc truyện
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
            
            // Khi click chọn 1 thể loại, gọi bộ lọc đổ ra vùng tìm kiếm chuyên sâu
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

    // Cuộn màn hình nhẹ nhàng xuống khu vực kết quả bộ lọc
    searchSection.scrollIntoView({ behavior: 'smooth' });

    db.ref('stories').orderByChild(field).equalTo(value).once('value')
    .then((snapshot) => {
        resultsGrid.innerHTML = '';
        if (!snapshot.exists()) {
            resultsGrid.innerHTML = `<p style="grid-column: 1/-1; color: var(--smoke);">Động chưa tìm thấy truyện nào tương ứng 🐢</p>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const story = childSnapshot.val();
            resultsGrid.appendChild(createNetflixCard(childSnapshot.key, story));
        });
    })
    .catch((err) => {
        console.error("Lỗi lọc dữ liệu:", err);
        resultsGrid.innerHTML = '<p style="grid-column: 1/-1;">Đã xảy ra lỗi khi tìm kiếm.</p>';
    });
}

// Hàm đóng bộ lọc tìm kiếm chuyên sâu
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
        
        // TIỆN ÍCH: Gọi hàm Random Banner Hero ngay tại đây khi có đầy đủ dữ liệu truyện
        handleFeaturedRandomBook(storiesData);

        const storiesArray = [];
        snapshot.forEach((childSnapshot) => {
            storiesArray.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        // Đảo ngược mảng để truyện mới update nhảy lên đầu danh sách
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

        // Đảo thứ tự để truyện nhiều view nhất đứng đầu bảng xếp hạng
        topStories.reverse();

        topStories.forEach((story, index) => {
            const card = document.createElement('div');
            card.className = 'story-card';
            card.onclick = () => window.location.href = `book.html?id=${story.id}`;
            
            card.innerHTML = `
                <img src="${story.cover || 'https://via.placeholder.com/180x250'}" alt="${story.title}">
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
   Ô CHỨC NĂNG PHỤ: TẠO CARD TRUYỆN PHONG CÁCH NETFLIX
   ========================================================================== */
function createNetflixCard(id, story) {
    const div = document.createElement('div');
    div.className = 'story-card';
    div.onclick = () => window.location.href = `book.html?id=${id}`;
    
    div.innerHTML = `
        <img src="${story.cover || 'https://via.placeholder.com/180x250'}" alt="${story.title}">
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
    
    // Tìm kiếm tương đối quét qua thư viện chính
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
