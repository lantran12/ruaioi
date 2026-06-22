import { db, auth, ref, push, onChildAdded, onAuthStateChanged, remove } from "./firebase.js";
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

// 2. Hàm Đăng truyện mới (Đã thêm phần lấy thể loại)
async function handleCreateStory() {
    const customId = document.getElementById('idInput').value.trim().toLowerCase(); 
    const title = document.getElementById('titleInput').value;
    const author = document.getElementById('authorInput').value;
    const status = document.getElementById('statusSelect').value;
    const cover = document.getElementById('coverInput').value;
    const description = document.getElementById('descInput').value;

    // Lấy danh sách thể loại đã chọn từ Modal
    const selectedGenres = [];
    document.querySelectorAll('#genreModalContainer input:checked').forEach(cb => {
        selectedGenres.push(cb.value);
    });

    if (!customId) {
        alert("Chị Trân ơi, chị chưa nhập ID viết liền không dấu kìa (ví dụ: zombie, kiss)!");
        return;
    }

    const newStoryRef = ref(db, `stories/${customId}`);
    
    // Gửi dữ liệu lên Firebase, bao gồm cả mảng genres
    await set(newStoryRef, {
        title, 
        author, 
        status, 
        cover, 
        description,
        genres: selectedGenres, // Dòng này sẽ đẩy thể loại lên Firebase
        createdAt: Date.now(),
        updatedAt: Date.now(),
        views: 0
    });

    alert(`🎉 Đăng truyện thành công với ID là: ${customId}`);
    
    // Xóa trắng các ô nhập sau khi đăng thành công
    document.getElementById('idInput').value = "";
    document.getElementById('titleInput').value = "";
    document.getElementById('authorInput').value = "";
    document.getElementById('coverInput').value = "";
    document.getElementById('descInput').value = "";
    document.getElementById('selectedGenresText').innerText = "Chọn thể loại...";
    // Bỏ tích các checkbox sau khi đăng
    document.querySelectorAll('#genreModalContainer input:checked').forEach(cb => cb.checked = false);
}
// 3. Hiển thị danh sách truyện (Đã bổ sung nút Xóa và Đăng chương)
function loadAdminStoryList() {
    const listContainer = document.getElementById('adminStoryList');
    const storiesRef = ref(db, 'stories');

    onChildAdded(storiesRef, (snapshot) => {
        const story = snapshot.val();
        const id = snapshot.key;
        
        const item = document.createElement('div');
        item.id = `story-${id}`; 
        item.style = "padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fff; margin-bottom: 10px; border-radius: 12px;";
        
        item.innerHTML = `
            <div>
                <h4 style="margin: 0; font-size: 16px;">${story.title}</h4>
                <small style="color: #777;">ID: ${id}</small>
            </div>
            <div style="display: flex; gap: 5px;">
                <button onclick="editStory('${id}')" 
                        style="background: #fff3bf; border: none; padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer;">
                    Sửa
                </button>
                <button onclick="deleteStory('${id}')" 
                        style="background: #ffdede; color: #d90429; border: none; padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer;">
                    Xóa
                </button>
                <button onclick="alert('Tính năng đăng chương cho truyện: ${story.title}')" 
                        style="background: #e0f2f1; color: #00796b; border: none; padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer;">
                    Đăng chương
                </button>
            </div>
        `;
        listContainer.appendChild(item);
    }); 
}

// Hàm làm mới form
function resetForm() {
    document.getElementById('idInput').value = "";
    document.getElementById('titleInput').value = "";
    document.getElementById('authorInput').value = "";
    document.getElementById('coverInput').value = "";
    document.getElementById('descInput').value = "";
    document.getElementById('editorNote').value = "";
    document.getElementById('selectedGenresText').innerText = "Chọn thể loại...";
    
    // Bỏ tích tất cả các checkbox
    document.querySelectorAll('#genreModalContainer input:checked').forEach(cb => cb.checked = false);
}

// Gán vào window để HTML gọi được
window.handleCreateStory = handleCreateStory;
window.resetForm = resetForm;

// --- BỔ SUNG: HÀM ĐỔ DANH SÁCH TRUYỆN VÀO SELECT (Dùng cho tab Đăng chương) ---
window.loadStoryListForSelect = function() {
    const select = document.getElementById('storySelect');
    if (!select) return;

    // Reset danh sách trước khi load (tránh bị trùng nếu bấm nhiều lần)
    select.innerHTML = '<option value="">-- Chọn truyện để đăng chương --</option>';

    const storiesRef = ref(db, 'stories');
    get(storiesRef).then((snapshot) => {
        if (!snapshot.exists()) return;

        snapshot.forEach((childSnapshot) => {
            const story = childSnapshot.val();
            const option = document.createElement('option');
            option.value = childSnapshot.key; // ID truyện
            option.textContent = story.title;  // Tên truyện
            select.appendChild(option);
        });
    });
};

// --- BỔ SUNG: HÀM XỬ LÝ KHI BẤM ĐĂNG TẢI CHƯƠNG ---
window.handleUploadContent = function() {
    const storyId = document.getElementById('storySelect').value;
    const fileInput = document.getElementById('fileInput');

    if (!storyId) {
        alert("Chị ơi, chị chọn truyện trước nhé! 🐢");
        return;
    }
    if (fileInput.files.length === 0) {
        alert("Chị chưa chọn file nội dung (.txt, .docx) kìa! 🐢");
        return;
    }

    // Ở đây sau này chị sẽ code xử lý đọc file
    // Chị có thể dùng FileReader để đọc nội dung file .txt
    console.log("Đang chuẩn bị đăng chương cho truyện ID:", storyId);
    alert("Đang xử lý file cho truyện: " + storyId + ". Chị đợi xíu nhé...");
};

window.editStory = function(id) {
    const storyRef = ref(db, 'stories/' + id);
    
    get(storyRef).then((snapshot) => {
        if (snapshot.exists()) {
            const story = snapshot.val();
            
            // 1. Điền dữ liệu vào form
            document.getElementById('idInput').value = id;
            document.getElementById('idInput').readOnly = true; // Khóa ID không cho sửa
            document.getElementById('titleInput').value = story.title || "";
            document.getElementById('authorInput').value = story.author || "";
            document.getElementById('coverInput').value = story.cover || "";
            document.getElementById('descInput').value = story.description || "";
            document.getElementById('statusSelect').value = story.status || "Đang cập nhật";
            
            // 2. Cuộn lên đầu trang để chị thấy form
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // 3. Đổi nút "Đăng tải" thành "Cập nhật" (nếu cần)
            // Hoặc đơn giản là dùng hàm handleCreateStory để cập nhật luôn
            alert("Đã tải dữ liệu truyện: " + story.title + ". Chị có thể sửa rồi nhấn Đăng tải để cập nhật!");
        }
    });
};
// Hàm Xóa truyện
window.deleteStory = function(id) {
    if (confirm("Chị Trân ơi, chị có chắc muốn xóa truyện này không? (Không thể hoàn tác đâu ạ!)")) {
        remove(ref(db, 'stories/' + id)).then(() => {
            const el = document.getElementById(`story-${id}`);
            if (el) el.remove();
            alert("Đã xóa truyện thành công!");
        });
    }
};
