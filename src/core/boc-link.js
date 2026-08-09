// src/core/boc-link.js — Tách link bài đăng ra khỏi một trang danh sách.
//
// ============================================================================
// VÌ SAO CÓ MODULE NÀY
// Bản đầu bắt mỗi nguồn phải khai `regex_link_bai` thủ công. Nhưng phiên xây dựng
// không xem được HTML thật của vLance (403), nên regex đó không điền được — Hunter
// đứng im. Viết regex mò là bịa, nên thay vì thế: suy ra link bài bằng CẤU TRÚC.
//
// Ý tưởng: trong một trang danh sách, link tới bài đăng có ba đặc điểm thống kê:
//   1. cùng host với trang danh sách
//   2. đường dẫn SÂU HƠN trang danh sách và có phần định danh riêng (slug/số)
//   3. LẶP LẠI theo một khuôn chung, trong khi link điều hướng thì mỗi cái một kiểu
// Nhóm link theo "khuôn đường dẫn" rồi lấy nhóm đông nhất — đó gần như luôn là danh
// sách bài. Cách này không phụ thuộc CSS, không phụ thuộc redesign, và test được.
//
// Hàm thuần, không I/O.
// ============================================================================

/** Đuôi file và tiền tố không bao giờ là bài đăng. */
const DUOI_LOAI = /\.(png|jpe?g|gif|svg|webp|css|js|ico|pdf|zip|mp4|woff2?)($|\?)/i;
const GIAO_THUC_LOAI = /^(mailto:|tel:|javascript:|data:|#)/i;

/** Đoạn đường dẫn mang tính điều hướng — không phải bài. */
const DOAN_DIEU_HUONG = new Set([
  'login', 'signin', 'signup', 'register', 'dang-nhap', 'dang-ky', 'logout',
  'about', 'gioi-thieu', 'lien-he', 'contact', 'help', 'ho-tro', 'faq',
  'terms', 'privacy', 'chinh-sach', 'quy-che', 'dieu-khoan', 'blog', 'tin-tuc',
  'search', 'tim-kiem', 'category', 'danh-muc', 'tag', 'page', 'trang',
  'freelancer', 'freelancers', 'nha-tuyen-dung', 'employer', 'user', 'profile',
]);

/** Lấy mọi URL tuyệt đối trong markdown hoặc HTML. */
export function layTatCaLink(noiDung, urlGoc) {
  const raw = String(noiDung ?? '');
  const ket = new Set();

  // markdown [nhãn](url) · html href="url" · URL trần
  const mau = [
    /\]\(\s*(https?:\/\/[^\s)]+|\/[^\s)]+)\s*\)/g,
    /href\s*=\s*["']([^"']+)["']/gi,
    /(?<![("'\w])(https?:\/\/[^\s"'<>)\]]+)/g,
  ];
  for (const re of mau) {
    let m;
    while ((m = re.exec(raw)) !== null) {
      const u = m[1];
      if (!u || GIAO_THUC_LOAI.test(u)) continue;
      try {
        ket.add(new URL(u, urlGoc).toString());
      } catch { /* URL rác — bỏ qua */ }
    }
  }
  return [...ket];
}

/** Bỏ query + fragment, trả về mảng đoạn đường dẫn. */
export function doanDuongDan(u) {
  try {
    return new URL(u).pathname.split('/').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Khuôn đường dẫn: thay đoạn "có vẻ là định danh" bằng ký hiệu chung.
 * /du-an/thiet-ke-logo-12345  →  /du-an/:slug
 * /viec/8899                  →  /viec/:id
 */
export function khuonDuongDan(u) {
  return '/' + doanDuongDan(u).map((d) => {
    if (/^\d+$/.test(d)) return ':id';
    // slug: dài, có gạch nối hoặc chứa số → nhiều khả năng là định danh riêng
    if (d.length >= 12 && (d.includes('-') || /\d/.test(d))) return ':slug';
    return d;
  }).join('/');
}

function laUngVienBai(u, hostGoc, khuonDanhSach) {
  if (DUOI_LOAI.test(u)) return false;
  let host;
  try { host = new URL(u).host.replace(/^www\./, ''); } catch { return false; }
  if (host !== hostGoc) return false;

  const doan = doanDuongDan(u);
  if (doan.length === 0) return false;

  // KHÔNG so theo độ sâu: link bài thường nằm ở nhánh khác chứ không sâu hơn
  // (vLance: danh sách /viec-lam-freelance/cpath_… và bài /du-an/… đều sâu 2).
  // Thay vào đó loại các URL CÙNG KHUÔN với chính trang danh sách — đó là
  // phân trang và biến thể bộ lọc, không phải bài.
  if (khuonDuongDan(u) === khuonDanhSach) return false;

  if (doan.some((d) => DOAN_DIEU_HUONG.has(d.toLowerCase()))) return false;

  const cuoi = doan[doan.length - 1];
  // Đoạn cuối phải trông như định danh riêng, không phải một mục điều hướng
  return /^\d+$/.test(cuoi) || (cuoi.length >= 8 && (cuoi.includes('-') || /\d/.test(cuoi)));
}

/**
 * Tách link bài đăng từ nội dung một trang danh sách.
 *
 * @param {string} noiDung   markdown hoặc HTML của trang danh sách
 * @param {string} urlDanhSach
 * @param {object} [tuyChon]
 * @param {number} [tuyChon.toiThieuMoiNhom=3] nhóm phải có ít nhất bấy nhiêu link mới được coi là danh sách bài
 * @param {number} [tuyChon.tran=40]
 * @param {string} [tuyChon.regexBatBuoc] nếu nguồn ĐÃ biết khuôn thật thì ưu tiên dùng, bỏ qua suy luận
 * @returns {{links:string[], khuon:string|null, cachChon:string, thongKe:object}}
 */
export function bocLinkBai(noiDung, urlDanhSach, tuyChon = {}) {
  const { toiThieuMoiNhom = 3, tran = 40, regexBatBuoc = null } = tuyChon;

  const tatCa = layTatCaLink(noiDung, urlDanhSach);

  // Nguồn đã khai khuôn thật → luôn ưu tiên, suy luận chỉ là phương án dự phòng
  if (regexBatBuoc) {
    let re;
    try { re = new RegExp(regexBatBuoc); } catch {
      return { links: [], khuon: null, cachChon: 'regex_sai_cu_phap', thongKe: { tongLink: tatCa.length } };
    }
    const links = tatCa.filter((u) => re.test(u)).slice(0, tran);
    return { links, khuon: regexBatBuoc, cachChon: 'regex_khai_bao', thongKe: { tongLink: tatCa.length, khop: links.length } };
  }

  let hostGoc, khuonDanhSach;
  try {
    hostGoc = new URL(urlDanhSach).host.replace(/^www\./, '');
    khuonDanhSach = khuonDuongDan(urlDanhSach);
  } catch {
    return { links: [], khuon: null, cachChon: 'url_danh_sach_sai', thongKe: {} };
  }

  const ungVien = tatCa.filter((u) => laUngVienBai(u, hostGoc, khuonDanhSach));

  // Gom theo khuôn, chọn nhóm đông nhất
  const nhom = new Map();
  for (const u of ungVien) {
    const k = khuonDuongDan(u);
    if (!nhom.has(k)) nhom.set(k, []);
    nhom.get(k).push(u);
  }
  const xepHang = [...nhom.entries()].sort((a, b) => b[1].length - a[1].length);
  const dau = xepHang[0];

  if (!dau || dau[1].length < toiThieuMoiNhom) {
    return {
      links: [], khuon: null, cachChon: 'khong_du_tin_hieu',
      thongKe: { tongLink: tatCa.length, ungVien: ungVien.length, nhomLonNhat: dau?.[1].length ?? 0 },
    };
  }

  return {
    links: [...new Set(dau[1])].slice(0, tran),
    khuon: dau[0],
    cachChon: 'suy_luan_theo_khuon',
    thongKe: {
      tongLink: tatCa.length, ungVien: ungVien.length,
      soNhom: nhom.size, nhomLonNhat: dau[1].length,
      cacKhuonKhac: xepHang.slice(1, 4).map(([k, v]) => ({ khuon: k, so: v.length })),
    },
  };
}
