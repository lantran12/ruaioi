// Cấu hình Firebase
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

// Load danh sách truyện khi trang khởi động
document.addEventListener('DOMContentLoaded', loadStories);

function loadStories() {
    const storyList = document.getElementById('storyList');
    db.ref('stories').on('value', (snapshot) => {
        // Luôn giữ thẻ tạo mới ở đầu
        storyList.innerHTML = `<div class="story-card add-new" onclick="showCreateForm()">+ Tạo truyện mới</div>`;
        
        snapshot.forEach((child) => {
            const data = child.val();
            const card = document.createElement('div');
            card.className = 'story-card';
            card.innerHTML = `
                <h3>${data.title}</h3>
                <p>${data.author || 'Chưa có tác giả'}</p>
                <span class="tag">${data.category || 'Chung'}</span>
            `;
            storyList.appendChild(card);
        });
    });
}

// Hàm điều khiển Form
function showCreateForm() {
    document.getElementById('createStoryModal').style.display = 'flex';
}

function hideCreateForm() {
    document.getElementById('createStoryModal').style.display = 'none';
}

// Hàm lưu dữ liệu
function saveStory() {
    const title = document.getElementById('storyTitle').value;
    const author = document.getElementById('storyAuthor').value;
    
    if(!title) return alert("Chị ơi, nhập tên truyện đi ạ!");

    db.ref('stories').push({
        title: title,
        author: author,
        createdAt: Date.now()
    }).then(() => {
        alert("Thêm truyện thành công!");
        hideCreateForm();
        document.getElementById('storyTitle').value = '';
        document.getElementById('storyAuthor').value = '';
    });
}
