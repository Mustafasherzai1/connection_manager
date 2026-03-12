// nav-auth.js
// - Highlights active nav items
// - Shows current user (if elements exist)
// - Handles logout consistently

(function () {
  function currentPage() {
    const p = (window.location.pathname || '').split('/').pop();
    return p && p.length ? p : 'cross-connects.html';
  }

  function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function getDisplayName(username) {
    const names = {
      admin: 'Administrator',
      techniker: 'Techniker',
      tech: 'Techniker',
      viewer: 'Betrachter',
      test: 'Test User',
      gast: 'Gast',
    };
    return names[String(username || '').toLowerCase()] || (username || 'Gast');
  }

  function getRoleName(role) {
    const roles = {
      admin: 'Administrator',
      superadmin: 'Superadmin',
      techniker: 'Techniker',
      tech: 'Techniker',
      viewer: 'Betrachter',
    };
    return roles[String(role || '').toLowerCase()] || (role || 'viewer');
  }

  function isAdmin(role) {
    const r = String(role || '').toLowerCase();
    return r === 'admin' || r === 'superadmin';
  }

  function setActiveNav() {
    const page = currentPage();
    document.querySelectorAll('a[data-nav]').forEach((a) => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      if (href && href === page) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  function ensureAdminNav(role) {
    const show = isAdmin(role);
    document.querySelectorAll('[data-admin-nav]').forEach((el) => {
      el.style.display = show ? '' : 'none';
    });
  }

  function applyReadOnlyUI(role) {
    const readonly = !isAdmin(role);
    document.body.dataset.role = String(role || 'viewer');
    if (!readonly) return;

    // Hide/disable elements explicitly marked as write/admin-only
    document.querySelectorAll('[data-write], [data-admin-only]').forEach((el) => {
      if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        el.disabled = true;
      }
      el.style.display = 'none';
    });
  }

  function updateUserUI() {
    const username = localStorage.getItem('username') || sessionStorage.getItem('username') || 'Gast';
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || 'viewer';

    const loginAtIso = localStorage.getItem('loginAt');
    let loginAtText = '—';
    if (loginAtIso) {
      const d = new Date(loginAtIso);
      if (!isNaN(d.getTime())) {
        loginAtText = d.toLocaleString('de-DE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    const usernameDisplay = document.getElementById('usernameDisplay');
    const userRole = document.getElementById('userRole');
    const loginAt = document.getElementById('loginAt');
    const usernameDisplayTop = document.getElementById('usernameDisplayTop');
    const userRoleTop = document.getElementById('userRoleTop');

    const usernameDisplaySidebar = document.getElementById('sidebarUserName');
    const userRoleSidebar = document.getElementById('sidebarUserRole');
    const loginAtSidebar = document.getElementById('sidebarLoginAt');

    const nameText = getDisplayName(username);
    const roleText = getRoleName(role);

    const userBox = document.getElementById('userBox');
    if (userBox) {
      userBox.innerHTML = `
        <div style="display:flex; flex-direction:column; line-height:1.05;">
          <span class="ub-name">${nameText}</span>
          <span class="ub-role">${roleText}</span>
        </div>
        <button class="ub-logout" type="button" data-action="logout">Logout</button>
      `;
    }

    if (usernameDisplay) usernameDisplay.textContent = nameText;
    if (userRole) userRole.textContent = roleText;
    if (loginAt) loginAt.textContent = loginAtText;
    if (usernameDisplayTop) usernameDisplayTop.textContent = nameText;
    if (userRoleTop) userRoleTop.textContent = roleText;

    if (usernameDisplaySidebar) usernameDisplaySidebar.textContent = nameText;
    if (userRoleSidebar) userRoleSidebar.textContent = roleText;
    if (loginAtSidebar) loginAtSidebar.textContent = loginAtText;

    ensureAdminNav(role);
    applyReadOnlyUI(role);
}

  function logout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'login.html';
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Protect pages (except login)
    if (!String(window.location.pathname).endsWith('login.html')) {
      if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
      }
    }

    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || 'viewer';
    if (!isAdmin(role) && currentPage() === 'admin.html') {
      window.location.href = 'cross-connects.html';
      return;
    }

    setActiveNav();
    updateUserUI();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }

    // Allow any element with data-action="logout" to work too
    document.querySelectorAll('[data-action="logout"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    });
  });
})();
