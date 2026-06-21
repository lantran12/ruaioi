// studio.js - BẢN ĐẦY ĐỦ VÀ CHUYÊN NGHIỆP

// 1. Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBimiEGQcW9at2pOxfdUaJHjim2fmyjjcc",
    authDomain: "dongchanrua.firebaseapp.com",
    databaseURL: "https://dongchanrua-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dongchanrua",
    storageBucket: "dongchanrua.firebasestorage.app",
    messagingSenderId: "640115424540",
    appId: "1:640115424540:web:c9713b7921c09283150ed9"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 2. Chạy khi trang đã load xong
document.addEventListener('DOMContentLoaded', () => {
    loadStories(); // Tự động load danh sách truyện
});

// 3. Hàm lấy danh sách truyện từ Firebase
function loadStories() {
    const storyList = document.getElementById('storyList');
    db.ref('stories').on('value', (snapshot) => {
        storyList.innerHTML = `<div class="story-card add-new" onclick="showCreateForm()">+ Tạo truyện mới</div>`;
        
        snapshot.forEach((child) => {
            const data = child.val();
            const card = document.createElement('div');
            card.className = 'story-card';
            card.innerHTML = `
                <h3>${data.title}</h3>
                <p>${data.author || 'Chưa có tác giả'}</p>
                <div class="tags">
                    <span class="tag">${data.category || 'Đam Mỹ'}</span>
                </div>
            `;
            storyList.appendChild(card);
        });
    });
}

// 4. Hàm lưu truyện mới (kết nối với nút bấm trong form)
function saveStory() {
    const title = document.getElementById('storyTitle').value;
    const author = document.getElementById('storyAuthor').value;
    
    if(!title) return alert("Chị ơi, chưa nhập tên truyện!");

    db.ref('stories').push({
        title: title,
        author: author,
        timestamp: Date.now()
    }).then(() => {
        alert("Đã thêm truyện mới thành công!");
    });
}
