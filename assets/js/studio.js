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
    const editor = document.getElementById('editorInput').value; // Lấy giá trị mới
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
        editor, 
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
    document.getElementById('editorInput').value = ""; // Thêm dòng này
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
            document.getElementById('editorInput').value = story.editor || ""; 
            document.getElementById('coverInput').value = story.cover || "";
            document.getElementById('descInput').value = story.description || "";
            document.getElementById('statusSelect').value = story.status || "Đang cập nhật";

        
            // Điền Note (Nếu chị có input id="editorNote")
            if (document.getElementById('editorNote')) {
                document.getElementById('editorNote').value = story.editorNote || "";
            }
openManageChapterModal(id, story.title);
            
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
    delete document.getElementById('modalStoryId').dataset.editingChapter; // Xóa trạng thái sửa
    // Reset form nếu cần
    document.getElementById('singleChapterNumber').value = "";
    document.getElementById('singleChapterTitle').value = "";
    document.getElementById('singleContent').value = "";
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



window.handleConfirmUpload = function() {
    const isSingle = document.getElementById('tab-single').style.display !== 'none';
    const storyId = document.getElementById('modalStoryId').value;
    
    // Kiểm tra xem có đang sửa chương cũ không (dựa vào dataset em đã bảo chị thêm)
    const editingChapterId = document.getElementById('modalStoryId').dataset.editingChapter;
    
    if (isSingle) {
        const num = document.getElementById('singleChapterNumber').value;
        const name = document.getElementById('singleChapterTitle').value;
        const content = document.getElementById('singleContent').value;
        
        if (!num || !name || !content) return alert("Chị điền đủ các ô nhé!");
        
        // Nếu ĐANG SỬA CHƯƠNG CŨ
        if (editingChapterId) {
            const formattedNum = String(num).padStart(3, '0');
            const chapterKey = `chuong_${formattedNum}`;
            const chapterRef = ref(db, `chapters/${storyId}/${chapterKey}`);
            
            update(chapterRef, {
                title: `Chương ${num}: ${name}`,
                content: content,
                updatedAt: Date.now()
            }).then(() => {
                alert("✅ Đã cập nhật chương thành công!");
                closePostModal();
            });
        } 
        // Nếu ĐĂNG MỚI
        else {
            saveChapterToFirebase(storyId, num, `Chương ${num}: ${name}`, content);
        }
    } else {
        // Đăng hàng loạt (vẫn giữ nguyên như cũ)
        if (!window.bulkData || window.bulkData.length === 0) return alert("Chị chưa chọn file hoặc file trống!");
        
        window.bulkData.forEach((chapter, index) => {
            const num = index + 1;
            const lines = chapter.trim().split('\n');
            const title = lines[0];
            const content = lines.slice(1).join('\n');
            
            saveChapterToFirebase(storyId, num, title, content, true); 
        });
        
        alert("Đã bắt đầu đăng toàn bộ chương lên!");
        closePostModal();
    }
};

// Thêm tham số 'chapterNumber' vào hàm
// Thêm tham số 'isBulk' (mặc định là false)
// --- HÀM CẬP NHẬT: THÊM PHẦN ĐỒNG BỘ VỚI TRANG CHỦ ---
function saveChapterToFirebase(storyId, chapterNumber, title, content, isBulk = false) {
    const formattedNum = String(chapterNumber).padStart(3, '0');
    const chapterKey = `chuong_${formattedNum}`; 
    
    const chapterRef = ref(db, `chapters/${storyId}/${chapterKey}`);
    
    set(chapterRef, {
        title: title,
        content: content,
        createdAt: Date.now(),
        updatedAt: Date.now()
    }).then(() => {
        // --- ĐÂY LÀ PHẦN ĐỒNG BỘ QUAN TRỌNG ---
        // Mỗi khi đăng chương, nó sẽ cập nhật tên chương vào nhánh 'stories'
        // Trang chủ index.js của chị đang lắng nghe nhánh này, nên nó sẽ tự cập nhật ngay!
        update(ref(db, `stories/${storyId}`), {
            latestChapterTitle: title, // Lưu tên chương (Ví dụ: Chương 01: Tên chương)
            updatedAt: Date.now()      // Cập nhật thời gian để truyện nhảy lên đầu trang chủ
        });
        // ------------------------------------

        if (!isBulk) {
            alert("Đã đăng xong: " + chapterKey);
            closePostModal();
            // Reset form
            document.getElementById('singleChapterNumber').value = "";
            document.getElementById('singleChapterTitle').value = "";
            document.getElementById('singleContent').value = "";
        }
    }).catch(error => {
        alert("Lỗi rồi chị ơi: " + error.message);
    });
}
window.processBulkFile = function() {
    const fileInput = document.getElementById('bulkFileInput');
    const previewContainer = document.getElementById('bulkPreview');
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(loadEvent) {
        const arrayBuffer = loadEvent.target.result;
        
        // Dùng Mammoth để đọc .docx sạch đẹp
        mammoth.extractRawText({arrayBuffer: arrayBuffer})
            .then(result => {
                const text = result.value;
                // Regex: Tìm các dòng bắt đầu bằng "Chương" và số
                // Dấu (?=...) là để giữ lại tiêu đề khi split
                const chapters = text.split(/(?=Chương\s+\d+[:\s])/i);
                
                previewContainer.innerHTML = "";
                chapters.forEach((content, index) => {
                    if (content.trim().length > 0) {
                        const div = document.createElement('div');
                        div.style = "padding: 8px; border-bottom: 1px solid #eee; font-size: 13px;";
                        // Lấy dòng đầu làm tên chương
                        const title = content.split('\n')[0]; 
                        div.innerHTML = `✅ <b>${title}</b>`;
                        previewContainer.appendChild(div);
                    }
                });
                window.bulkData = chapters;
            })
            .catch(err => alert("Lỗi đọc file: " + err));
    };
    reader.readAsArrayBuffer(file);
};
// 1. Hàm mở Modal Quản lý chương (Gọi khi bấm "Sửa" hoặc thêm một nút riêng)
window.openManageChapterModal = function(storyId, storyTitle) {
    const modal = document.getElementById('manageChapterModal');
    const listContainer = document.getElementById('listChapterContainer');
    document.getElementById('modalManageTitle').innerText = "Quản lý chương: " + storyTitle;
    
    listContainer.innerHTML = "Đang tải chương...";
    modal.style.display = 'flex';

    // Lấy danh sách chương từ Firebase
    const chaptersRef = ref(db, `chapters/${storyId}`);
    get(chaptersRef).then((snapshot) => {
        listContainer.innerHTML = ""; // Xóa loading
        if (!snapshot.exists()) {
            listContainer.innerHTML = "Truyện này chưa có chương nào.";
            return;
        }

        snapshot.forEach((child) => {
            const chapter = child.val();
            const chapterId = child.key;
            
            const div = document.createElement('div');
            div.style = "display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee;";
            div.innerHTML = `
                <span>${chapter.title}</span>
                <div>
                    <button onclick="editChapter('${storyId}', '${chapterId}')" style="background:#fff3bf; border:none; padding:5px 10px; border-radius:10px; cursor:pointer;">Sửa</button>
                    <button onclick="deleteChapter('${storyId}', '${chapterId}')" style="background:#ffdede; color:red; border:none; padding:5px 10px; border-radius:10px; cursor:pointer;">Xóa</button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    });
};

// 2. Hàm xóa chương
window.deleteChapter = function(storyId, chapterId) {
    if(confirm("Chị có chắc muốn xóa chương này không?")) {
        remove(ref(db, `chapters/${storyId}/${chapterId}`)).then(() => {
            alert("Đã xóa!");
            openManageChapterModal(storyId, "Đang tải lại..."); // Refresh danh sách
        });
    }
};
window.editChapter = function(storyId, chapterId) {
    const chapterRef = ref(db, `chapters/${storyId}/${chapterId}`);
    get(chapterRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // 1. Mở Modal
            openPostModal(storyId, "Đang sửa: " + data.title);
            
            // 2. Bóc tách dữ liệu:
            // Lấy số chương: Tìm các chữ số nằm sau chữ "Chương" (không phân biệt hoa thường)
            const numMatch = data.title.match(/Chương\s*(\d+)/i);
            const chapterNum = numMatch ? numMatch[1] : ""; 
            
            // Lấy tên chương: Xóa bỏ đoạn "Chương X: " ở đầu đi
            const chapterTitle = data.title.replace(/Chương\s*\d+[:\s]*/i, "");

            // 3. Đổ dữ liệu vào các ô Input
            document.getElementById('singleChapterNumber').value = chapterNum; // Cái này hồi nãy thiếu nè chị
            document.getElementById('singleChapterTitle').value = chapterTitle;
            document.getElementById('singleContent').value = data.content;
            
            // 4. Đánh dấu chế độ Sửa
            document.getElementById('modalStoryId').dataset.editingChapter = chapterId;
        }
    });
};
