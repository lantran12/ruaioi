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

document.addEventListener("DOMContentLoaded", async () => {
    setupDropdowns();
    listenAuthState();
    globalListBooks = await fetchStoriesFromFirebase();
    renderBookGrid(globalListBooks);
    renderRandomFeatured(globalListBooks);
    listenTopViews(globalListBooks); 
    updateFilterMenusAutomatically(globalListBooks);
});

// --- HÀM THEO DÕI TRẠNG THÁI ĐĂNG NHẬP ---
function listenAuthState() {
    onAuthStateChanged(auth, (user) => {
        const btnAuth = document.getElementById('btnHeaderAuth');
        const adminBtn = document.getElementById('btnOpenAdminPanel'); // Nút mở bảng Admin

        if (!btnAuth) return;

        if (user) {
            btnAuth.innerText = "Chào, " + (user.displayName || "Thành Viên 🌸");
            renderUserProfileData(user);
            
            // Chỉ hiện nút mở bảng nếu đúng là Admin
            if (user.uid === ADMIN_UID || user.email === ADMIN_EMAIL) {
                if (adminBtn) adminBtn.style.display = 'inline-block';
            }
        } else {
            btnAuth.innerText = "Đăng Ký / Đăng Nhập";
            if (adminBtn) adminBtn.style.display = 'none'; // Ẩn nút nếu đăng xuất
            const adminPanel = document.getElementById('adminPanel');
            if (adminPanel) adminPanel.style.display = 'none'; // Ẩn luôn bảng nếu đăng xuất
            
            if (tuSachListenerRef) { tuSachListenerRef(); tuSachListenerRef = null; }
            const container = document.getElementById('userBookshelfContainer');
            if (container) container.innerHTML = `<div class="bookshelf-empty">🔒 Vui lòng đăng nhập để xem tủ sách cá nhân nha Chị!</div>`;
        }
    });
}

// --- HÀM BẬT/TẮT BẢNG ADMIN (CÓ KIỂM TRA QUYỀN) ---
window.toggleAdminPanel = function() {
    const user = auth.currentUser;
    if (!user || (user.uid !== ADMIN_UID && user.email !== ADMIN_EMAIL)) {
        alert("Chỉ Admin mới được sử dụng tính năng này! 🚫");
        return;
    }

    const adminPanel = document.getElementById('adminPanel');
    if (!adminPanel) return;

    const isHidden = window.getComputedStyle(adminPanel).display === 'none';
    adminPanel.style.display = isHidden ? 'block' : 'none';
};

// --- HÀM ĐĂNG BÀI (KIỂM TRA QUYỀN TRƯỚC KHI PUSH) ---
window.submitNewChapter = function() {
    const user = auth.currentUser;
    if (!user || (user.uid !== ADMIN_UID && user.email !== ADMIN_EMAIL)) {
        alert("Chị không có quyền đăng bài đâu nha! 🚫");
        return;
    }

    const story = document.getElementById('adminStorySelect').value;
    const title = document.getElementById('adminChapterTitle').value.trim();
    const content = document.getElementById('adminChapterContent').value.trim();
    
    if(!title || !content) { alert("Chị ơi điền nốt tên chương với nội dung nha!"); return; }
    
    const chapterListRef = ref(db, `stories/${story}/chapters`);
    push(chapterListRef, {
        title: title,
        content: content,
        timestamp: Date.now()
    }).then(() => {
        alert("Đã phát hành chương mới thành công rực rỡ! 🚀");
        document.getElementById('adminChapterTitle').value = "";
        document.getElementById('adminChapterContent').value = "";
    }).catch(err => alert("Lỗi đăng chương: " + err.message));
};

// --- CÁC HÀM XỬ LÝ AUTH, RENDER, UI (Giữ nguyên logic cũ của Chị) ---
window.openAuthModal = function() {
    const user = auth ? auth.currentUser : null;
    if (user) { 
        if (document.getElementById('homeMainContent')) document.getElementById('homeMainContent').style.display = 'none'; 
        if (document.getElementById('profileSection')) document.getElementById('profileSection').style.display = 'block'; 
        return; 
    }
    isSignUpMode = true;
    resetAuthFormFields();
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.style.display = 'flex';
};

// ⚙️ CÁC HÀM ĐIỀU KHIỂN ĐÓNG MỞ VÀ XỬ LÝ FORM MODAL AUTH

// =======================================================

window.openAuthModal = function() {

    try {

        const user = auth ? auth.currentUser : null;

        if (user) { 

            if (document.getElementById('homeMainContent')) document.getElementById('homeMainContent').style.display = 'none'; 

            if (document.getElementById('profileSection')) document.getElementById('profileSection').style.display = 'block'; 

            return; 

        }

    } catch (e) {

        console.warn(e);

    }

    isSignUpMode = true; 

    resetAuthFormFields(); 

    const authModal = document.getElementById('authModal');

    if (authModal) authModal.style.display = 'flex';

};



window.closeAuthModal = function() { 

    const authModal = document.getElementById('authModal');

    if (authModal) authModal.style.display = 'none'; 

};



window.closeAuthModalOverlay = function(e) { 

    if (e.target.id === 'authModal') closeAuthModal(); 

};



function resetAuthFormFields() { 

    if (document.getElementById('authDisplayName')) document.getElementById('authDisplayName').value = ""; 

    if (document.getElementById('authEmail')) document.getElementById('authEmail').value = ""; 

    if (document.getElementById('authPassword')) document.getElementById('authPassword').value = ""; 

}



window.toggleAuthMode = function() {

    isSignUpMode = !isSignUpMode;

    const title = document.getElementById('authTitle'); 

    const nameGrp = document.getElementById('nickNameGroup'); 

    const submitBtn = document.getElementById('btnAuthSubmit'); 

    const toggleLnk = document.getElementById('authToggleLink'); 

    const forgotLnk = document.getElementById('authForgotLink');

    

    if (!title || !submitBtn || !toggleLnk) return;



    if (isSignUpMode) {

        title.innerText = "ĐĂNG KÝ THÀNH VIÊN"; 

        if (nameGrp) nameGrp.style.display = 'block'; 

        submitBtn.innerText = "ĐĂNG KÝ TÀI KHOẢN THẬT"; 

        toggleLnk.innerText = "Đã có tài khoản rồi? Bấm vào đây để Đăng nhập"; 

        if (forgotLnk) forgotLnk.style.display = 'none';

    } else {

        title.innerText = "ĐĂNG NHẬP HỆ THỐNG"; 

        if (nameGrp) nameGrp.style.display = 'none'; 

        submitBtn.innerText = "ĐĂNG NHẬP NGAY"; 

        toggleLnk.innerText = "Chưa có tài khoản? Bấm vào đây để Đăng ký mới"; 

        if (forgotLnk) forgotLnk.style.display = 'block';

    }

};



window.submitAuthForm = function() {

    const email = document.getElementById('authEmail').value.trim();

    const password = document.getElementById('authPassword').value;

    const displayName = document.getElementById('authDisplayName').value.trim();

    

    if (!email || !password) { alert("Vui lòng điền đầy đủ Email và Mật khẩu nha!"); return; }

    

    if (isSignUpMode) {

        if (!displayName) { alert("Chưa nhập biệt danh kìa bạn ơi!"); return; }

        createUserWithEmailAndPassword(auth, email, password)

            .then((userCredential) => {

                const user = userCredential.user;

                return updateProfile(user, { displayName: displayName }).then(() => {

                    const userRef = ref(db, 'users/' + user.uid);

                    return set(userRef, { displayName: displayName, email: email, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" });

                });

            })

            .then(() => { alert("Đăng ký thành công mỹ mãn!"); closeAuthModal(); })

            .catch(err => alert("Lỗi đăng ký: " + err.message));

    } else {

        signInWithEmailAndPassword(auth, email, password)

            .then(() => { alert("Chị đăng nhập thành công rồi đoá 🌸!"); closeAuthModal(); })

            .catch(err => alert("Lỗi đăng nhập: " + err.message));

    }

};



window.handleForgotPassword = function() {

    const email = document.getElementById('authEmail').value.trim();

    if (!email) { alert("Hãy nhập Email của bạn vào ô trên rồi bấm lại nút này để nhận link reset nha!"); return; }

    sendPasswordResetEmail(auth, email)

        .then(() => alert("Hệ thống đã gửi link đổi mật khẩu vào mail của bạn. Check hộp thư nha!"))

        .catch(err => alert("Lỗi gửi mail: " + err.message));

};



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



// --- QUẢN LÝ THÀNH VIÊN, CHỌN AVATAR VÀ TỦ SÁCH CÁ NHÂN ---

// 👉 HÀM RENDER RA BẢNG 12 AVATAR ANIME SIÊU XINH TRONG HỒ SƠ CÁ NHÂN

function renderAvatarSelectionGrid() {

    const container = document.getElementById('avatarGridContainer');

    if (!container) return;



    // Danh sách 12 Link Avatar Anime ngẫu nhiên xinh xắn cho độc giả chọn

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



function renderUserProfileData(user) {

    const pName = document.getElementById('userProfileName'); 

    const pEmail = document.getElementById('userProfileEmail'); 

    const dInput = document.getElementById('editDisplayNameInput');

    

    if (pName) pName.innerText = user.displayName || "Thành Viên Động";

    if (pEmail) pEmail.innerText = user.email;

    if (dInput) dInput.value = user.displayName || "";

    

    // Tạo bảng chọn ảnh có sẵn ngay khi load hồ sơ

    renderAvatarSelectionGrid();

    

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



// 👉 HÀM LƯU HỒ SƠ - LƯU THẲNG URL AVATAR ĐÃ CHỌN VÀO REALTIME DATABASE

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

        alert("Cập nhật hồ sơ và ảnh đại diện hoạt hình thành công mỹ mãn! 🌸");

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

    if (document.getElementById('profileSection')) document.getElementById('profileSection').style.display = 'none'; 

    if (document.getElementById('homeMainContent')) document.getElementById('homeMainContent').style.display = 'block'; 

};



// --- HỆ THỐNG TÌM KIẾM TRUYỆN NHANH (KHỚP THEO DATA THẬT) ---

window.triggerSearch = function() {

    const query = document.getElementById('searchInput').value.trim().toLowerCase(); 

    if (!query) { alert("Nhập từ khóa trước khi bấm tìm Chị nha!"); return; }

    

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

        timestamp: Date.now()

    }).then(() => {

        alert("Đã phát hành chương mới thành công rực rỡ! 🚀"); 

        if (typeof closeAdminModal === "function") closeAdminModal();

        document.getElementById('adminChapterTitle').value = ""; 

        document.getElementById('adminChapterContent').value = "";

    }).catch(err => alert("Lỗi đăng chương rồi chị ơi: " + err.message));

};



window.closeAdminModal = function() {

    const adminModal = document.getElementById('adminModal');

    if (adminModal) adminModal.style.display = 'none';

};



window.closeAdminModalOverlay = function(e) {

    if (e.target.id === 'adminModal') closeAdminModal();

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

// --- HÀM TỰ ĐỘNG CẬP NHẬT MENU TÁC GIẢ VÀ THỂ LOẠI TỪ FIREBASE ---

function updateFilterMenusAutomatically(listBooks) {

    const authorMenu = document.getElementById('authorMenu');

    const tagMenu = document.getElementById('tagMenu');



    // 1. Lấy danh sách Tác giả không trùng lặp

    const authors = [...new Set(listBooks.map(b => b.author).filter(a => a))];

    if (authorMenu) {

        authorMenu.innerHTML = authors.map(author => 

            `<span class="author-item" onclick="filterByAuthor('${author}')">${author}</span>`

        ).join('');

    }



    // 2. Lấy danh sách Thể loại không trùng lặp

    const allTags = new Set();

    listBooks.forEach(b => {

        if (b.tags && Array.isArray(b.tags)) {

            b.tags.forEach(tag => allTags.add(tag));

        }

    });

    

    if (tagMenu) {

        tagMenu.innerHTML = [...allTags].map(tag => 

            `<span class="tag-item" onclick="filterByTag('${tag}')">${tag}</span>`

        ).join('');

    }

}



// Hàm lọc Tác giả

window.filterByAuthor = function(authorName) {

    const filtered = globalListBooks.filter(b => b.author === authorName);

    renderBookGrid(filtered);

    document.getElementById('authorDropdownBtn').innerHTML = `${authorName} <i class="fa-solid fa-caret-down"></i>`;

    document.getElementById('authorMenu').style.display = 'none';

};



// Hàm lọc Thể loại

window.filterByTag = function(tagName) {

    const filtered = globalListBooks.filter(b => b.tags && b.tags.includes(tagName));

    renderBookGrid(filtered);

    document.getElementById('tagDropdownBtn').innerHTML = `${tagName} <i class="fa-solid fa-caret-down"></i>`;

    document.getElementById('tagMenu').style.display = 'none';

};

// Thêm hàm này vào cuối file index.js

window.toggleAdminPanel = function() {

    const adminPanel = document.getElementById('adminPanel');

    if (!adminPanel) return;


