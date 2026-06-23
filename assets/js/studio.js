import { db, auth, ref, onChildAdded, onAuthStateChanged, remove } from "./firebase.js";
import { set, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// 1. Kiểm tra quyền Admin
onAuthStateChanged(auth, (user) => {
    if (user && user.uid === 'BrZQ9s07ujfIYG1iPtC4vIhGgx33') {
        loadAdminStoryList();
    } else {
        alert("Chị không có quyền vào đây!");
        window.location.href = "index.html";
    }
});

// 2. Hàm lưu chương chuẩn (Tự động tạo chuong_x)
window.saveChapterToFirebase = function(storyId, title, content) {
    const match = title.match(/Chương\s+(\d+)/i);
    const chapterId = match ? `chuong_${parseInt(match[1])}` : `chuong_${Date.now()}`;

    set(ref(db, `chapters/${storyId}/${chapterId}`), {
        title: title,
        content: content,
        createdAt: Date.now(),
        updatedAt: Date.now()
    }).then(() => console.log("Đã đăng: " + chapterId))
      .catch(error => alert("Lỗi: " + error.message));
};

// 3. Hàm Đăng/Sửa truyện
window.handleCreateStory = async function() {
    const customId = document.getElementById('idInput').value.trim().toLowerCase();
    const title = document.getElementById('titleInput').value;
    const isEditing = document.getElementById('idInput').readOnly;
    
    if (!customId || !title) return alert("Chị ơi, điền ID và Tên truyện nha!");

    const storyData = {
        title,
        author: document.getElementById('authorInput').value,
        status: document.getElementById('statusSelect').value,
        cover: document.getElementById('coverInput').value,
        description: document.getElementById('descInput').value,
        updatedAt: Date.now()
    };

    await (isEditing ? update(ref(db, `stories/${customId}`), storyData) 
                     : set(ref(db, `stories/${customId}`), { ...storyData, createdAt: Date.now(), views: 0 }));
    
    alert("✅ Đã lưu truyện!");
    loadAdminStoryList();
    resetForm();
};

// 4. Hiển thị danh sách truyện
function loadAdminStoryList() {
    const listContainer = document.getElementById('adminStoryList');
    listContainer.innerHTML = "";
    onChildAdded(ref(db, 'stories'), (snapshot) => {
        const story = snapshot.val();
        const id = snapshot.key;
        const item = document.createElement('div');
        item.style = "padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;";
        item.innerHTML = `<div><h4>${story.title}</h4><small>ID: ${id}</small></div>
            <div>
                <button onclick="editStory('${id}')">Sửa</button>
                <button onclick="deleteStory('${id}')">Xóa</button>
                <button onclick="openPostModal('${id}', '${story.title}')">Đăng chương</button>
            </div>`;
        listContainer.appendChild(item);
    });
}

// 5. Các hàm bổ trợ (Sửa, Xóa, Popup)
window.editStory = function(id) {
    get(ref(db, 'stories/' + id)).then(snap => {
        if (snap.exists()) {
            const s = snap.val();
            document.getElementById('idInput').value = id;
            document.getElementById('idInput').readOnly = true;
            document.getElementById('titleInput').value = s.title;
        }
    });
};

window.deleteStory = function(id) {
    if (confirm("Chắc xóa không Chị?")) remove(ref(db, 'stories/' + id)).then(() => location.reload());
};

window.openPostModal = (id, title) => {
    document.getElementById('modalStoryId').value = id;
    document.getElementById('modalStoryTitle').innerText = "Đăng chương cho: " + title;
    document.getElementById('postChapterModal').style.display = 'flex';
};

window.closePostModal = () => document.getElementById('postChapterModal').style.display = 'none';

window.resetForm = () => {
    document.getElementById('idInput').value = "";
    document.getElementById('idInput').readOnly = false;
    document.getElementById('titleInput').value = "";
};

window.switchModalTab = function(type) {
    document.getElementById('tab-single').style.display = (type === 'single') ? 'block' : 'none';
    document.getElementById('tab-bulk').style.display = (type === 'bulk') ? 'block' : 'none';
};

// 6. Hàm xử lý đăng chương (Đơn lẻ & Hàng loạt)
window.handleConfirmUpload = function() {
    const storyId = document.getElementById('modalStoryId').value;
    const isSingle = document.getElementById('tab-single').style.display !== 'none';

    if (isSingle) {
        const num = document.getElementById('singleChapterNumber').value;
        const name = document.getElementById('singleChapterTitle').value;
        const content = document.getElementById('singleContent').value;
        saveChapterToFirebase(storyId, `Chương ${num}: ${name}`, content);
    } else {
        if (!window.bulkData) return alert("Chưa chọn file!");
        window.bulkData.forEach(item => saveChapterToFirebase(storyId, item.title, item.body));
    }
    alert("Đã xong!");
    closePostModal();
};

window.processBulkFile = function() {
    const file = document.getElementById('bulkFileInput').files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        mammoth.extractRawText({arrayBuffer: e.target.result}).then(res => {
            const chapters = res.value.split(/(?=Chương\s+\d+)/i);
            window.bulkData = chapters.map(c => ({ title: c.split('\n')[0].trim(), body: c.split('\n').slice(1).join('\n') }));
            document.getElementById('bulkPreview').innerHTML = "Đã chọn " + window.bulkData.length + " chương.";
        });
    };
    reader.readAsArrayBuffer(file);
};
