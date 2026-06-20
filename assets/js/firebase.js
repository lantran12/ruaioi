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

// Khởi tạo (Chỉ khởi tạo 1 lần duy nhất)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Khai báo biến toàn cục để index.js dùng chung
const db = firebase.database();
const auth = firebase.auth();
// Khai báo biến global để các file khác dùng
window.db = firebase.database();
window.auth = firebase.auth();
