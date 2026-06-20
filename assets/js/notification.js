import { db, auth } from "./firebase.js";
import { ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

function initNotification() {
  if (document.querySelector('.menu-noti-wrap')) return;

  const menuNotiHtml = `
    <div class="menu-noti-wrap" style="margin-left: 10px; display: none; position: relative;">
      <a href="#" id="btnBellMini" class="btn-noti-trigger" style="text-decoration: none; color: inherit; font-size: 20px;">
        <i class="fa-solid fa-graduation-cap"></i> <span class="mini-noti-badge" id="notiCountBadge" style="display: none; position: absolute; top: -5px; right: -5px; background: #ff4d6d; color: white; font-size: 10px; padding: 2px 5px; border-radius: 50%; font-weight: bold;">0</span>
      </a>
      <div id="notiPanelMini" style="display: none; position: absolute; top: 40px; right: 0; width: 300px; background: white; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); z-index: 9999; flex-direction: column; overflow: hidden; border: 1px solid #ddd;">
        <div style="padding: 10px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
          <span>THÔNG BÁO</span>
          <span id="readAllBtn" style="color: #007bff; cursor: pointer; font-size: 12px;">Đọc hết</span>
        </div>
        <div id="notiListContainer" style="max-height: 300px; overflow-y: auto;">
          <div style="padding: 20px; text-align: center; color: #999;">Chưa có thông báo nào...</div>
        </div>
      </div>
    </div>
  `;

  const headerRight = document.querySelector('.header-right-zone') || document.querySelector('.header-right');
  if (!headerRight) {
    setTimeout(initNotification, 500);
    return;
  }
  headerRight.insertAdjacentHTML('beforeend', menuNotiHtml);

  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes highlightComment {
      0% { background-color: #fff3cd; transform: scale(1.02); }
      50% { background-color: #fff3cd; transform: scale(1.02); }
      100% { background-color: transparent; transform: scale(1); }
    }
    .highlight-comment-box { animation: highlightComment 2.5s ease-in-out !important; border-radius: 6px; padding: 4px; }
    .mini-noti-item.read { opacity: 0.7; background: #fafafa; }
    .mini-noti-item { padding: 12px; border-bottom: 1px solid #f1f1f1; cursor: pointer; font-size: 13px; }
    .mini-noti-item:hover { background: #f1f1f1; }
    .mini-noti-time { font-size: 10px; color: #888; display: block; margin-top: 5px; }
  `;
  document.head.appendChild(style);

  // Gắn sự kiện sau khi chèn HTML
  const btnBell = document.getElementById('btnBellMini');
  const panel = document.getElementById('notiPanelMini');
  const badge = document.getElementById('notiCountBadge');
  const listContainer = document.getElementById('notiListContainer');
  const readAllBtn = document.getElementById('readAllBtn');

  if (btnBell) {
    btnBell.onclick = (e) => { e.preventDefault(); panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex'; };
  }

  onAuthStateChanged(auth, user => {
    const menuWrap = document.querySelector('.menu-noti-wrap');
    if (!menuWrap) return; 

    if (user) {
      // Có user -> Hiển thị chuông
      menuWrap.style.display = 'inline-block';
      
      const notiRef = ref(db, `notifications/${user.uid}`);
      onValue(notiRef, snap => {
        // ... giữ nguyên logic hiển thị thông báo của chị ...
      });
    } else {
      // Không có user -> Ẩn chuông
      menuWrap.style.display = 'none';
    }
  });
    
    const notiRef = ref(db, `notifications/${user.uid}`);
    onValue(notiRef, snap => {
      const data = snap.val();
      if (!data) return;

      let unread = 0;
      const arr = Object.keys(data).map(id => ({ id, ...data[id] }));
      arr.forEach(i => { if (i.status !== 'read' && i.isRead !== true) unread++; });
      arr.sort((a,b) => b.timestamp - a.timestamp);

      if (badge) { badge.innerText = unread; badge.style.display = unread > 0 ? 'inline-block' : 'none'; }

      listContainer.innerHTML = arr.map(item => `
        <div class="mini-noti-item ${item.status === 'read' || item.isRead === true ? 'read' : ''}" data-id="${item.id}" data-link="${item.link || '#'}" data-node="${item.typeNode || 'tong'}">
          <strong>${escapeHTML(item.senderName || "Hệ thống")}</strong> (${item.loaiCmtTxt || 'phản hồi'}):
          <div style="margin-top:4px;font-style:italic;opacity:0.9;">"${escapeHTML(item.content || item.message)}"</div>
          <span class="mini-noti-time">🕒 ${new Date(item.timestamp).toLocaleString('vi-VN')}</span>
        </div>
      `).join('');

      listContainer.querySelectorAll('.mini-noti-item').forEach(el => {
        el.onclick = () => {
          const { id, link, node } = el.dataset;
          if (panel) panel.style.display = 'none';
          const cleanLink = link.split('#')[0];
          
          if (cleanLink.includes(window.location.pathname)) {
            const target = node.startsWith('doan_') ? document.querySelectorAll('.p-line')[parseInt(node.split('_')[1])] : document.getElementById('commentBox');
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              target.classList.add('highlight-comment-box');
              setTimeout(() => target.classList.remove('highlight-comment-box'), 2000);
              if (target.click) target.click();
            }
            update(ref(db, `notifications/${user.uid}/${id}`), { status: 'read', isRead: true });
          } else {
            update(ref(db, `notifications/${user.uid}/${id}`), { status: 'read', isRead: true }).then(() => {
              window.location.href = cleanLink.includes('?') ? `${cleanLink}&targetP=${node}` : `${cleanLink}?targetP=${node}`;
            });
          }
        };
      });
    });

    if(readAllBtn) {
      readAllBtn.onclick = () => {
        get(notiRef).then(snap => {
          const updates = {};
          snap.forEach(c => { updates[`${c.key}/status`] = 'read'; updates[`${c.key}/isRead`] = true; });
          update(notiRef, updates);
        });
      };
    }
  });

  function escapeHTML(str) { return str ? str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t])) : ''; }
}

// Chạy khi trang load xong
window.addEventListener('DOMContentLoaded', initNotification);
