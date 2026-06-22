// Nhập các thư viện Firebase phiên bản mới (v10+) dạng Module
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Cấu hình Firebase của Chị
const firebaseConfig = {
    apiKey: "AIzaSyBimiEGQcW9at2pOxfdUaJHjim2fmyjjcc",
    authDomain: "dongchanrua.firebaseapp.com",
    databaseURL: "https://dongchanrua-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dongchanrua",
    storageBucket: "dongchanrua.firebasestorage.app",
    messagingSenderId: "640115424540",
    appId: "1:640115424540:web:c9713b7921c09283150ed9"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo Database và Auth theo chuẩn mới
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Thêm chữ "update" vào danh sách export này
export { db, auth, provider, ref, push, onChildAdded, remove, update, signInWithPopup, signOut, onAuthStateChanged };
