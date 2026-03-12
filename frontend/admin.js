(function () {
  const API = String(window.API_ROOT || '').replace(/\/+$/, '');

  let users = [];
  let selectedUser = null;

  function el(id) {
    return document.getElementById(id);
  }

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString('de-DE');
  }

  async function apiJson(url, opts) {
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch { /* ignore */ }
    if (!res.ok) {
      const msg = data?.detail || data?.message || res.statusText || 'Error';
      throw new Error(msg);
    }
    return data;
  }

  function renderUsers() {
    const tbody = el('usersTable')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Keine Benutzer.</td></tr>';
      return;
    }

    for (const u of users) {
      const perms = Array.isArray(u.effective_permissions) ? u.effective_permissions.join(', ') : '';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${u.is_active ? 'active' : 'inactive'}</td>
        <td class="small text-muted">${perms}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" data-action="select" data-id="${u.id}">Select</button>
        </td>
      `;
      tbody.appendChild(tr);
    }

    tbody.querySelectorAll('button[data-action="select"]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectUser(Number(btn.dataset.id));
      });
    });
  }

  function renderUserDetail() {
    const empty = el('userDetailEmpty');
    const detail = el('userDetail');
    if (!selectedUser) {
      if (empty) empty.classList.remove('d-none');
      if (detail) detail.classList.add('d-none');
      return;
    }

    if (empty) empty.classList.add('d-none');
    if (detail) detail.classList.remove('d-none');

    el('detailUsername').textContent = selectedUser.username || '-';
    el('detailUserId').textContent = selectedUser.id || '-';
    const roleSel = el('detailRole');
    if (roleSel) roleSel.value = selectedUser.role || 'viewer';

    renderGrants(selectedUser.grants || []);
  }

  function renderGrants(grants) {
    const tbody = el('grantsTable')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!grants.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Keine Grants.</td></tr>';
      return;
    }
    for (const g of grants) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${g.id}</td>
        <td>${g.permission}</td>
        <td>${fmtDate(g.valid_from)}</td>
        <td>${fmtDate(g.valid_until)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-action="revoke" data-id="${g.id}">Revoke</button>
        </td>
      `;
      tbody.appendChild(tr);
    }

    tbody.querySelectorAll('button[data-action="revoke"]').forEach(btn => {
      btn.addEventListener('click', () => revokeGrant(Number(btn.dataset.id)));
    });
  }

  async function loadUsers() {
    const data = await apiJson(`${API}/admin/users`);
    users = data.items || [];
    renderUsers();
    if (selectedUser) {
      const updated = users.find(u => u.id === selectedUser.id);
      selectedUser = updated || null;
      renderUserDetail();
    }
  }

  async function loadAuditLog() {
    const params = {};
    const actor = el('auditActor')?.value?.trim();
    const target = el('auditTarget')?.value?.trim();
    const action = el('auditAction')?.value?.trim();
    const dateFrom = el('auditFrom')?.value;
    const dateTo = el('auditTo')?.value;
    if (actor) params.actor_user_id = actor;
    if (target) params.target_user_id = target;
    if (action) params.action = action;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const qs = new URLSearchParams(params).toString();
    const data = await apiJson(`${API}/admin/audit-log${qs ? `?${qs}` : ''}`);
    const tbody = el('auditTable')?.querySelector('tbody');
    if (!tbody) return;
    const items = data.items || [];
    tbody.innerHTML = '';
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Keine Einträge.</td></tr>';
      return;
    }

    for (const it of items) {
      let details = it.details;
      if (typeof details === 'string' && details.length > 120) {
        details = details.slice(0, 117) + '...';
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtDate(it.ts)}</td>
        <td>${it.actor_user_id ?? '-'}</td>
        <td>${it.action || '-'}</td>
        <td>${it.target_user_id ?? '-'}</td>
        <td class="small text-muted">${details ?? '-'}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  function selectUser(id) {
    selectedUser = users.find(u => u.id === id) || null;
    renderUserDetail();
  }

  async function updateRole() {
    if (!selectedUser) return;
    const role = el('detailRole')?.value;
    if (!role) return;
    await apiJson(`${API}/admin/users/${selectedUser.id}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    await loadUsers();
  }

  async function grantPermission() {
    if (!selectedUser) return;
    const permission = el('grantPermission')?.value;
    const validUntil = el('grantValidUntil')?.value;
    const body = { permission };
    if (validUntil) {
      body.valid_until = new Date(validUntil).toISOString();
    }
    await apiJson(`${API}/admin/users/${selectedUser.id}/grants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    el('grantValidUntil').value = '';
    await loadUsers();
  }

  async function revokeGrant(grantId) {
    if (!selectedUser) return;
    const reason = prompt('Revoke reason (optional):') || '';
    await apiJson(`${API}/admin/users/${selectedUser.id}/grants/${grantId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    await loadUsers();
  }

  document.addEventListener('DOMContentLoaded', () => {
    el('btnReloadUsers')?.addEventListener('click', loadUsers);
    el('btnUpdateRole')?.addEventListener('click', updateRole);
    el('btnGrant')?.addEventListener('click', grantPermission);
    el('btnReloadAudit')?.addEventListener('click', loadAuditLog);
    el('btnApplyAudit')?.addEventListener('click', loadAuditLog);

    loadUsers().catch(() => {});
    loadAuditLog().catch(() => {});
  });
})();
