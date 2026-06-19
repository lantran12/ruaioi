import { db, ref } from "./firebase.js";
import { get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Khởi chạy các Dropdown ẩn hiện
    setupDropdowns();

    // 2. LẤY DATA THẬT TỪ FIREBASE VỀ
    const listBooks = await fetchStoriesFromFirebase();

    // 3. Hiển thị danh sách truyện (Đã sắp xếp mới nhất) và truyện đề cử (Random) bằng data thật
    renderBookGrid(listBooks);
    renderRandomFeatured(listBooks);

    // 4. Lắng nghe sự kiện bộ lọc Tag (Lọc động từ data thật)
    setupTagFilter(listBooks);
});

// --- HÀM LẤY DATA TỰ ĐỘNG TỪ FIREBASE VÀ SẮP XẾP MỚI NHẤT ---
async function fetchStoriesFromFirebase() {
    const storiesRef = ref(db, "stories");
    const loadedBooks = [];

    try {
        const snapshot = await get(storiesRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Duyệt qua từng bộ truyện trên Firebase
            for (let id in data) {
                const bookData = data[id];
                
                // --- TỰ ĐỘNG CẬP NHẬT SỐ CHƯƠNG ---
                let latestChapter = "Chương 0";
                const chaptersRef = ref(db, `comments/${id}`); 
                const chapterSnapshot = await get(chaptersRef);
                
                if (chapterSnapshot.exists()) {
                    const chapters = chapterSnapshot.val();
                    const totalChapters = Object.keys(chapters).length; 
                    latestChapter = `Chương ${totalChapters}`;
                }

                // Đẩy dữ liệu vào mảng (Lấy thời gian updatedAt hoặc timestamp, nếu không có mặc định là 0)
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

            // ✨ THẦN CHÚ: Sắp xếp truyện mới cập nhật (updatedAt lớn hơn) lên đầu danh sách
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

// --- HÀM RENDER TRUYỆN ĐỀ CỬ PREMIUM (GIỮ NGUYÊN RANDOM) ---
function renderRandomFeatured(listBooks) {
    const featuredCard = document.getElementById("featuredBook");
    if (!featuredCard || !listBooks || listBooks.length === 0) return;
    
    // Chọn ngẫu nhiên một bộ truyện bất kỳ để làm đề cử
    const randomIndex = Math.floor(Math.random() * listBooks.length);
    const book = listBooks[randomIndex];
    
    // Đổi cấu trúc ngoài cùng thành featured-card-premium chuẩn CSS
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
            
            // Đóng các menu khác
            closeAllMenusExcept("notiContent");
        });
    }

    handleDropdown("tagDropdownBtn", "tagMenu");
    handleDropdown("authorDropdownBtn", "authorMenu");

    // Click ra ngoài thì đóng sạch menu
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
        
        // Bấm nút này thì đóng nút kia
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

function setupTagFilter(listBooks) {
    // 1. XỬ LÝ LỌC THEO THỂ LOẠI (TAG)
    const tagItems = document.querySelectorAll(".tag-item");
    tagItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            const selectedTag = item.textContent.trim();
            const filteredBooks = listBooks.filter(book => book.tags && book.tags.includes(selectedTag));
            
            const tagBtn = document.getElementById("tagDropdownBtn");
            if (tagBtn) {
                tagBtn.innerHTML = `${selectedTag} <i class="fa-solid fa-caret-down"></i>`;
            }
            
            const tagMenu = document.getElementById("tagMenu");
            if (tagMenu) tagMenu.style.display = "none";
            
            renderBookGrid(filteredBooks);
        });
    });

    // 2. XỬ LÝ LỌC THEO TÁC GIẢ (AUTHOR) - ✨ Bổ sung đoạn này để sửa lỗi nút Tác giả
    const authorItems = document.querySelectorAll(".author-item");
    authorItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            const selectedAuthor = item.textContent.trim();
            // Lọc ra những truyện có tên tác giả trùng với tên vừa bấm
            const filteredBooks = listBooks.filter(book => book.author && book.author.trim() === selectedAuthor);
            
            const authorBtn = document.getElementById("authorDropdownBtn");
            if (authorBtn) {
                authorBtn.innerHTML = `${selectedAuthor} <i class="fa-solid fa-caret-down"></i>`;
            }
            
            const authorMenu = document.getElementById("authorMenu");
            if (authorMenu) authorMenu.style.display = "none";
            
            renderBookGrid(filteredBooks);
        });
    });
}
