// src/core/nhucau.js — Phân loại nhu cầu Marketing từ text tiếng Việt.
//
// Phạm vi dịch vụ do Christian xác nhận 09/08/2026:
//   content & quản trị kênh social · quay dựng & thiết kế · branding & thương hiệu cá nhân
//   · performance/bán hàng/cộng đồng · quảng cáo · báo chí (PR) · sự kiện
//
// LƯU Ý: đây là bộ luật từ khoá, KHÔNG phải mô hình ngôn ngữ. Nó cố ý "thà bắt thừa
// còn hơn bỏ sót" ở tầng này; việc loại bỏ tinh vi hơn để cho tầng LLM (Qualifier).

import { chuanHoaText } from './chuanhoa.js';

/** Bộ từ khoá theo từng nhóm nhu cầu. Đã bỏ dấu để khớp với chuanHoaText(). */
export const TU_KHOA_NHU_CAU = {
  content: ['content', 'noi dung', 'bai viet', 'caption', 'copywriter', 'copywriting',
    'len bai', 'viet bai', 'kich ban', 'storyboard', 'quan tri fanpage', 'quan ly fanpage',
    'admin page', 'cham soc fanpage', 'xay kenh', 'phat trien kenh', 'seeding', 'marketing'],
  video: ['quay', 'dung phim', 'dung video', 'editor', 'edit video', 'video', 'tiktok',
    'reels', 'short', 'youtube', 'quay dung', 'hau ky', 'motion', 'animation', 'tvc',
    'photographer', 'chup anh', 'chup hinh', 'studio'],
  design: ['thiet ke', 'designer', 'design', 'banner', 'poster', 'an pham', 'do hoa',
    'graphic', 'bo nhan dien', 'logo', 'illustration', 'ui ux', 'catalogue', 'profile cong ty'],
  branding: ['branding', 'thuong hieu', 'nhan dien thuong hieu', 'dinh vi', 'brand',
    'thuong hieu ca nhan', 'personal brand', 'xay dung hinh anh', 'kol', 'koc', 'influencer'],
  ads: ['chay ads', 'chay quang cao', 'quang cao', 'ads', 'facebook ads', 'google ads',
    'tiktok ads', 'performance', 'toi uu quang cao', 'target', 'ngan sach quang cao',
    'roas', 'cpa', 'phu trach ads'],
  sales: ['ban hang', 'gio hang', 'chot don', 'ra don', 'doanh so', 'phu ban hang',
    'san thuong mai', 'shopee', 'lazada', 'tiktok shop', 'livestream', 'live stream',
    'affiliate', 'sale online'],
  community: ['cong dong', 'community', 'group', 'nhom', 'xay nhom', 'quan tri nhom',
    'cham soc cong dong', 'fanclub'],
  pr: ['pr', 'bao chi', 'truyen thong', 'bai pr', 'dang bao', 'press', 'thong cao',
    'khung hoang truyen thong', 'booking bao'],
  event: ['su kien', 'event', 'to chuc su kien', 'khai truong', 'ra mat san pham',
    'launching', 'workshop', 'hoi thao', 'activation'],
};

/**
 * Nhu cầu NGOÀI phạm vi dịch vụ — dùng để loại, không phải để chấm điểm.
 * Ví dụ lập trình, kế toán, dịch thuật thuần, sales, kinh doanh.
 */
export const TU_KHOA_NGOAI_PHAM_VI = [
  // IT/Programming
  'lap trinh', 'developer', 'backend', 'frontend', 'fullstack', 'react', 'nodejs',
  'flutter', 'android', 'ios', 'devops', 'kiem thu', 'tester', 'qa qc',
  'software engineer', 'programmer', 'coder',
  
  // Finance/Admin
  'ke toan', 'kiem toan', 'thu kho', 'tai chinh', 'finance', 'accountant',
  
  // Manual labor/Services
  'lai xe', 'tai xe', 'bao ve', 'giup viec', 'driver', 'security guard',
  
  // Translation/Education
  'dich thuat', 'phien dich', 'gia su', 'translator', 'interpreter', 'tutor',
  
  // Data entry
  'nhap lieu', 'data entry',
  
  // Telesales/Insurance
  'telesale bao hiem', 'insurance sales',
  
  // Sales/Business - KHÔNG phải marketing freelancer
  'giam doc kinh doanh', 'truong phong kinh doanh', 'nhan vien kinh doanh',
  'chuyen vien kinh doanh', 'sales', 'ban hang', 'kinh doanh', 'sales admin',
  'sales executive', 'sales manager', 'sales representative', 'sales supervisor',
  'telesale', 'tele sales', 'ban hang online', 'nhan vien ban hang',
  'cham soc khach hang', 'customer service', 'tư vấn khách hàng', 'tư vấn bán hàng',
  'account manager', 'business development', 'bd executive', 'bd manager',
  'pg sales', 'pb sales', 'sales thu nhap', 'sales khu vuc',
  
  // HR/Admin
  'nhan su', 'hr executive', 'hr manager', 'human resources', 'recruitment',
  'hanh chinh', 'admin staff', 'receptionist', 'le tan',
  
  // Operations/Logistics
  'van hanh', 'logistics', 'supply chain', 'giao hang', 'shipper', 'warehouse',
  
  // Manufacturing
  'san xuat', 'manufacturing', 'factory', 'cong nhan', 'operator',
];

/**
 * Dấu hiệu tuyển NHÂN SỰ TOÀN THỜI GIAN (không hợp freelance) —
 * không loại thẳng, nhưng rubric sẽ trừ điểm mạnh.
 */
export const TU_KHOA_TOAN_THOI_GIAN = [
  'toan thoi gian', 'full time', 'fulltime', 'nhan vien chinh thuc', 'bao hiem xa hoi',
  'thu viec', 'luong thang', 'lam viec tai van phong', 'gio hanh chinh', 'onsite',
];

/** Dấu hiệu hợp tác dài hạn (retainer) — rubric cộng điểm. */
export const TU_KHOA_RETAINER = [
  'hang thang', 'theo thang', 'dai han', 'lau dai', 'hop tac lau dai', 'retainer',
  'duy tri', 'goi thang', 'dong hanh',
];

/**
 * Dấu hiệu freelancer/project-based — ưu tiên cộng điểm.
 * Christian cần marketing freelancer, không phải full-time employee.
 */
export const TU_KHOA_FREELANCER = [
  'freelance', 'freelancer', 'project', 'du an', 'theo du an', 'thoi vu',
  'ngan han', 'part time', 'ban thoi gian', 'linh hoat', 'tu do',
  'remote', 'lam tu xa', 'work from home', 'wfh',
  'cong tac vien', 'ctv', 'collaborator', 'contractor',
  'bao gia', 'chao gia', 'bid', 'proposal',
  'theo gio', 'theo project', 'mot lan', 'ngan han',
];

function demTrung(textDaChuan, danhSach) {
  const trung = [];
  for (const tk of danhSach) if (textDaChuan.includes(tk)) trung.push(tk);
  return trung;
}

/**
 * Phân loại nhu cầu từ text.
 * @param {string} text tiêu đề + nội dung
 * @returns {{nhuCau: string[], ngoaiPhamVi: string[], toanThoiGian: boolean,
 *            retainer: boolean, freelancer: boolean, tuKhoaTrung: Record<string,string[]>}}
 */
export function phanLoaiNhuCau(text) {
  const t = chuanHoaText(text);
  const tuKhoaTrung = {};
  const nhuCau = [];

  for (const [nhom, tuKhoa] of Object.entries(TU_KHOA_NHU_CAU)) {
    const trung = demTrung(t, tuKhoa);
    if (trung.length > 0) {
      nhuCau.push(nhom);
      tuKhoaTrung[nhom] = trung;
    }
  }

  return {
    nhuCau,
    ngoaiPhamVi: demTrung(t, TU_KHOA_NGOAI_PHAM_VI),
    toanThoiGian: demTrung(t, TU_KHOA_TOAN_THOI_GIAN).length > 0,
    retainer: demTrung(t, TU_KHOA_RETAINER).length > 0,
    freelancer: demTrung(t, TU_KHOA_FREELANCER).length > 0,
    tuKhoaTrung,
  };
}

/** Suy ra hình thức hợp tác, ưu tiên freelancer/project-based. */
export function suyRaHinhThuc(text) {
  const pl = phanLoaiNhuCau(text);
  
  // Ưu tiên freelancer signals
  if (pl.freelancer) return 'freelance';
  
  // Full-time employee signals
  if (pl.toanThoiGian) return 'tuyen_dung';
  
  // Retainer signals
  if (pl.retainer) return 'retainer';
  
  // Project-based signals
  const t = chuanHoaText(text);
  if (/(du an|project|freelance|thoi vu|part time|cong nhat|theo dau viec)/.test(t)) return 'du_an';
  
  return 'khong_ro';
}

/** Đoán khu vực. Trả 'Hà Nội' | 'TP.HCM' | 'Đà Nẵng' | 'Remote' | 'Không rõ'. */
export function doanKhuVuc(text) {
  const t = chuanHoaText(text);
  if (/(ha noi|hanoi|hn |thu do|cau giay|dong da|hoan kiem|ba dinh|thanh xuan|my dinh)/.test(` ${t} `)) return 'Hà Nội';
  if (/(ho chi minh|hcm|tphcm|sai gon|saigon|quan 1|quan 3|quan 7|binh thanh|phu nhuan|thu duc|go vap|tan binh)/.test(t)) return 'TP.HCM';
  if (/(da nang|danang)/.test(t)) return 'Đà Nẵng';
  if (/(remote|online|tu xa|lam viec tai nha|wfh)/.test(t)) return 'Remote';
  return 'Không rõ';
}
