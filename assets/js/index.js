// ==========================================================================
// 1. CẤU HÌNH FIREBASE (Chị đã cung cấp)
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
    initTabs();
    loadRandomFeatured();
    loadMainStories();
    loadTopViews();
    listenToNotifications();
});

/* ==========================================================================
   2. XỬ LÝ SỰ KIỆN TABS (Bấm bộ lọc tìm kiếm)
   ========================================================================== */
function initTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    const contents = document.querySelectorAll('.filter-content');
    const ajaxSection = document.getElementById('ajaxStoryList');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetId = tab.getAttribute('data-target');
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) content.classList.add('active');
            });

            // Ẩn bảng kết quả cũ đi
            ajaxSection.classList.add('hidden');

            // Gọi hàm đổ dữ liệu tương ứng với cấu trúc Realtime Database
            if (targetId === 'genre-box') {
                loadGenres();
            } else if (targetId === 'author-box') {
                loadAuthors();
            } else if (targetId === 'latest-box') {
                document.querySelector('.main-story-list').scrollIntoView({ behavior: 'smooth' });
            } else if (targetId === 'completed-box') {
                loadStoriesByCondition('status', 'Hoàn thành');
            }
        });
    });
}

/* ==========================================================================
   3. TRUYỆN ĐỀ CỬ NGẪU NHIÊN (Random từ Realtime Database)
   ========================================================================== */
function loadRandomFeatured() {
    const featuredCard = document.getElementById('featuredCard');
    
    db.ref('stories').once('value')
    .then((snapshot) => {
        if (!snapshot.exists()) {
            featuredCard.innerHTML = `<p class="filter-hint">Động chưa có truyện nào đề cử hôm nay.</p>`;
            return;
        }

        const storiesData = snapshot.val();
        const storiesArray = [];
        
        // Chuyển Object của Realtime Database thành Mảng để dễ Random
        for (let key in storiesData) {
            storiesArray.push({ id: key, ...storiesData[key] });
        }

        // Bốc ngẫu nhiên 1 truyện
        const randomIndex = Math.floor(Math.random() * storiesArray.length);
        const story = storiesArray[randomIndex];

        featuredCard.innerHTML = `
            <img src="${story.cover || 'https://via.placeholder.com/120x160'}" alt="${story.title}" style="width: 120px; height: 160px; object-fit: cover; border-radius: 8px;">
            <div class="featured-info">
                <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--dark-pink); margin-bottom: 5px;">
                    <a href="book.html?id=${story.id}">${story.title}</a>
                </h3>
                <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 10px;">Tác giả: <strong>${story.author || 'Ẩn danh'}</strong></p>
                <p style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.95rem;">
                    ${story.description || 'Chưa có tóm tắt nội dung cho tác phẩm này...'}
                </p>
            </div>
        `;
    })
    .catch((error) => {
        console.error("Lỗi random truyện:", error);
        featuredCard.innerHTML = `<p>Không thể tải truyện đề cử.</p>`;
    });
}

/* ==========================================================================
   4. TẢI DANH MỤC TAG THỂ LOẠI & TÁC GIẢ (Xổ truyện khi click)
   ========================================================================== */
// Load danh sách Thể loại
function loadGenres() {
    const genreTags = document.getElementById('genreTags');
    genreTags.innerHTML = '<span>Đang tải...</span>';

    db.ref('genres').once('value').then((snapshot) => {
        genreTags.innerHTML = '';
        if(!snapshot.exists()) return;

        snapshot.forEach((childSnapshot) => {
            const genreName = childSnapshot.val().name || childSnapshot.val(); // Hỗ trợ cả dạng string hoặc object {name: ""}
            const span = document.createElement('span');
            span.className = 'tag-item';
            span.textContent = genreName;
            span.addEventListener('click', () => loadStoriesByCondition('genre', genreName));
            genreTags.appendChild(span);
        });
    });
}

// Load danh sách Tác giả
function loadAuthors() {
    const authorTags = document.getElementById('authorTags');
    authorTags.innerHTML = '<span>Đang tải...</span>';

    db.ref('authors').once('value').then((snapshot) => {
        authorTags.innerHTML = '';
        if(!snapshot.exists()) return;

        snapshot.forEach((childSnapshot) => {
            const authorName = childSnapshot.val().name || childSnapshot.val();
            const span = document.createElement('span');
            span.className = 'tag-item';
            span.textContent = authorName;
            span.addEventListener('click', () => loadStoriesByCondition('author', authorName));
            authorTags.appendChild(span);
        });
    });
}

// Hàm dùng chung để lọc truyện và xổ ra danh sách ngay dưới mục tìm kiếm
function loadStoriesByCondition(field, value) {
    const ajaxSection = document.getElementById('ajaxStoryList');
    const ajaxGrid = document.getElementById('ajaxStoriesGrid');
    
    ajaxSection.classList.remove('hidden');
    ajaxGrid.innerHTML = '<div class="loading">Đang tìm truyện...</div>';

    // Query lọc theo trường (Cần cấu hình .indexOn trong Rules Firebase nếu dữ liệu lớn)
    db.ref('stories').orderByChild(field).equalTo(value).once('value')
    .then((snapshot) => {
        ajaxGrid.innerHTML = '';
        if (!snapshot.exists()) {
            ajaxGrid.innerHTML = `<p class="filter-hint" style="grid-column: 1/-1;">Động chưa có truyện nào thuộc mục này 🐢</p>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const story = childSnapshot.val();
            ajaxGrid.appendChild(createStoryCard(childSnapshot.key, story));
        });
    })
    .catch((err) => {
        console.error("Lỗi lọc truyện:", err);
        ajaxGrid.innerHTML = '<p>Có lỗi xảy ra khi lọc.</p>';
    });
}

/* ==========================================================================
   5. TOÀN BỘ TRUYỆN MỚI CẬP NHẬT (Danh sách chính)
   ========================================================================== */
function loadMainStories() {
    const mainGrid = document.getElementById('mainStoriesGrid');
    mainGrid.innerHTML = '<div class="loading">Đang tải truyện...</div>';

    // Sắp xếp theo "updatedAt" (Realtime DB trả từ nhỏ tới lớn nên mình sẽ đảo ngược mảng ở giao diện)
    db.ref('stories').orderByChild('updatedAt').once('value')
    .then((snapshot) => {
        mainGrid.innerHTML = '';
        if (!snapshot.exists()) return;

        const stories = [];
        snapshot.forEach((childSnapshot) => {
            stories.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        // Đảo ngược mảng để truyện mới cập nhật xếp lên đầu
        stories.reverse().forEach((story) => {
            mainGrid.appendChild(createStoryCard(story.id, story));
        });
    })
    .catch((err) => {
        mainGrid.innerHTML = '<p>Lỗi tải danh sách truyện chính.</p>';
    });
}

/* ==========================================================================
   6. TOP 5 VIEW NHIỀU (Giới hạn 5 phần tử)
   ========================================================================== */
function loadTopViews() {
    const topList = document.getElementById('topViewsList');
    
    // Lấy 5 truyện có view cao nhất (limitToLast vì Realtime DB xếp tăng dần)
    db.ref('stories').orderByChild('views').limitToLast(5).once('value')
    .then((snapshot) => {
        topList.innerHTML = '';
        if (!snapshot.exists()) return;

        const topStories = [];
        snapshot.forEach((childSnapshot) => {
            topStories.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        // Đảo mảng để view cao nhất đứng hạng 1
        topStories.reverse();

        topStories.forEach((story, index) => {
            const rank = index + 1;
            const item = document.createElement('div');
            item.className = 'top-story-item';
            item.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 15px;
                background: #fff;
                border-radius: 8px;
                border-left: 4px solid ${rank <= 3 ? 'var(--primary-pink)' : '#e0e0e0'};
            `;
            
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: bold; width: 25px; color: var(--dark-pink);">${rank}</span>
                    <a href="book.html?id=${story.id}" style="font-weight: 500;">${story.title}</a>
                </div>
                <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fa-regular fa-eye"></i> ${story.views || 0}</span>
            `;
            topList.appendChild(item);
        });
    });
}

/* ==========================================================================
   7. LẮNG NGHE THÔNG BÁO REALTIME (Từ nút Bell trên Header)
   ========================================================================== */
function listenToNotifications() {
    const notiCountBadge = document.getElementById('notiCount');
    
    // Đếm realtime số lượng thông báo chưa đọc trong nhánh 'notifications'
    db.ref('notifications').on('value', (snapshot) => {
        if(snapshot.exists()) {
            notiCountBadge.textContent = snapshot.numChildren();
        } else {
            notiCountBadge.textContent = "0";
        }
    });
}

/* ==========================================================================
   HÀM BỔ TRỢ: TẠO CARD TRUYỆN
   ========================================================================== */
function createStoryCard(id, story) {
    const card = document.createElement('div');
    card.className = 'story-card';
    card.innerHTML = `
        <a href="book.html?id=${id}">
            <div style="position: relative; overflow: hidden; padding-top: 135%; border-radius: var(--radius-smooth); background: #eee; box-shadow: var(--shadow-smooth);">
                <img src="${story.cover || 'https://via.placeholder.com/180x240'}" alt="${story.title}" style="position: absolute; top:0; left:0; width:100%; height:100%; object-fit: cover;">
            </div>
            <div style="padding: 10px 5px 0 5px;">
                <h4 style="font-size: 0.95rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${story.title}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${story.author || 'Tác giả'}
                </p>
            </div>
        </a>
    `;
    return card;
}
