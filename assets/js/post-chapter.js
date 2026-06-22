import { db, ref, set, onValue, remove } from "./firebase.js"; // Import từ file của chị

const storyId = new URLSearchParams(window.location.search).get('id');

// 1. Hàm Đăng chương lẻ
window.submitChapter = async () => {
    const chapNum = document.getElementById('chapterNumber').value;
    const title = document.getElementById('chapterName').value;
    const content = document.getElementById('chapterContent').value;

    if (!chapNum || !title || !content) return alert("Vui lòng điền đủ thông tin!");

    // Đẩy lên Firebase
    await set(ref(db, `stories/${storyId}/chapters/${chapNum}`), {
        title: title,
        content: content,
        timestamp: Date.now()
    });
    alert("Đăng chương thành công!");
    document.getElementById('chapterForm').reset();
};

// 2. Load danh sách chương tự động
onValue(ref(db, `stories/${storyId}/chapters`), (snapshot) => {
    const data = snapshot.val();
    const tableBody = document.getElementById('previewTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    if (data) {
        Object.keys(data).forEach(key => {
            tableBody.innerHTML += `
                <tr>
                    <td>Chương ${key}</td>
                    <td>${data[key].title}</td>
                    <td><button onclick="deleteChapter('${key}')">Xóa</button></td>
                </tr>`;
        });
    }
});

// 3. Hàm Xóa
window.deleteChapter = (chapNum) => {
    if (confirm("Chắc chắn xóa chương " + chapNum + "?")) {
        remove(ref(db, `stories/${storyId}/chapters/${chapNum}`));
    }
};

// 4. Hàm chuyển tab (Giao diện)
window.switchTab = (tab) => {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
    document.getElementById('btn' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
};
