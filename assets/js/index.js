import { db, ref } from "./firebase.js";
import { get, onValue, update, remove, push } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Khai báo các biến quản lý trạng thái toàn cục
const ADMIN_UID = "UID_ADMIN_CỦA_CHỊ_Ở_ĐÂY"; // Chị điền UID tài khoản admin của mình vào đây (nếu có)
let tuSachListenerRef = null; 
let selectedAvatarUrl = "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix";
let globalListBooks = []; // Lưu trữ mảng truyện toàn cục để phục vụ tính năng tìm kiếm nhanh

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Khởi chạy các Dropdown ẩn hiện
    setupDropdowns();

    // 2. Theo dõi trạng thái Đăng nhập / Đăng xuất Realtime
    listenAuthState();

    // 3. LẤY DATA THẬT TỪ FIREBASE VỀ
    globalListBooks = await fetchStoriesFromFirebase();

    // 4. Hiển thị danh sách truyện và truyện đề cử bằng data thật
    renderBookGrid(globalListBooks);
    renderRandomFeatured(globalListBooks);
    
    // 5. Kích hoạt bảng xếp hạng Top 5 lượt xem Realtime
    listenTopViews(globalListBooks); 
    
    // 6. Lắng nghe sự kiện bộ lọc Thể loại và Tác giả
    setupTagFilter(globalListBooks);
});

// --- HÀM THEO DÕI TRẠNG THÁI ĐĂNG NHẬP (V10) ---
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
                if (now - parseInt(loginTime) > 86400000) {
                    localStorage.removeItem(loginTimeKey);
                    signOut(auth).then(() => { 
                        alert("Hết phiên đăng nhập an toàn (24h). Vui lòng đăng nhập lại để tránh bot chị nhé! 🌸"); 
                        window.location.reload(); 
                    });
                    return;
                }
            }
            
            btnAuth.innerText = "Chào, " + (user.displayName || "Thành Viên 🌸");
            renderUserProfileData(user);
            checkAndGrantAdmin(user); 
        } else {
            btnAuth.innerText = "Đăng Ký / Đăng Nhập";
            
            if (tuSachListenerRef) { 
                tuSachListenerRef(); // Hủy lắng nghe realtime trong v10
                tuSachListenerRef = null; 
            }
            
            const container = document.getElementById('userBookshelfContainer');
            if (container) container.innerHTML = `<div class="bookshelf-empty">🔒 Vui lòng đăng nhập để xem tủ sách cá nhân nha Chị!</div>`;
        }
    });
}

// --- HÀM KIỂM TRA QUYỀN ADMIN ---
function checkAndGrantAdmin(user) {
    const adminEmail = "dien-email-cua-chi-vao-day@gmail.com"; // 🐢 CHỊ ĐIỀN EMAIL ADMIN CỦA CHỊ VÀO ĐÂY NHA!
    
    if (user && user.email === adminEmail) {
        console.log("Chào mừng vị vương quyền tối cao của Động Rùa! 🐢");
        const adminBtn = document.getElementById('btnOpenAdminPanel'); 
        if (adminBtn) adminBtn.style.display = 'inline-block';
    }
}

// --- HÀM LẤY DATA TỪ FIREBASE VÀ SẮP XẾP MỚI NHẤT ---
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

// --- HÀM RENDER TRUYỆN ĐỀ CỬ PREMIUM (RANDOM) ---
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

// --- QUẢN LÝ THÀNH VIÊN, CHỌN AVATAR VÀ TỦ SÁCH CÁ NHÂN (V10) ---
window.selectAvatarOption = function(imgEl, url) { 
    selectedAvatarUrl = url; 
    document.querySelectorAll('.avatar-option-img').forEach(img => img.classList.remove('selected')); 
    imgEl.classList.add('selected'); 
};

function highlightSelectedAvatar(url) { 
    document.querySelectorAll('.avatar-option-img').forEach(img => { 
        if (img.src === url) img.classList.add('selected'); else img.classList.remove('selected'); 
    }); 
}

window.openAuthModal = function() {
    const user = auth.currentUser;
    if (user) { 
        document.getElementById('homeMainContent').style.display = 'none'; 
        document.getElementById('profileSection').style.display = 'block'; 
        return; 
    }
    // Chị lưu ý xử lý biến isSignUpMode ở hàm toggleAuthMode bên file modal xử lý đăng nhập nếu có
    document.getElementById('authModal').style.display = 'flex';
};

function renderUserProfileData(user) {
    const pName = document.getElementById('userProfileName'); 
    const pEmail = document.getElementById('userProfileEmail'); 
    const dInput = document.getElementById('editDisplayNameInput');
    
    if (pName) pName.innerText = user.displayName || "Thành Viên Động";
    if (pEmail) pEmail.innerText = user.email;
    if (dInput) dInput.value = user.displayName || "";
    
    const userRef = ref(db, 'users/' + user.uid);
    get(userRef).then((snapshot) => {
        const data = snapshot.val();
        if (data && data.avatarUrl) { 
            const curAvt = document.getElementById('userCurrentAvatar'); 
            if (curAvt) curAvt.src = data.avatarUrl; 
            selectedAvatarUrl = data.avatarUrl; 
            highlightSelectedAvatar(data.avatarUrl); 
        }
    });
    
    if (tuSachListenerRef) tuSachListenerRef(); // Gỡ bỏ lắng nghe cũ
    
    const tuSachRef = ref(db, 'users/' + user.uid + '/tuSach');
    tuSachListenerRef = onValue(tuSachRef, (snapshot) => {
        const container = document.getElementById('userBookshelfContainer');
        if(!container) return; 
        container.innerHTML = ""; 
        const data = snapshot.val();
        
        if (!data) { 
            container.innerHTML = `<div class="bookshelf-empty">Tủ sách trống trơn! Hãy bấm "Thêm Vào Tủ Sách" ngoài phần giới thiệu truyện nhé. 🐾</div>`; 
            return; 
        }
        
        let hasItem = false;
        for (let key in data) {
            hasItem = true; 
            const b = data[key]; 
            const linkDocTiep = `noi-dung.html?truyen=${b.codeTruyen}&id=${b.idChuong || 0}`; 
            const anhBia = b.image || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(b.tenTruyen || 'Rua');
            const div = document.createElement('div'); 
            div.className = "bookshelf-item";
            div.innerHTML = `
                <div class="bookshelf-left" style="cursor:pointer;" onclick="window.location.href='${linkDocTiep}'">
                    <img src="${anhBia}" class="bookshelf-thumb" alt="Cover">
                    <div>
                        <p class="bookshelf-name" style="margin:0 0 4px 0; font-weight:bold;">${b.tenTruyen || 'Truyện chưa đặt tên'}</p>
                        <p style="margin:0; font-size:11px; color:#888;">Đọc đến: <span style="color:#2e8b57; font-weight:bold;">${b.chuongGanNhat || 'Văn Án'}</span></p>
                    </div>
                </div>
                <button class="btn-remove-book" onclick="removeFromBookshelf('${key}')">❌</button>
            `;
            container.appendChild(div);
        }
        if (!hasItem) { 
            container.innerHTML = `<div class="bookshelf-empty">Tủ sách trống trơn! Hãy bấm "Thêm Vào Tủ Sách" ngoài phần giới thiệu truyện nhé. 🐾</div>`; 
        }
    });
}

window.updateUserProfileData = function() {
    const user = auth.currentUser; 
    if (!user) return;
    const newName = document.getElementById('editDisplayNameInput').value.trim();
    if (!newName) { alert("Tên hiển thị không được bỏ trống nha!"); return; }
    
    updateProfile(user, { displayName: newName }).then(() => { 
        const userRef = ref(db, 'users/' + user.uid);
        return update(userRef, { displayName: newName, avatarUrl: selectedAvatarUrl }); 
    }).then(() => {
        const curAvt = document.getElementById('userCurrentAvatar'); 
        if (curAvt) curAvt.src = selectedAvatarUrl;
        if (document.getElementById('userProfileName')) document.getElementById('userProfileName').innerText = newName; 
        document.getElementById('btnHeaderAuth').innerText = "Chào, " + newName;
        alert("Cập nhật hồ sơ thành công rực rỡ!");
    }).catch(err => alert("Lỗi cập nhật: " + err.message));
};

window.removeFromBookshelf = function(key) { 
    const user = auth.currentUser; 
    if (user && confirm("Chị có muốn xóa truyện này khỏi tủ sách không ạ?")) { 
        const itemRef = ref(db, 'users/' + user.uid + '/tuSach/' + key);
        remove(itemRef).then(() => alert("Đã xóa khỏi tủ sách!")).catch(err => alert("Lỗi xóa: " + err.message)); 
    } 
};

window.logoutFromProfile = function() { 
    signOut(auth).then(() => { 
        alert("Đã đăng xuất tài khoản!"); 
        window.location.reload(); 
    }).catch(err => alert(err.message)); 
};

window.showHome = function() { 
    document.getElementById('profileSection').style.display = 'none'; 
    document.getElementById('homeMainContent').style.display = 'block'; 
};

// --- HỆ THỐNG TÌM KIẾM TRUYỆN NHANH (KHỚP THEO DATA THẬT) ---
window.triggerSearch = function() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase(); 
    if (!query) { alert("Nhập từ khóa trước khi bấm tìm Chị nha!"); return; }
    
    // Lọc theo mảng dữ liệu thật lấy từ Firebase về
    const results = globalListBooks.filter(t => t.title.toLowerCase().includes(query)); 
    const section = document.getElementById('searchResultsSection'); 
    const grid = document.getElementById('resultsGrid'); 
    if (!grid || !section) return;
    
    grid.innerHTML = "";
    if (results.length === 0) { 
        grid.innerHTML = `<p style="font-size:13px; opacity:0.6; padding:15px;">Không tìm thấy truyện nào khớp với từ khóa của chị rồi...</p>`; 
    } else { 
        results.forEach(t => { 
            grid.innerHTML += `<a href="book.html?id=${t.id}" class="book-card" style="margin:0;"><div class="book-cover"><img src="${t.img}" alt="Cover"></div><div class="book-info"><h3 class="book-title" style="font-size:14px; margin-top:8px;">${t.title}</h3></div></a>`; 
        }); 
    }
    section.style.display = "block"; 
    section.scrollIntoView({ behavior: 'smooth' });
};

window.closeSearch = function() { 
    document.getElementById('searchResultsSection').style.display = "none"; 
    document.getElementById('searchInput').value = ""; 
};

// --- QUẢN LÝ ĐĂNG CHƯƠNG MỚI DÀNH CHO ADMIN (V10) ---
window.submitNewChapter = function() {
    const story = document.getElementById('adminStorySelect').value; 
    const title = document.getElementById('adminChapterTitle').value.trim(); 
    const content = document.getElementById('adminChapterContent').value.trim();
    
    if(!title || !content) { alert("Chị ơi điền nốt tên chương với nội dung nha!"); return; }
    
    const chapterListRef = ref(db, `stories/${story}/chapters`);
    push(chapterListRef, { 
        title: title, 
        content: content, 
        timestamp: Date.now() // Sử dụng mốc thời gian v10 chuẩn xác
    }).then(() => {
        alert("Đã phát hành chương mới thành công rực rỡ! 🚀"); 
        if (typeof closeAdminModal === "function") closeAdminModal();
        document.getElementById('adminChapterTitle').value = ""; 
        document.getElementById('adminChapterContent').value = "";
    }).catch(err => alert("Lỗi đăng chương rồi chị ơi: " + err.message));
};

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
