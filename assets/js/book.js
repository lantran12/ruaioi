import { db, ref, get } from "./firebase.js";

// Lấy ID truyện từ link: book.html?id=xyz
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('id');

async function loadBook() {
    if (!storyId) return;

    // 1. Lấy tên truyện
    const storySnap = await get(ref(db, 'stories/' + storyId));
    if (storySnap.exists()) {
        document.getElementById('storyTitle').innerText = storySnap.val().title;
    }

    // 2. Lấy danh sách chương
    const listDiv = document.getElementById('chapterList');
    const chaptersSnap = await get(ref(db, 'chapters/' + storyId));
    
    listDiv.innerHTML = "";
    if (chaptersSnap.exists()) {
        chaptersSnap.forEach((child) => {
            const chapter = child.val();
            const link = document.createElement('a');
            link.className = 'chapter-item';
            link.href = `read.html?storyId=${storyId}&chapterId=${child.key}`;
            link.innerText = chapter.title;
            listDiv.appendChild(link);
        });
    } else {
        listDiv.innerHTML = "<p>Truyện này chưa có chương nào.</p>";
    }
}

loadBook();
