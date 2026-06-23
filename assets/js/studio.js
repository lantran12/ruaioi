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

// 2. Hàm Đăng/Cập nhật truyện (Đã nâng cấp)
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

    // Kiểm tra xem đang ở chế độ Sửa (readOnly) hay Đăng mới
    const isEditing = document.getElementById('idInput').readOnly;
    const storyRef = ref(db, `stories/${customId}`);
    
    // Dữ liệu sẽ gửi lên
    const storyData = {
        title, 
        author, 
        status, 
        cover, 
        description,
        genres: selectedGenres,
        updatedAt: Date.now()
    };

    if (isEditing) {
        // NẾU LÀ SỬA: Dùng update để không làm thay đổi các trường quan trọng như createdAt/views
        await update(storyRef, storyData);
        alert("✅ Đã cập nhật truyện thành công!");
        document.getElementById('idInput').readOnly = false; // Mở khóa ID sau khi sửa xong
    } else {
        // NẾU LÀ ĐĂNG MỚI: Dùng set để khởi tạo dữ liệu mới
        await set(storyRef, { 
            ...storyData, 
            createdAt: Date.now(), 
            views: 0 
        });
        alert(`🎉 Đăng truyện thành công với ID là: ${customId}`);
    }

    // Tải lại danh sách để cập nhật giao diện
    loadAdminStoryList();
    
    // Xóa trắng các ô nhập sau khi hoàn tất
    document.getElementById('idInput').value = "";
    document.getElementById('titleInput').value = "";
    document.getElementById('authorInput').value = "";
    document.getElementById('coverInput').value = "";
    document.getElementById('descInput').value = "";
    document.getElementById('editorNote').value = "";
    document.getElementById('selectedGenresText').innerText = "Chọn thể loại...";
    document.querySelectorAll('#genreModalContainer input:checked').forEach(cb => cb.checked = false);
}
// 3. Hiển thị danh sách truyện (Đã bổ sung nút Xóa và Đăng chương)
function loadAdminStoryList() {
    const listContainer = document.getElementById('adminStoryList');
    listContainer.innerHTML = "";
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
                
                <button onclick="openPostModal('${id}', '${story.title}')" 
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

window.editStory = function(id) {
    const storyRef = ref(db, 'stories/' + id);
    
    get(storyRef).then((snapshot) => {
        if (snapshot.exists()) {
            const story = snapshot.val();
            
            // 1. Điền các ô Text và Select
            document.getElementById('idInput').value = id;
            document.getElementById('idInput').readOnly = true; // Khóa ID
            document.getElementById('titleInput').value = story.title || "";
            document.getElementById('authorInput').value = story.author || "";
            document.getElementById('coverInput').value = story.cover || "";
            document.getElementById('descInput').value = story.description || "";
            document.getElementById('statusSelect').value = story.status || "Đang cập nhật";
            
            // Điền Note (Nếu chị có input id="editorNote")
            if (document.getElementById('editorNote')) {
                document.getElementById('editorNote').value = story.editorNote || "";
            }
            
            // 2. XỬ LÝ CHECKBOX THỂ LOẠI
            // Bỏ tích tất cả trước
            document.querySelectorAll('#genreModalContainer input').forEach(cb => cb.checked = false);
            
            // Nếu truyện có lưu thể loại thì tích vào các ô tương ứng
            if (story.genres && Array.isArray(story.genres)) {
                story.genres.forEach(genreValue => {
                    const cb = document.querySelector(`#genreModalContainer input[value="${genreValue}"]`);
                    if (cb) cb.checked = true;
                });
                // Cập nhật text hiển thị (nếu chị có dùng nó)
                const textDisplay = document.getElementById('selectedGenresText');
                if (textDisplay) {
                    textDisplay.innerText = "Đã chọn: " + story.genres.join(", ");
                }
            }
            
            // 3. Cuộn lên đầu trang
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
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
// 1. Hàm mở Popup Đăng chương
window.openPostModal = function(id, title) {
    const modal = document.getElementById('postChapterModal');
    const inputId = document.getElementById('modalStoryId');
    const titleText = document.getElementById('modalStoryTitle');

    // Gán ID và Tên truyện vào Popup
    inputId.value = id;
    titleText.innerText = "Đang đăng chương cho: " + title;

    // Hiển thị Popup
    modal.style.display = 'flex';
};

// 2. Hàm đóng Popup
window.closePostModal = function() {
    document.getElementById('postChapterModal').style.display = 'none';
};

// 3. Cập nhật lại hàm xử lý đăng (Lưu ý: Em đổi id thành chapterFileInput cho khớp với HTML của chị)
window.handleUploadContent = function() {
    const storyId = document.getElementById('modalStoryId').value;
    const fileInput = document.getElementById('chapterFileInput');
    const file = fileInput.files[0];

    if (!storyId || !file) {
        alert("Chị ơi, kiểm tra lại ID hoặc File nhé!");
        return;
    }

    const reader = new FileReader();

    // 1. Nếu là file .txt
    if (file.name.endsWith('.txt')) {
        reader.onload = function(e) {
            saveToFirebase(storyId, e.target.result);
        };
        reader.readAsText(file, "UTF-8");
    } 
    // 2. Nếu là file .docx
    else if (file.name.endsWith('.docx')) {
        reader.onload = function(loadEvent) {
            const arrayBuffer = loadEvent.target.result;
            mammoth.extractRawText({arrayBuffer: arrayBuffer})
                .then(result => {
                    saveToFirebase(storyId, result.value);
                })
                .catch(err => alert("Lỗi đọc file Word: " + err));
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("Chỉ hỗ trợ file .txt hoặc .docx thôi chị nha!");
    }
};

// Hàm phụ để đẩy lên Firebase
function saveToFirebase(storyId, content) {
    // Thay đổi đường dẫn này theo cấu trúc Firebase của chị
    const newChapterRef = push(ref(db, 'chapters/' + storyId));
    set(newChapterRef, {
        content: content,
        createdAt: Date.now(),
        // Chị có thể thêm tên chương ở đây nếu muốn
    }).then(() => {
        alert("Đăng chương thành công! 🐢");
        closePostModal();
    });
}
window.switchModalTab = function(type) {
    document.getElementById('tab-single').style.display = (type === 'single') ? 'block' : 'none';
    document.getElementById('tab-bulk').style.display = (type === 'bulk') ? 'block' : 'none';
    
    document.getElementById('btn-single').className = (type === 'single') ? 'btn-action btn-primary' : 'btn-action btn-reset';
    document.getElementById('btn-bulk').className = (type === 'bulk') ? 'btn-action btn-primary' : 'btn-action btn-reset';
};

// Hàm xử lý khi bấm xác nhận đăng
window.handleConfirmUpload = function() {
    const isSingle = document.getElementById('tab-single').style.display !== 'none';
    const storyId = document.getElementById('modalStoryId').value;
    
    if (isSingle) {
        // Tab Đăng lẻ
        const title = document.getElementById('singleChapterName').value;
        const content = document.getElementById('singleContent').value;
        if (!title || !content) return alert("Chị điền đủ tên và nội dung nhé!");
        saveChapterToFirebase(storyId, title, content);
    } else {
        // Tab Import hàng loạt (Chưa code thuật toán tách chương)
        const fileInput = document.getElementById('bulkFileInput');
        if (fileInput.files.length === 0) return alert("Chị chưa chọn file kìa!");
        alert("Đang xử lý import hàng loạt... (Đang hoàn thiện)");
    }
};

function saveChapterToFirebase(storyId, title, content) {
    // Đẩy lên Firebase
    push(ref(db, 'chapters/' + storyId), {
        title: title,
        content: content,
        createdAt: Date.now(),
        updatedAt: Date.now() // Thêm thời gian cập nhật
    }).then(() => {
        alert("Đăng chương thành công!");
        closePostModal();
        // Xóa trắng form sau khi đăng
        document.getElementById('singleChapterName').value = "";
        document.getElementById('singleContent').value = "";
    }).catch(error => {
        alert("Có lỗi xảy ra: " + error.message);
    });
}
// --- 1. Hàm tách chương tự động (Dành cho Import hàng loạt) ---
// Giả sử tên chương của Chị có định dạng "Chương 1", "Chương 01", "Chương I"
window.processBulkFile = function() {
    const fileInput = document.getElementById('bulkFileInput');
    const previewContainer = document.getElementById('bulkPreview');
    const file = fileInput.files[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        
        // Regex này sẽ tách nội dung mỗi khi gặp từ "Chương" và một số theo sau
        // Ví dụ: Chương 1, Chương 01, Chương 123
        const chapters = text.split(/(?=Chương\s+\d+)/i);
        
        previewContainer.innerHTML = ""; // Xóa dữ liệu cũ
        chapters.forEach((content, index) => {
            if (content.trim().length > 0) {
                const div = document.createElement('div');
                div.style = "padding: 10px; border-bottom: 1px solid #eee; font-size: 13px;";
                div.innerHTML = `<strong>${content.substring(0, 30)}...</strong> (Độ dài: ${content.length})`;
                previewContainer.appendChild(div);
            }
        });
        
        window.bulkData = chapters; // Lưu tạm vào biến toàn cục để xác nhận đăng
        alert("Đã tách xong " + chapters.length + " chương. Chị kiểm tra xem đúng chưa nhé!");
    };
    reader.readAsText(file, "UTF-8");
};

// --- 2. Kết nối sự kiện chọn file vào hàm trên ---
document.getElementById('bulkFileInput').addEventListener('change', processBulkFile);
