import { db, ref } from "./firebase.js";
import { get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
// ✨ Bổ sung thêm các hàm Auth cần thiết cho bản v10
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Khai báo các biến quản lý trạng thái toàn cục
const ADMIN_UID = "UID_ADMIN_CỦA_CHỊ_Ở_ĐÂY"; // Điền UID tài khoản admin của chị vào đây nếu có
let tuSachListenerRef = null; 

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Khởi chạy các Dropdown ẩn hiện
    setupDropdowns();

    // 2. Theo dõi trạng thái Đăng nhập / Đăng xuất Realtime
    listenAuthState();

    // 3. LẤY DATA THẬT TỪ FIREBASE VỀ
    const listBooks = await fetchStoriesFromFirebase();

    // 4. Hiển thị danh sách truyện và truyện đề cử bằng data thật
    renderBookGrid(listBooks);
    renderRandomFeatured(listBooks);
    
    // 5. Kích hoạt bảng xếp hạng Top 5 lượt xem Realtime
    listenTopViews(listBooks); 
    
    // 6. Lắng nghe sự kiện bộ lọc Thể loại và Tác giả
    setupTagFilter(listBooks);
});

// --- ✨ HÀM THEO DÕI TRẠNG THÁI ĐĂNG NHẬP (ĐÃ NÂNG CẤP V10) ---
function listenAuthState() {
    onAuthStateChanged(auth, (user) => {
        const btnAuth = document.getElementById('btnHeaderAuth');
        if (!btnAuth) return;

        if (user) {
            const now = Date.now();
            const loginTimeKey = `login_time_${user.uid}`;
            let loginTime = localStorage.getItem(loginTimeKey);

            if (!loginTime) { 
                localStorage.setItem(loginTimeKey, now); 
            } else {
                // Kiểm tra nếu quá 24 tiếng (86.400.000 mili-giây) thì tự động đăng xuất
                if (now - parseInt(loginTime) > 86400000) {
                    localStorage.removeItem(loginTimeKey);
                    signOut(auth).then(() => { 
                        alert("Hết phiên đăng nhập an toàn (24h). Vui lòng đăng nhập lại để tránh bot chị nhé! 🌸"); 
                        window.location.reload(); 
                    });
                    return;
                }
            }
            
            // Đổi chữ trên nút Header thành tên người dùng
            btnAuth.innerText = "Chào, " + (user.displayName || "Thành Viên 🌸");
            
            // Gọi hàm hiển thị dữ liệu Profile và kiểm tra quyền Admin
            if (typeof renderUserProfileData === "function") renderUserProfileData(user);
            checkAndGrantAdmin(user); 
        } else {
            // Nếu chưa đăng nhập
            btnAuth.innerText = "Đăng Ký / Đăng Nhập";
            
            // Hủy lắng nghe tủ sách cũ nếu có
            if (tuSachListenerRef) { 
                // Bản v10 hủy lắng nghe bằng cách gọi lại chính hàm chứa nó
                tuSachListenerRef(); 
                tuSachListenerRef = null; 
            }
            
            const container = document.getElementById('userBookshelfContainer');
            if (container) container.innerHTML = `<div class="bookshelf-empty">🔒 Vui lòng đăng nhập để xem tủ sách cá nhân nha Chị!</div>`;
        }
    });
}

// --- HÀM KIỂM TRA EMAIL ĐỂ HIỂN THỊ NÚT ADMIN ---
function checkAndGrantAdmin(user) {
    const adminEmail = "dien-email-cua-chi-vao-day@gmail.com"; // 🐢 CHỊ ĐIỀN EMAIL ADMIN CỦA CHỊ VÀO ĐÂY NHA!
    
    if (user && user.email === adminEmail) {
        console.log("Chào mừng vị vương quyền tối cao của Động Rùa! 🐢");
        const adminBtn = document.getElementById('btnOpenAdminPanel'); 
        if (adminBtn) adminBtn.style.display = 'inline-block';
    }
}

// --- HÀM LẤY DATA TỰ ĐỘNG TỪ FIREBASE VÀ SẮP XẾP MỚI NHẤT ---
async function fetchStoriesFromFirebase() {
    const storiesRef = ref(db, "stories");
    const loadedBooks = [];

    try {
        const snapshot = await get(storiesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (let id in data) {
                const bookData = data[id];
                let latestChapter = "Chương 0";
                const chaptersRef = ref(db, `comments/${id}`); 
                const chapterSnapshot = await get(chaptersRef);
                
                if (chapterSnapshot.exists()) {
                    const chapters = chapterSnapshot.val();
                    const totalChapters = Object.keys(chapters).length; 
                    latestChapter = `Chương ${totalChapters}`;
                }

                loadedBooks.push({
                    id: id,
                    title: bookData.title,
                    author: bookData.author,
                    status: bookData.status || "updating",
                    tags: bookData.tags || [],
                    img: bookData.img || "https://picsum.photos/200/300",
                    chapter: latestChapter,
                    updatedAt: bookData.updatedAt || bookData.timestamp || 0 
                });
            }
            loadedBooks.sort((a, b) => b.updatedAt - a.updatedAt);
        }
    } catch (error) {
        console.error("Lỗi lấy dữ liệu từ Firebase:", error);
    }
    return loadedBooks;
}

// --- HÀM RENDER TRUYỆN RA GRID TRANG CHỦ ---
function renderBookGrid(booksToShow) {
    const bookGrid = document.getElementById("bookGrid");
    if (!bookGrid) return;
    
    if (booksToShow.length === 0) {
        bookGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #888; padding: 40px 0;">Không có truyện nào rồi chị ơi... 🌸</p>`;
        return;
    }

    bookGrid.innerHTML = booksToShow.map(book => `
        <div class="book-card">
            <div class="book-cover">
                <img src="${book.img}" alt="${book.title}">
                <span class="status-badge ${book.status}">
                    ${book.status === 'completed' ? 'Hoàn thành' : 'Đang chạy'}
                </span>
            </div>
            <div class="book-info">
                <h3 class="book-title"><a href="book.html?id=${book.id}">${book.title}</a></h3>
                <p class="latest-chapter">${book.chapter} (Mới nhất)</p>
            </div>
        </div>
    `).join('');
}

// --- HÀM RENDER TRUYỆN ĐỀ CỬ PREMIUM ---
function renderRandomFeatured(listBooks) {
    const featuredCard = document.getElementById("featuredBook");
    if (!featuredCard || !listBooks || listBooks.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * listBooks.length);
    const book = listBooks[randomIndex];
    
    featuredCard.className = "featured-card-premium";
    featuredCard.innerHTML = `
        <div class="featured-cover-wrapper">
            <img src="${book.img}" alt="${book.title}">
            <div class="ribbon-pop">HOT</div>
        </div>
        <div class="featured-detail">
            <span class="badge-trending"><i class="fa-solid fa-fire"></i> ĐỀ CỬ HÔM NAY</span>
            <h3>${book.title}</h3>
            <div class="featured-meta">
                <span><i class="fa-solid fa-pen-nib"></i> ${book.author}</span>
                <span><i class="fa-solid fa-book"></i> ${book.chapter}</span>
            </div>
            <p class="featured-summary">Chào mừng độc giả đến với bộ truyện đề cử siêu hay ngày hôm nay. Bấm vào nút bên dưới để đọc ngay nhé!</p>
            <a href="book.html?id=${book.id}" class="btn-read-now">Đọc Ngay Tại Đây <i class="fa-solid fa-arrow-right"></i></a>
        </div>
    `;
}

// --- CÁC HÀM ĐIỀU HƯỚNG DROPDOWN ---
function setupDropdowns() {
    const notiBtn = document.getElementById("notiBtn");
    const notiContent = document.getElementById("notiContent");
    const notiBadge = document.getElementById("notiBadge");
    
    if (notiBtn && notiContent) {
        notiBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isDisplayed = window.getComputedStyle(notiContent).display === "block";
            notiContent.style.display = isDisplayed ? "none" : "block";
            if (notiBadge) notiBadge.style.display = "none";
            closeAllMenusExcept("notiContent");
        });
    }

    handleDropdown("tagDropdownBtn", "tagMenu");
    handleDropdown("authorDropdownBtn", "authorMenu");

    document.addEventListener("click", () => {
        closeAllMenusExcept("");
    });
}

function handleDropdown(btnId, menuId) {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (!btn || !menu) return;

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isDisplayed = window.getComputedStyle(menu).display === "block";
        menu.style.display = isDisplayed ? "none" : "block";
        closeAllMenusExcept(menuId);
    });
}

function closeAllMenusExcept(exceptionId) {
    const tagMenu = document.getElementById("tagMenu");
    const authorMenu = document.getElementById("authorMenu");
    const notiContent = document.getElementById("notiContent");

    if (tagMenu && exceptionId !== "tagMenu") tagMenu.style.display = "none";
    if (authorMenu && exceptionId !== "authorMenu") authorMenu.style.display = "none";
    if (notiContent && exceptionId !== "notiContent") notiContent.style.display = "none";
}

// --- HÀM BỘ LỌC ĐỘNG THEO THỂ LOẠI & TÁC GIẢ ---
function setupTagFilter(listBooks) {
    const tagItems = document.querySelectorAll(".tag-item");
    tagItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            const selectedTag = item.textContent.trim();
            const filteredBooks = listBooks.filter(book => book.tags && book.tags.includes(selectedTag));
            const tagBtn = document.getElementById("tagDropdownBtn");
            if (tagBtn) tagBtn.innerHTML = `${selectedTag} <i class="fa-solid fa-caret-down"></i>`;
            const tagMenu = document.getElementById("tagMenu");
            if (tagMenu) tagMenu.style.display = "none";
            renderBookGrid(filteredBooks);
        });
    });

    const authorItems = document.querySelectorAll(".author-item");
    authorItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            const selectedAuthor = item.textContent.trim();
            const filteredBooks = listBooks.filter(book => book.author && book.author.trim() === selectedAuthor);
            const authorBtn = document.getElementById("authorDropdownBtn");
            if (authorBtn) authorBtn.innerHTML = `${selectedAuthor} <i class="fa-solid fa-caret-down"></i>`;
            const authorMenu = document.getElementById("authorMenu");
            if (authorMenu) authorMenu.style.display = "none";
            renderBookGrid(filteredBooks);
        });
    });
}

// --- HÀM LẮNG NGHE VÀ HIỂN THỊ TOP 5 LƯỢT XEM REALTIME ---
function listenTopViews(listBooks) {
    const container = document.getElementById('nominationListContainer');
    if (!container) return;

    const viewsRef = ref(db, 'views');
    
    onValue(viewsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const arr = Object.keys(data).map(id => ({ id, views: data[id] }));
        
        arr.sort((a, b) => b.views - a.views);
        const top5 = arr.slice(0, 5);

        let itemsHtml = "";
        top5.forEach((item, index) => {
            const match = listBooks.find(t => t.id === item.id);
            let titleText = match ? match.title : item.id.toUpperCase().replace(/_/g, ' ');
            let imageSrc = match ? match.img : "https://via.placeholder.com/180x240?text=No+Cover";
            let linkHref = `book.html?id=${item.id}`;
            let medalHtml = index < 3 ? ["🥇", "🥈", "🥉"][index] : "";

            itemsHtml += `
                <a href="${linkHref}" class="nomination-item">
                    <div class="nomination-medal">${medalHtml}</div>
                    <div class="nomination-thumb"><img src="${imageSrc}" alt="Bìa truyện"></div>
                    <div class="nomination-detail">
                        <p class="nomination-story-title">${titleText}</p>
                        <p class="nomination-story-vote">👁️ ${item.views.toLocaleString()} lượt xem</p>
                    </div>
                </a>
            `;
        });
        container.innerHTML = itemsHtml || `<div class="bookshelf-empty">Chưa có thống kê lượt xem...</div>`;
    });
}
