import { db, auth } from "./firebase.js";
import { ref, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

(function() {
  const menuNotiHtml = `
    <div class="menu-noti-wrap" style="margin-left: 10px; display: none;">
      <a href="#" id="btnBellMini" onclick="event.preventDefault();" class="btn-noti-trigger">
        🔔 <span class="mini-noti-badge" id="notiCountBadge" style="display: none;">0</span>
      </a>
      <div id="notiPanelMini" class="mini-noti-panel">
        <div class="mini-noti-header">
          <span>🔔 THÔNG BÁO CỦA BẠN</span>
          <span class="mini-read-all-btn" id="readAllBtn">Đọc hết</span>
        </div>
        <div class="mini-noti-list" id="notiListContainer">
          <div class="mini-noti-empty">Chưa có thông báo nào...</div>
        </div>
      </div>
    </div>
  `;

  // Tự động tìm .header-right để chèn chuông vào
  const headerRight = document.querySelector('.header-right');
  if (headerRight) { 
      headerRight.insertAdjacentHTML('beforeend', menuNotiHtml); 
  }

  // Thêm style animation cho chuông
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes highlightComment {
      0% { background-color: #fff3cd; transform: scale(1.02); }
      50% { background-color: #fff3cd; transform: scale(1.02); }
      100% { background-color: transparent; transform: scale(1); }
    }
    .highlight-comment-box {
      animation: highlightComment 2.5s ease-in-out !important;
      border-radius: 6px;
      padding: 4px;
    }
  `;
  document.head.appendChild(style);

  const btnBell = document.getElementById('btnBellMini');
  const panel = document.getElementById('notiPanelMini');
  const badge = document.getElementById('notiCountBadge');
  const listContainer = document.getElementById('notiListContainer');
  const readAllBtn = document.getElementById('readAllBtn');

  if(btnBell) {
    btnBell.onclick = (e) => {
      e.preventDefault();
      panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    };
  }

  document.addEventListener('click', (e) => {
    if (panel && panel.style.display === 'flex' && !e.target.closest('.menu-noti-wrap')) {
      panel.style.display = 'none';
    }
  });

  // Lắng nghe trạng thái đăng nhập (Bản mới chuẩn Modular)
  onAuthStateChanged(auth, user => {
    const menuWrap = document.querySelector('.menu-noti-wrap');
    if (!user) {
      if (menuWrap) menuWrap.style.display = 'none';
      if (badge) badge.style.display = 'none';
      return;
    }

    if (menuWrap) menuWrap.style.display = 'inline-block';
    
    // Đường dẫn Firebase Realtime Database bản mới
    const notiRef = ref(db, `notifications/${user.uid}`);

    onValue(notiRef, snap => {
      const data = snap.val();
      if (!data) {
        if (badge) badge.style.display = 'none';
        if (listContainer) listContainer.innerHTML = `<div class="mini-noti-empty">Chưa có thông báo nào...</div>`;
        return;
      }

      let unread = 0;
      const arr = [];
      Object.keys(data).forEach(id => {
        arr.push({ id, ...data[id] });
        if (data[id].status === 'unread' || data[id].isRead === false) unread++;
      });

      arr.sort((a,b) => b.timestamp - a.timestamp);

      if (badge) {
        if (unread > 0) {
          badge.innerText = unread;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }
      }

      let html = '';
      arr.forEach(item => {
        const date = new Date(item.timestamp);
        const timeStr = date.toLocaleTimeString('vi-VN',{ hour:'2-digit', minute:'2-digit' }) + ' ' + date.toLocaleDateString('vi-VN');
        const isRead = item.status === 'read' || item.isRead === true;
        const nodeType = item.typeNode || 'tong';

        html += `
          <div class="mini-noti-item ${isRead ? 'read' : ''}" data-id="${item.id}" data-link="${item.link || '#'}" data-node="${nodeType}">
            <strong>${escapeHTML(item.senderName || "Hệ thống")}</strong> (${item.loaiCmtTxt || 'phản hồi'}):
            <div style="margin-top:4px;font-style:italic;opacity:0.9;">"${escapeHTML(item.content || item.message)}"</div>
            <span class="mini-noti-time">🕒 ${timeStr}</span>
          </div>
        `;
      });

      if (listContainer) {
        listContainer.innerHTML = html;

        listContainer.querySelectorAll('.mini-noti-item').forEach(el => {
          el.onclick = () => {
            const notiId = el.dataset.id;
            let link = el.dataset.link;
            const typeNode = el.dataset.node;

            if (!link || link === '#') return;
            if (panel) panel.style.display = 'none';

            let cleanLink = link.split('#')[0];
            const currentPath = window.location.pathname;
            
            const isSamePage = cleanLink.includes(currentPath) || currentPath.includes(cleanLink.replace('.html', ''));

            if (isSamePage) {
              if (typeNode && typeNode.startsWith('doan_')) {
                const pIdx = parseInt(typeNode.split('_')[1]);
                const pLines = document.querySelectorAll('.p-line');
                if (pLines && pLines[pIdx]) {
                  pLines[pIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
                  pLines[pIdx].classList.add('highlight-comment-box');
                  setTimeout(() => { pLines[pIdx].classList.remove('highlight-comment-box'); }, 2000);
                  pLines[pIdx].click();
                }
              } else {
                const commentBox = document.getElementById('commentBox');
                if (commentBox) {
                  commentBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  commentBox.classList.add('highlight-comment-box');
                  setTimeout(() => { commentBox.classList.remove('highlight-comment-box'); }, 2000);
                }
              }
              
              // Cập nhật trạng thái đã đọc bản mới
              const specificNotiRef = ref(db, `notifications/${user.uid}/${notiId}`);
              update(specificNotiRef, { status: 'read', isRead: true });
              
            } else {
              const specificNotiRef = ref(db, `notifications/${user.uid}/${notiId}`);
              update(specificNotiRef, { status: 'read', isRead: true }).then(() => {
                if (cleanLink.includes('?')) {
                  window.location.href = `${cleanLink}&targetP=${typeNode}`;
                } else {
                  window.location.href = `${cleanLink}?targetP=${typeNode}`;
                }
              });
            }
          };
        });
      }
    });

    if(readAllBtn) {
      readAllBtn.onclick = (e) => {
        e.preventDefault();
        get(notiRef).then(snap => {
          const data = snap.val();
          if (!data) return;
          const updates = {};
          Object.keys(data).forEach(id => {
            updates[`${id}/status`] = 'read';
            updates[`${id}/isRead`] = true;
          });
          update(notiRef, updates);
        });
      };
    }
  });

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
  }
})();
