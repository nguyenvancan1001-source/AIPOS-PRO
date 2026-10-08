/* AIPOS·PRO — thông tin doanh nghiệp của tenant đang đăng nhập.
   Mọi app đọc chung file này. Thông tin lấy từ bảng tenants + vc_branches
   (RLS chỉ trả về dữ liệu của chính công ty người dùng). */
window.CAUHINH = {
  supabaseUrl: 'https://ssrodnzhuydlupglvepm.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcm9kbnpodXlkbHVwZ2x2ZXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzAzNTgsImV4cCI6MjA5NTY0NjM1OH0.Dys8NRpgo9Cn9AucfdGmbDTVUUb_6jJlYYt_u6akwag'
};

/* ---- Một máy chủ, một phiên đăng nhập cho mọi app ----
   App cũ tạo nhiều client (NCC, BCTC, Lương…) và có client tắt lưu phiên.
   Trong bản thương mại, dữ liệu mỗi doanh nghiệp được lọc theo người đăng nhập (RLS),
   nên MỌI truy vấn phải mang phiên của người dùng. Hai lớp dưới đây đảm bảo điều đó. */
(function (C) {
  var URL_ = String(C.supabaseUrl).replace(/\/$/, '');
  var REF = URL_.replace(/^https?:\/\//, '').split('.')[0];
  var SKEY = 'sb-' + REF + '-auth-token';
  C.jwt = function () {
    try { var s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && s.currentSession) s = s.currentSession;
      if (s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() + 5000)) return s.access_token; } catch (e) {}
    return C.supabaseKey;
  };
  // 1) createClient luôn trả về CÙNG một client có lưu phiên
  var _lib, _one = null;
  function boc(lib) {
    if (!lib || lib.__aiposBoc || typeof lib.createClient !== 'function') return lib;
    var goc = lib.createClient.bind(lib);
    lib.createClient = function (url, key, opt) {
      if (String(url || '').replace(/\/$/, '') !== URL_) return goc(url, key, opt);
      if (!_one) {
        var o = Object.assign({}, opt || {});
        o.auth = { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: SKEY };
        _one = goc(URL_, C.supabaseKey, o);
        bocKho(_one);
      }
      return _one;
    };
    lib.__aiposBoc = true; return lib;
  }
  // 3) Tệp (chứng từ, ảnh hủy hàng, hồ sơ thành viên) luôn nằm trong thư mục riêng của doanh nghiệp:
  //    <mã doanh nghiệp>/<đường dẫn app>. Máy chủ chặn đọc/ghi thư mục của doanh nghiệp khác.
  function bocKho(cl) {
    if (!cl || !cl.storage || cl.storage.__aipos) return;
    var from0 = cl.storage.from.bind(cl.storage);
    function tien(p) {
      var t = C.TENANT_ID; p = String(p || '').replace(/^\/+/, '');
      if (!t) throw new Error('Chưa xác định doanh nghiệp — đăng nhập lại rồi thử.');
      return p.indexOf(t + '/') === 0 ? p : t + '/' + p;
    }
    cl.storage.from = function (bucket) {
      var b = from0(bucket);
      ['upload', 'update', 'download', 'getPublicUrl', 'createSignedUrl', 'move', 'copy'].forEach(function (m) {
        if (typeof b[m] !== 'function') return;
        var g = b[m].bind(b);
        b[m] = function (p) {
          var a = Array.prototype.slice.call(arguments);
          try { a[0] = tien(p); if ((m === 'move' || m === 'copy') && a[1]) a[1] = tien(a[1]); }
          catch (e) { return m === 'getPublicUrl' ? { data: { publicUrl: '' }, error: e } : Promise.resolve({ data: null, error: e }); }
          return g.apply(null, a);
        };
      });
      if (typeof b.remove === 'function') { var r0 = b.remove.bind(b); b.remove = function (ds) { try { return r0((ds || []).map(tien)); } catch (e) { return Promise.resolve({ data: null, error: e }); } }; }
      if (typeof b.createSignedUrls === 'function') { var s0 = b.createSignedUrls.bind(b); b.createSignedUrls = function (ds, h, o) { try { return s0((ds || []).map(tien), h, o); } catch (e) { return Promise.resolve({ data: null, error: e }); } }; }
      if (typeof b.list === 'function') { var l0 = b.list.bind(b); b.list = function (p, o, x) { var t = C.TENANT_ID; return l0(t ? (t + '/' + String(p || '').replace(/^\/+/, '')).replace(/\/$/, '') : '__khong_co__', o, x); }; }
      return b;
    };
    cl.storage.__aipos = true;
  }
  try {
    Object.defineProperty(window, 'supabase', { configurable: true, enumerable: true,
      get: function () { return _lib; }, set: function (v) { _lib = boc(v); } });
  } catch (e) {}
  // 2) Lệnh fetch thẳng tới máy chủ bằng anon key -> gắn phiên người dùng
  var f0 = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      var u = typeof input === 'string' ? input : (input && input.url) || '';
      if (u.indexOf(URL_) === 0 && u.indexOf('/auth/v1/') < 0) {
        init = Object.assign({}, init || {});
        var h = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
        var a = h.get('Authorization') || '';
        if (!a || a === 'Bearer ' + C.supabaseKey) { h.set('Authorization', 'Bearer ' + C.jwt()); if (!h.get('apikey')) h.set('apikey', C.supabaseKey); init.headers = h; }
      }
    } catch (e) {}
    return f0(input, init);
  };
})(window.CAUHINH);
(function (C) {
  function hoa(s) { return String(s || '').toLocaleUpperCase('vi'); }
  var MA = ['PB', 'VT', 'TA'];
  function dat(t, ds) {
    t = t || {}; ds = ds || [];
    C.TENANT_ID = t.id || C.TENANT_ID || '';
    C.TEN = t.store_name || t.company_name || 'Cửa hàng';
    C.TEN_HOA = hoa(C.TEN); C.CHU_DAU = C.TEN_HOA.charAt(0);
    C.PN = t.company_name || C.TEN; C.PN_HOA = hoa(C.PN);
    C.PN_EN = t.company_name_en || ''; C.VT = t.short_name || C.PN;
    C.MST = t.tax_id || t.tax_code || '';
    C.DC = t.address || ''; C.TINH = t.province || t.city || '';
    C.HOTLINE = t.phone || t.hotline || ''; C.EMAIL = t.email || t.admin_email || '';
    C.WEB = t.website || location.host; C.HOST = location.host;
    C.NH = t.bank_name || ''; C.STK = t.bank_account || ''; C.CHU_TK = t.bank_holder || C.PN_HOA;
    // tên trường cũ mà các app đang đọc
    C.tenCuaHang = C.TEN; C.tenPhapNhan = C.PN; C.tenVietTat = C.VT; C.tenTiengAnh = C.PN_EN;
    C.maSoThue = C.MST; C.diaChi = C.DC; C.tinh = C.TINH; C.hotline = C.HOTLINE; C.email = C.EMAIL;
    C.website = t.website || ''; C.slogan = t.slogan || ''; C.nganHang = C.NH; C.soTaiKhoan = C.STK; C.chuTaiKhoan = C.CHU_TK;
    C.taiKhoanNganHang = C.taiKhoanNganHang || [];
    C.cuaHang = ds.filter(function (b) { return b.active !== false; }).map(function (b) {
      return { code: b.code, ten: b.name, diaChi: b.address || '', tinh: b.tinh || '', dangHoatDong: true, maKhoPancake: b.pancake_warehouse_id || '' };
    });
    if (!C.cuaHang.length) C.cuaHang = [{ code: 'CH1', ten: 'Cửa hàng 1', diaChi: '', tinh: '', dangHoatDong: true }];
    C.CN = {}; C.CN_HOA = {}; C.CN_DC = {}; C.CN_FULL = {};
    MA.forEach(function (m, i) {
      var b = ds.filter(function (x) { return String(x.code || '').toUpperCase() === m; })[0] || ds[i] || {};
      var ten = b.name || ('Chi nhánh ' + (i + 1));
      C.CN[m] = ten; C.CN_HOA[m] = hoa(ten);
      C.CN_DC[m] = b.address || C.DC;
      C.CN_FULL[m] = hoa(ten) + (C.CN_DC[m] ? ' — ' + C.CN_DC[m] : '');
    });
  }
  var TCACHE = 'aipos_tenant_v1';
  function uidHienTai() { try { var r = String(C.supabaseUrl).replace(/^https?:\/\//, '').split('.')[0]; var x = JSON.parse(localStorage.getItem('sb-' + r + '-auth-token') || 'null'); return x && x.user && x.user.id; } catch (e) { return null; } }
  try { var _c = JSON.parse(localStorage.getItem(TCACHE) || 'null'); if (_c && _c.uid === uidHienTai()) dat(_c.t, _c.b); else dat(); } catch (e) { dat(); }
  // --- thay the {{...}} trong HTML tinh; nho mau de ve lai khi co du lieu tenant
  var RE = /\{\{([A-Z_]+(?:\.[A-Z]+)?)\}\}/g, MAU = [];
  function lay(k) { var v = C; k.split('.').forEach(function (p) { v = v == null ? '' : v[p]; }); return v == null ? '' : String(v); }
  function thay(s) { return s.replace(RE, function (_, k) { return lay(k); }); }
  C.thay = thay;
  function quet() {
    if (document.title.indexOf('{{') > -1) MAU.push({ title: true, m: document.title });
    var w = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) { if (n.nodeValue.indexOf('{{') > -1) MAU.push({ n: n, m: n.nodeValue }); continue; }
      for (var i = 0; i < n.attributes.length; i++) {
        var a = n.attributes[i]; if (a.value.indexOf('{{') > -1) MAU.push({ n: n, a: a.name, m: a.value });
      }
    }
  }
  function ve() {
    MAU.forEach(function (x) {
      var v = thay(x.m);
      if (x.title) document.title = v; else if (x.a) x.n.setAttribute(x.a, v); else x.n.nodeValue = v;
    });
  }
  async function napTenant() {
    for (var i = 0; i < 50 && !window.supabase; i++) await new Promise(function (r) { setTimeout(r, 100); });
    if (!window.supabase) return;
    try {
      var sb = C._sb || (C._sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey));
      var s = await sb.auth.getSession();
      if (!s.data || !s.data.session) return;
      var t = await sb.from('tenants').select('*').limit(1).maybeSingle();
      var b = await sb.from('vc_branches').select('*').order('code');
      dat(t.data || {}, b.data || []);
      try { localStorage.setItem(TCACHE, JSON.stringify({ uid: s.data.session.user.id, t: t.data || {}, b: b.data || [] })); } catch (e) {}
      ve();
      document.dispatchEvent(new CustomEvent('aipos-tenant-ready', { detail: C }));
    } catch (e) { console.warn('[AIPOS] không nạp được thông tin doanh nghiệp:', e && e.message); }
  }
  document.addEventListener('DOMContentLoaded', function () { quet(); ve(); napTenant(); });
})(window.CAUHINH);
