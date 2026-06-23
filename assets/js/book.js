import { db } from "./firebase.js"; // Chị nhớ import db từ file của chị
import { ref, get, query, orderByChild } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const params = new URLSearchParams(window.location.search);
const storyId = params.get('id');

async function loadBookData() {
    if (!storyId) return;

    // 1. Lấy thông tin truyện từ nhánh 'stories'
    const storyRef = ref(db, `stories/${storyId}`);
    const storySnap = await get(storyRef);

    if (storySnap.exists()) {
        const s = storySnap.val();
        document.getElementById('storyTitle').innerText = s.title;
        document.getElementById('storyAuthor').innerText = s.author || "Chưa có";
        document.getElementById('storyEditor').innerText = s.editor || "Chưa có";
        document.getElementById('storyDesc').innerText = s.description || "Chưa có mô tả.";
        document.getElementById('storyCover').src = s.cover || "placeholder.jpg";

        // Hiển thị thể loại
        const genreDiv = document.getElementById('storyGenres');
        if (s.genres) {
            genreDiv.innerHTML = s.genres.map(g => `<span class="tag">${g}</span>`).join(' ');
        }
    }

    // 2. Lấy danh sách chương từ nhánh 'chapters/{storyId}'
    // Em dùng orderByChild('createdAt') để nó tự sắp xếp theo thứ tự đăng
    const chaptersRef = ref(db, `chapters/${storyId}`);
    const chaptersSnap = await get(chaptersRef);
    const listDiv = document.getElementById('chapterList');
    listDiv.innerHTML = "";

    if (chaptersSnap.exists()) {
        const chapters = [];
        chaptersSnap.forEach(child => {
            chapters.push({ id: child.key, ...child.val() });
        });

        // Sắp xếp lại cho chắc chắn (theo ID hoặc theo thời gian)
        chapters.sort((a, b) => a.createdAt - b.createdAt);

        chapters.forEach(ch => {
            listDiv.innerHTML += `
                <a href="read.html?truyen=${storyId}&id=${ch.id}" class="chapter-link">
                    ${ch.title}
                </a>
            `;
        });
    } else {
        listDiv.innerHTML = "<p>Chưa có chương nào được đăng.</p>";
    }
}

loadBookData();
