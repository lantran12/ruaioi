import { db, auth, ref, onChildAdded, onAuthStateChanged, remove } from "./firebase.js";
import { set, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let importedChapters = [];
let currentStoryId = null;

// Kiểm tra quyền Admin
onAuthStateChanged(auth, (user) => {
    if (user && user.uid === "BrZQ9s07ujfIYG1iPtC4vIhGgx33") {
        loadAdminStoryList();
    } else {
        alert("Chị không có quyền vào đây!");
        window.location.href = "index.html";
    }
});

// Thêm hàm này vào để code không bị lỗi khi gọi
function loadAdminStoryList() {
    const list = document.getElementById("adminStoryList");
    if (!list) return;
    list.innerHTML = "";
    const storiesRef = ref(db, "stories");
    onChildAdded(storiesRef, (snapshot) => {
        const id = snapshot.key;
        const story = snapshot.val();
        const item = document.createElement("div");
        item.id = "story-" + id;
        item.style = "padding:15px;margin-bottom:10px;background:white;border-radius:12px;display:flex;justify-content:space-between;align-items:center;";
        item.innerHTML = `<div><h4 style="margin:0">${story.title}</h4><div style="font-size:13px;color:#777">ID : ${id}</div></div>
        <div>
            <button onclick="editStory('${id}')">Sửa</button>
            <button onclick="deleteStory('${id}')">Xóa</button>
            <button onclick="openPostModal('${id}','${story.title}')">Đăng chương</button>
        </div>`;
        list.appendChild(item);
    });
}

// Xử lý tạo/sửa truyện
async function handleCreateStory() {
    const customId = document.getElementById("idInput").value.trim().toLowerCase();
    const title = document.getElementById("titleInput").value;
    const author = document.getElementById("authorInput").value;
    const status = document.getElementById("statusSelect").value;
    const cover = document.getElementById("coverInput").value;
    const description = document.getElementById("descInput").value;
    
    if (!customId) { alert("Chưa nhập ID truyện."); return; }
    
    const selectedGenres = Array.from(document.querySelectorAll("#genreModalContainer input:checked")).map(cb => cb.value);
    const storyRef = ref(db, "stories/" + customId);
    const isEditing = document.getElementById("idInput").readOnly;
    const storyData = { title, author, status, cover, description, genres: selectedGenres, updatedAt: Date.now() };

    if (isEditing) {
        await update(storyRef, storyData);
        alert("✅ Đã cập nhật truyện.");
    } else {
        await set(storyRef, { ...storyData, createdAt: Date.now(), latestChapter: 0, lastUpdate: "", views: 0 });
        alert("🎉 Đăng truyện thành công.");
    }
    resetForm();
    document.getElementById("idInput").readOnly = false;
    loadAdminStoryList();
}

// Đọc và tách chương
async function handleImportFile() {
    const input = document.getElementById("chapterFileInput");
    if (!input.files.length) { alert("Chưa chọn file."); return; }
    const file = input.files[0];
    let text = "";

    if (file.name.endsWith(".txt")) {
        text = await file.text();
    } else if (file.name.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
    } else {
        alert("Chỉ hỗ trợ TXT và DOCX");
        return;
    }

    importedChapters = [];
    const preview = document.getElementById("chapterPreview");
    preview.style.display = "block";
    preview.innerHTML = "";

    const arr = text.split(/(?=Chương\s+\d+\s*:)/gi);
    arr.forEach(item => {
        item = item.trim();
        if (item.length < 10) return;
        importedChapters.push({ title: item.split("\n")[0], content: item });
    });

    preview.innerHTML = `<h4>Đã tìm thấy ${importedChapters.length} chương</h4>`;
    importedChapters.forEach((ch, i) => {
        preview.innerHTML += `<div style="padding:10px;margin-bottom:8px;border:1px solid #ddd;border-radius:8px;"><b>${i + 1}. ${ch.title}</b></div>`;
    });
}

// Upload chương lên Firebase
async function handleUploadContent() {
    const storyId = document.getElementById("modalStoryId").value;
    if (!storyId || importedChapters.length === 0) { alert("Thiếu dữ liệu!"); return; }
    
    try {
        for (let i = 0; i < importedChapters.length; i++) {
            await set(ref(db, `stories/${storyId}/chapters/chapter-${i + 1}`), { 
                number: i + 1, ...importedChapters[i] 
            });
        }
        const date = new Date().toLocaleDateString("vi-VN");
        await update(ref(db, `stories/${storyId}`), { latestChapter: importedChapters.length, updatedAt: date });
        
        alert("Đăng thành công!");
        document.getElementById("chapterPreview").innerHTML = "";
        importedChapters = [];
        closePostModal();
    } catch (e) { alert("Upload thất bại."); }
}

function resetForm() {
    document.getElementById("idInput").value = "";
    document.querySelectorAll("input, textarea").forEach(i => i.value = "");
    document.getElementById("selectedGenresText").innerText = "Chọn thể loại...";
    document.querySelectorAll("#genreModalContainer input").forEach(cb => cb.checked = false);
}

window.handleCreateStory = handleCreateStory;
window.handleImportFile = handleImportFile;
window.handleUploadContent = handleUploadContent;
window.resetForm = resetForm;
