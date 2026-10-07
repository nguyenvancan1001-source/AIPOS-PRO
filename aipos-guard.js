/* =====================================================================
   AIPOS·PRO — AUTH GUARD (bản thương mại, nhiều doanh nghiệp)
   Mọi app gọi:  <script src="/aipos-guard.js" data-app="pos"></script>
   • Dùng chung phiên đăng nhập Supabase của trang chủ (index.html).
   • Chưa đăng nhập -> về trang chủ để đăng nhập / đăng ký.
   • Gói dịch vụ không có app này -> chặn, mời nâng gói.
   • Doanh nghiệp bị tạm khoá -> chặn.
   Giữ nguyên các hàm cũ để app không phải sửa: VCM_USER, vcmHasApp,
   vcmHasBranch, vcmIsAdmin, vcmLevel, vcmRequireApp, vcmLogout, vcmRenderUserBox…
   ===================================================================== */
(function () {
  'use strict';
  var C = window.CAUHINH || {};
  var URL_ = String(C.supabaseUrl || '').replace(/\/$/, '');
  var KEY = C.supabaseKey || '';
  var REF = URL_.replace(/^https?:\/\//, '').split('.')[0];
  var SKEY = 'sb-' + REF + '-auth-token';
  var CACHE = 'aipos_profile_v2';
  var HUB = '/';
  var script = document.currentScript;
  var APP = (script && script.getAttribute('data-app')) || window.VCM_APP || '';
  var LEVEL = { founder: 100, owner: 100, admin: 95, manager: 70, accountant: 60, ketoan: 60, warehouse: 55, kho: 55, cashier: 30, staff: 30 };
  var ROLE_VI = { founder: 'Chủ doanh nghiệp', owner: 'Chủ doanh nghiệp', admin: 'Quản trị', manager: 'Quản lý cửa hàng',
    accountant: 'Kế toán', warehouse: 'Thủ kho', cashier: 'Thu ngân', staff: 'Thành viên' };

  function docPhien() {
    try {
      var raw = localStorage.getItem(SKEY); if (!raw) return null;
      var s = JSON.parse(raw); if (s && s.currentSession) s = s.currentSession;
      if (!s || !s.user || !(s.access_token || s.refresh_token)) return null;
      return s;
    } catch (e) { return null; }
  }
  function veTrangChu() {
    try { sessionStorage.setItem('aipos_next', location.pathname + location.search); } catch (e) {}
    location.replace(HUB);
  }
  var phien = docPhien();
  if (!phien) { veTrangChu(); return; }
  var uid = phien.user.id;

  function docCache() { try { var c = JSON.parse(localStorage.getItem(CACHE) || 'null'); return c && c.uid === uid ? c : null; } catch (e) { return null; } }
  function ghiCache(c) { try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch (e) {} }

  async function goi(path, opt) {
    var tk = (docPhien() || {}).access_token || KEY;
    var r = await fetch(URL_ + path, Object.assign({ headers: { apikey: KEY, Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' } }, opt || {}));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var t = await r.text(); return t ? JSON.parse(t) : null;
  }
  async function napHoSo() {
    var au = await goi('/rest/v1/app_users?select=*&auth_uid=eq.' + encodeURIComponent(uid) + '&limit=1');
    var p = (au && au[0]) || {};
    var tn = null, f = null;
    try { tn = (await goi('/rest/v1/tenants?select=*&limit=1') || [])[0] || null; } catch (e) {}
    try { f = await goi('/rest/v1/rpc/get_plan_features', { method: 'POST', body: '{}' }); } catch (e) {}
    // lưu sẵn thông tin doanh nghiệp + chi nhánh để app đọc ngay khi mở (aipos-tenant.js)
    try {
      var br = await goi('/rest/v1/vc_branches?select=*&order=code');
      localStorage.setItem('aipos_tenant_v1', JSON.stringify({ uid: uid, t: tn || {}, b: br || [] }));
    } catch (e) {}
    var role = String(p.role || 'staff').toLowerCase();
    return {
      uid: uid, email: phien.user.email, full_name: p.full_name || p.display_name || phien.user.email,
      role: role, active: p.active !== false, branches: Array.isArray(p.branches) && p.branches.length ? p.branches : ['*'],
      plan: (tn && tn.plan) || 'basic', tenant_status: (tn && tn.status) || 'active',
      company: (tn && (tn.store_name || tn.company_name)) || '', features: f || null, ts: Date.now()
    };
  }

  function chan(tieuDe, noiDung, nut) {
    function ve() {
      var o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:20px;' +
        'background:linear-gradient(135deg,#0B2545,#13386b);font-family:system-ui,-apple-system,"Segoe UI",sans-serif';
      o.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;padding:28px;text-align:center;color:#0F1B2D">' +
        '<div style="font-size:34px;margin-bottom:6px">🔒</div><div style="font-weight:800;font-size:18px;margin-bottom:8px"></div>' +
        '<div style="color:#64748B;font-size:14px;line-height:1.6;margin-bottom:18px"></div>' +
        '<a href="/" style="display:inline-block;background:#1565C0;color:#fff;text-decoration:none;font-weight:700;padding:10px 20px;border-radius:9px"></a></div>';
      o.querySelector('div > div:nth-child(2)').textContent = tieuDe;
      o.querySelector('div > div:nth-child(3)').textContent = noiDung;
      o.querySelector('a').textContent = nut || 'Về trang chủ';
      (document.body || document.documentElement).appendChild(o);
      try { document.documentElement.style.overflow = 'hidden'; } catch (e) {}
    }
    if (document.body) ve(); else document.addEventListener('DOMContentLoaded', ve);
  }
  var TEN_APP = { pos: 'Bán hàng (POS)', kho: 'Kho', ncc: 'Nhà cung cấp', ketoan: 'Kế toán', luong: 'Lương', bctc: 'Báo cáo tài chính' };
  function kiemTra(c) {
    if (c.tenant_status && c.tenant_status !== 'active' && c.tenant_status !== 'trial') {
      chan('Tài khoản doanh nghiệp đang tạm khoá', 'Vui lòng liên hệ nhà cung cấp phần mềm để kích hoạt lại.'); return false;
    }
    if (!c.active) { chan('Tài khoản của bạn đang bị khoá', 'Liên hệ chủ doanh nghiệp để mở khoá.'); return false; }
    if (APP && c.features && c.features[APP] === false) {
      chan('Gói ' + String(c.plan || '').toUpperCase() + ' chưa có app ' + (TEN_APP[APP] || APP),
        'Nâng cấp gói dịch vụ tại trang chủ để sử dụng.', 'Xem gói & nâng cấp'); return false;
    }
    return true;
  }

  var c = docCache();
  if (!c) {
    // Lần đầu mở app trên máy này: nạp hồ sơ rồi tải lại trang (các lần sau chạy tức thì)
    chan('Đang kiểm tra tài khoản…', 'Vui lòng đợi trong giây lát.', 'Về trang chủ');
    napHoSo().then(function (h) { ghiCache(h); location.reload(); })
      .catch(function () { try { localStorage.removeItem(SKEY); } catch (e) {} veTrangChu(); });
    return;
  }

  // ---- API cũ, giữ nguyên tên để các app không phải sửa
  var lv = LEVEL[c.role] || 30;
  var auth = {
    user_id: c.uid, email: c.email, full_name: c.full_name, role: c.role,
    role_vi: ROLE_VI[c.role] || c.role, role_icon: lv >= 95 ? '👑' : lv >= 70 ? '🏪' : '👤', role_color: '#1565C0', role_level: lv,
    is_admin: lv >= 95, branches: c.branches, apps: ['*'], plan: c.plan, features: c.features, company: c.company,
    expires_at: new Date(((phien.expires_at || 0) * 1000) || (Date.now() + 3600e3)).toISOString()
  };
  window.VCM_USER = auth;
  window.vcmAuthRaw = function () { return auth; };
  window.vcmHasApp = function (a) { return !(c.features && c.features[a] === false); };
  window.vcmHasBranch = function (code) { return auth.branches.indexOf('*') > -1 || auth.branches.indexOf(code) > -1; };
  window.vcmIsAdmin = function () { return auth.is_admin; };
  window.vcmLevel = function () { return lv; };
  window.vcmRequireLevel = function (min) { if (lv >= min) return true; chan('Không đủ quyền', 'Chức vụ của bạn chưa được dùng chức năng này.'); return false; };
  window.vcmRequireApp = function (a) { if (window.vcmHasApp(a)) return true; kiemTra({ features: c.features, plan: c.plan, active: true }); return false; };
  window.vcmSessionLeft = function () { return docPhien() ? 3600e3 : 0; };
  window.vcmLogout = function () {
    try { localStorage.removeItem(SKEY); localStorage.removeItem(CACHE); } catch (e) {}
    location.replace(HUB);
  };
  window.vcmRenderUserBox = function (target) {
    var el = typeof target === 'string' ? document.getElementById(target) : target; if (!el) return;
    el.textContent = (auth.role_icon + ' ' + auth.full_name + ' · ' + auth.role_vi);
  };

  if (!kiemTra(c)) return;

  // Làm mới hồ sơ ngầm (đổi gói / khoá tài khoản có hiệu lực ngay lần mở sau)
  napHoSo().then(function (h) {
    ghiCache(h);
    if (h.role !== c.role || JSON.stringify(h.features) !== JSON.stringify(c.features) || h.tenant_status !== c.tenant_status || h.active !== c.active) {
      if (!kiemTra(h)) return;
    }
  }).catch(function () {});

  // Phiên hết hạn hẳn (đăng xuất ở tab khác) -> về trang chủ
  setInterval(function () { if (!docPhien()) veTrangChu(); }, 60000);
})();
