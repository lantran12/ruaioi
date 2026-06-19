import { db, auth } from "./firebase.js";
import { ref, set, get, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Định nghĩa ADMIN_UID cố định (Chị có thể thay bằng UID thật của chị trên Firebase)
const ADMIN_UID = "UID_ADMIN_CỦA_CHỊ_Ở_ĐÂY"; 

let isSignUpMode = true;

// 1. Quản lý Đóng / Mở Modal Đăng Nhập
window.openAuthModal = function() {
  const user = auth.currentUser;
  if (user) { 
    if(document.getElementById('homeMainContent')) document.getElementById('homeMainContent').style.display = 'none'; 
    if(document.getElementById('profileSection')) document.getElementById('profileSection').style.display = 'block'; 
    return; 
  }
  isSignUpMode = true; 
  resetAuthFormFields(); 
  if(document.getElementById('authModal')) document.getElementById('authModal').style.display = 'flex';
};

window.closeAuthModal = function() { 
  if(document.getElementById('authModal')) document.getElementById('authModal').style.display = 'none'; 
};

window.closeAuthModalOverlay = function(e) { 
  if (e.target.id === 'authModal') closeAuthModal(); 
};

function resetAuthFormFields() { 
  if(document.getElementById('authDisplayName')) document.getElementById('authDisplayName').value = ""; 
  if(document.getElementById('authEmail')) document.getElementById('authEmail').value = ""; 
  if(document.getElementById('authPassword')) document.getElementById('authPassword').value = ""; 
}

// 2. Chuyển đổi qua lại giữa Đăng ký và Đăng nhập
window.toggleAuthMode = function() {
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById('authTitle'); 
  const nameGrp = document.getElementById('nickNameGroup'); 
  const submitBtn = document.getElementById('btnAuthSubmit'); 
  const toggleLnk = document.getElementById('authToggleLink'); 
  const forgotLnk = document.getElementById('authForgotLink');
  
  if (isSignUpMode) {
    if(title) title.innerText = "ĐĂNG KÝ THÀNH VIÊN"; 
    if(nameGrp) nameGrp.style.display = 'block'; 
    if(submitBtn) submitBtn.innerText = "ĐĂNG KÝ TÀI KHOẢN THẬT"; 
    if(toggleLnk) toggleLnk.innerText = "Đã có tài khoản rồi? Bấm vào đây để Đăng nhập"; 
    if(forgotLnk) forgotLnk.style.display = 'none';
  } else {
    if(title) title.innerText = "ĐĂNG NHẬP HỆ THỐNG"; 
    if(nameGrp) nameGrp.style.display = 'none'; 
    if(submitBtn) submitBtn.innerText = "ĐĂNG NHẬP NGAY"; 
    if(toggleLnk) toggleLnk.innerText = "Chưa có tài khoản? Bấm vào đây để Đăng ký mới"; 
    if(forgotLnk) forgotLnk.style.display = 'block';
  }
};

// 3. Xử lý gửi Form Đăng nhập / Đăng ký bản mới v10
window.submitAuthForm = function() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const displayName = document.getElementById('authDisplayName').value.trim();
  
  if (!email || !password) { alert("Vui lòng điền đầy đủ Email và Mật khẩu nha!"); return; }
  
  if (isSignUpMode) {
    if (!displayName) { alert("Chưa nhập biệt danh kìa bạn ơi!"); return; }
    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        return updateProfile(user, { displayName: displayName }).then(() => {
          const userRef = ref(db, 'users/' + user.uid);
          return set(userRef, { displayName: displayName, email: email, avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix" });
        });
      })
      .then(() => { alert("Đăng ký thành công mỹ mãn!"); closeAuthModal(); })
      .catch(err => alert("Lỗi đăng ký: " + err.message));
  } else {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => { alert("Chị đăng nhập thành công rồi đoá 🌸!"); closeAuthModal(); })
      .catch(err => alert("Lỗi đăng nhập: " + err.message));
  }
};

// 4. Quên mật khẩu bản mới v10
window.handleForgotPassword = function() {
  const email = document.getElementById('authEmail').value.trim();
  if (!email) { alert("Hãy nhập Email của bạn vào ô trên rồi bấm lại nút này để nhận link reset nha!"); return; }
  sendPasswordResetEmail(auth, email)
    .then(() => alert("Hệ thống đã gửi link đổi mật khẩu vào mail của bạn. Check hộp thư nha!"))
    .catch(err => alert("Lỗi gửi mail: " + err.message));
};

// 5. Kiểm tra email cấp quyền hiển thị nút Admin
window.checkAndGrantAdmin = function(user) {
  const adminEmail = "dien-email-cua-chi-vao-day@gmail.com"; // Chị sửa Email chị ở đây
  if (user && user.email === adminEmail) {
    console.log("Chào mừng vị vương quyền tối cao của Động Rùa! 🐢");
    const adminBtn = document.getElementById('btnOpenAdminPanel'); 
    if (adminBtn) adminBtn.style.display = 'inline-block';
  }
};

// 6. Hàm Xóa Bình Luận Tổng / Bình Luận Đoạn bản mới v10
window.deleteMainComment = function(typeNode, cmtId) {
  const user = auth.currentUser;
  if (!user) { alert("Chị cần đăng nhập mới thực hiện được thao tác này nha!"); return; }

  // Lấy các biến môi trường toàn cục từ trang truyện của chị (nếu có)
  const codeTruyen = window.codeTruyen || "default_book";
  const curId = window.curId || "1";

  const cmtRef = ref(db, `comments/${codeTruyen}/chuong_${curId}/${typeNode}/${cmtId}`);
  
  get(cmtRef).then((snap) => {
    if (!snap.exists()) { alert("Bình luận này không tồn tại hoặc đã bị xóa trước đó rồi Chị ơi!"); return; }
    const cmtData = snap.val();
    
    if (user.uid === ADMIN_UID || user.uid === cmtData.uid) {
      if (confirm("Bạn có chắc chắn muốn gỡ bỏ hoàn toàn bình luận này không?")) {
        remove(cmtRef)
          .then(() => { alert("Đã xóa bình luận thành công! ✨"); })
          .catch(err => { alert("Lỗi khi xóa: " + err.message); });
      }
    } else {
      alert("Cưng không có quyền hạn tối cao để gỡ bình luận này đâu nha! 🤫");
    }
  });
};

// 7. Hàm Xóa Phản hồi con (Replies) bản mới v10
window.deleteReplyComment = function(typeNode, parentCmtId, replyId) {
  const user = auth.currentUser;
  if (!user) { alert("Chị cần đăng nhập mới thực hiện được thao tác này nha!"); return; }

  const codeTruyen = window.codeTruyen || "default_book";
  const curId = window.curId || "1";

  const replyRef = ref(db, `comments/${codeTruyen}/chuong_${curId}/${typeNode}/${parentCmtId}/replies/${replyId}`);
  
  get(replyRef).then((snap) => {
    if (!snap.exists()) { alert("Phản hồi này không tồn tại hoặc đã bị xóa rồi ạ!"); return; }
    const replyData = snap.val();
    
    if (user.uid === ADMIN_UID || user.uid === replyData.uid) {
      if (confirm("Bạn có chắc chắn muốn gỡ bỏ phản hồi này không?")) {
        remove(replyRef)
          .then(() => { alert("Đã xóa phản hồi thành công! ✨"); })
          .catch(err => { alert("Lỗi khi xóa: " + err.message); });
      }
    } else {
      alert("Không thể xóa phản hồi của người khác đâu nè Chị ơi! 🤫");
    }
  });
};
