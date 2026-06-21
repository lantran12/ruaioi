import { db, auth, ref, push, onChildAdded, onAuthStateChanged } from "./firebase.js";
import { set, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// 1. Kiểm tra đăng nhập (Chỉ Chị Trân mới được vào Studio)
onAuthStateChanged(auth, (user) => {
    if (user && user.uid === 'BrZQ9s07ujfIYG1iPtC4vIhGgx33') {
        loadAdminStoryList(); // Tải danh sách truyện
    } else {
        alert("Chị không có quyền vào đây!");
        window.location.href = "index.html";
    }
});

// 2. Hàm Đăng truyện mới (Đã sửa để dùng ID tự chọn)
async function handleCreateStory() {
    // 1. Lấy thêm cái ID viết liền không dấu do chị tự đặt
    const customId = document.getElementById('idInput').value.trim().toLowerCase(); 
    
    const title = document.getElementById('titleInput').value;
    const author = document.getElementById('authorInput').value;
    const status = document.getElementById('statusSelect').value;
    const cover = document.getElementById('coverInput').value; // URL ảnh
    const description = document.getElementById('descInput').value;

    // Kiểm tra xem chị đã nhập ID chưa
    if (!customId) {
        alert("Chị Trân ơi, chị chưa nhập ID viết liền không dấu kìa (ví dụ: zombie, kiss)!");
        return;
    }

    // THAY ĐỔI QUAN TRỌNG: Dùng ref thẳng đến tên ID đó, bỏ hàm push() đi
    const newStoryRef = ref(db, `stories/${customId}`);
    
    await set(newStoryRef, {
        title, author, status, cover, description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        views: 0
    });

    alert(`🎉 Đăng truyện thành công với ID là: ${customId}`);
    
    // Xóa chữ trong ô nhập ID sau khi đăng xong
    document.getElementById('idInput').value = "";
}

// 3. Hiển thị danh sách truyện
function loadAdminStoryList() {
    const listContainer = document.getElementById('adminStoryList');
    const storiesRef = ref(db, 'stories');

    onChildAdded(storiesRef, (snapshot) => {
        const story = snapshot.val();
        const id = snapshot.key;
        
        const item = document.createElement('div');
        item.style = "padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fff; margin-bottom: 10px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);";
        item.innerHTML = `
            <div>
                <h4 style="margin: 0; font-size: 16px;">${story.title}</h4>
                <small style="color: #777;">Tác giả: ${story.author}</small>
            </div>
            <button onclick="window.location.href='edit-story.html?id=${id}'" 
                    style="background: #ff4d6d; color: white; border: none; padding: 8px 15px; border-radius: 20px; font-size: 12px; cursor: pointer;">
                Sửa
            </button>
        `;
        listContainer.appendChild(item);
    });
}

// Gán hàm vào window để HTML gọi được
window.handleCreateStory = handleCreateStory;
