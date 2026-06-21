// File: assets/js/admin.js
function tangLuotXem(truyenId) {
    if (!truyenId) return;
    
    // Trỏ tới đúng vị trí truyenId trong nhánh 'views' trên Firebase
    const viewRef = firebase.database().ref('views/' + truyenId);
    
    // Tăng giá trị lên 1
    viewRef.transaction(function(currentViews) {
        return (currentViews || 0) + 1;
    });
}
