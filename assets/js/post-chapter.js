import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js";

// 1. Cấu hình Firebase (Chị thay bằng thông tin từ file config.js của chị)
const firebaseConfig = {
    // Copy đoạn config trong file config.js của chị vào đây
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. Lấy ID truyện từ URL (Ví dụ: post-chapter.html?id=zombie)
const urlParams = new URLSearchParams(window.location.search);
const storyId = urlParams.get('id');

// 3. Hàm Đăng chương lẻ
window.uploadChapter = async () => {
    const chapNum = document.getElementById('chapterNumber').value;
    const title = document.getElementById('chapterTitle').value;
    const content = quill.root.innerHTML;

    if (!chapNum || !title) return alert("Vui lòng điền đủ thông tin!");

    const chapterRef = ref(db, `stories/${storyId}/chapters/${chapNum}`);
    await set(chapterRef, {
        title: title,
        content: content,
        timestamp: Date.now()
    });
    alert("Đăng chương thành công!");
};

// 4. Load danh sách chương tự động
const listRef = ref(db, `stories/${storyId}/chapters`);
onValue(listRef, (snapshot) => {
    const listDiv = document.getElementById('chapterList');
    listDiv.innerHTML = ''; 
    const data = snapshot.val();
    
    if (data) {
        Object.keys(data).forEach(key => {
            const chap = data[key];
            const div = document.createElement('div');
            div.className = 'chapter-item';
            div.innerHTML = `
                <span>Chương ${key}: ${chap.title}</span>
                <div>
                    <button onclick="alert('Tính năng sửa chưa viết')">Sửa</button>
                    <button onclick="deleteChapter('${key}')" style="color:#ff4d6d">Xóa</button>
                </div>
            `;
            listDiv.appendChild(div);
        });
    }
});

// 5. Hàm Xóa
window.deleteChapter = (chapNum) => {
    if (confirm("Chắc chắn muốn xóa chương này?")) {
        remove(ref(db, `stories/${storyId}/chapters/${chapNum}`));
    }
};

// --- Ghi chú cho phần Import hàng loạt ---
// Phần import cần dùng thêm thư viện (như mammoth.js cho .docx)
// Chị muốn em làm chi tiết phần "Import hàng loạt" này luôn không?
