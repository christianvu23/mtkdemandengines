#!/usr/bin/env node
/**
 * Thêm các nguồn mới vào Supabase demand_sources
 * 
 * Usage: node scripts/add-new-sources.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://emkwknwcyyewevmmoxzj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVta3drbndjeXlld2V2bW1veHpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM1MzQyMywiZXhwIjoyMTAwOTI5NDIzfQ._3nOYpssCVUAGZTfQZ6SIU_cZJ0m24zTFCoVA1v5B0Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const NEW_SOURCES = [
  {
    ma: 'fastlance',
    ten: 'Fastlance.vn',
    loai: 'san_freelance',
    base_url: 'https://fastlance.vn',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://fastlance.vn/dich-vu/marketing',
      regex_link_bai: 'fastlance\\.vn/dich-vu/',
    },
    dang_bat: true,
    ttl_gio: 168,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 180,
    rui_ro_tos: 'Thấp — nội dung công khai, nên tôn trọng robots.txt + rate limit',
    ghi_chu: 'Sàn freelance Việt, mảng marketing/design',
  },
  {
    ma: 'vietgigs',
    ten: 'VietGigs.vn',
    loai: 'san_freelance',
    base_url: 'https://vietgigs.vn',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://vietgigs.vn/gigs/social-media-ads',
      regex_link_bai: 'vietgigs\\.vn/gigs/',
    },
    dang_bat: true,
    ttl_gio: 168,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 180,
    rui_ro_tos: 'Thấp — nội dung công khai',
    ghi_chu: 'Gig platform cho social media, video, content',
  },
  {
    ma: 'gighit',
    ten: 'GigHit.vn',
    loai: 'san_freelance',
    base_url: 'https://gighit.vn',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://gighit.vn/gigs/marketing',
      regex_link_bai: 'gighit\\.vn/gigs/',
    },
    dang_bat: true,
    ttl_gio: 168,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 180,
    rui_ro_tos: 'Thấp — nội dung công khai',
    ghi_chu: 'Gig platform marketing/design',
  },
  {
    ma: 'jobsgo',
    ten: 'JobsGo.vn',
    loai: 'job_board',
    base_url: 'https://jobsgo.vn',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://jobsgo.vn/viec-lam/marketing',
      regex_link_bai: 'jobsgo\\.vn/viec-lam/',
    },
    dang_bat: true,
    ttl_gio: 336,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 360,
    rui_ro_tos: 'Trung bình — kiểm tra ToS trước khi scale',
    ghi_chu: 'Job board marketing/freelance',
  },
  {
    ma: 'careerviet',
    ten: 'CareerViet.vn',
    loai: 'job_board',
    base_url: 'https://careerviet.vn',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://careerviet.vn/viec-lam/Digital-Marketing-k-vi.html',
      regex_link_bai: 'careerviet\\.vn/viec-lam/',
    },
    dang_bat: true,
    ttl_gio: 336,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 360,
    rui_ro_tos: 'Trung bình',
    ghi_chu: 'Job board digital marketing',
  },
  {
    ma: 'job123',
    ten: '123Job.vn',
    loai: 'job_board',
    base_url: 'https://123job.vn',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://123job.vn/viec-lam/freelancer-marketing',
      regex_link_bai: '123job\\.vn/viec-lam/',
    },
    dang_bat: true,
    ttl_gio: 336,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 360,
    rui_ro_tos: 'Trung bình',
    ghi_chu: 'Job board freelance marketing',
  },
  {
    ma: 'blackhatworld',
    ten: 'BlackHatWorld',
    loai: 'forum',
    base_url: 'https://www.blackhatworld.com',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://www.blackhatworld.com/seo/marketplace/',
      regex_link_bai: 'blackhatworld\\.com/threads/',
    },
    dang_bat: true,
    ttl_gio: 168,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 180,
    rui_ro_tos: 'Trung bình — diễn đàn công khai, tuân thủ nội quy',
    ghi_chu: 'Diễn đàn marketing quốc tế, marketplace',
  },
  {
    ma: 'voz_marketing',
    ten: 'VOZ Marketing',
    loai: 'forum',
    base_url: 'https://voz.vn',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://voz.vn/f/marketing-PR.34/',
      regex_link_bai: 'voz\\.vn/t/',
    },
    dang_bat: true,
    ttl_gio: 168,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 180,
    rui_ro_tos: 'Trung bình — diễn đàn công khai',
    ghi_chu: 'Diễn đàn VOZ mảng Marketing/PR',
  },
  {
    ma: 'peopleperhour',
    ten: 'PeoplePerHour',
    loai: 'san_freelance',
    base_url: 'https://www.peopleperhour.com',
    transport: 'browser_run',
    cau_hinh: {
      url_danh_sach: 'https://www.peopleperhour.com/freelance-marketing-jobs',
      regex_link_bai: 'peopleperhour\\.com/freelance-jobs/',
    },
    dang_bat: true,
    ttl_gio: 168,
    tran_lead_moi_dot: 40,
    chu_ky_phut: 180,
    rui_ro_tos: 'Thấp — nội dung công khai',
    ghi_chu: 'Sàn freelance quốc tế, mảng marketing',
  },
];

async function main() {
  console.log(`Adding ${NEW_SOURCES.length} new sources to Supabase...\n`);
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const source of NEW_SOURCES) {
    try {
      // Check if source already exists
      const { data: existing } = await supabase
        .from('demand_sources')
        .select('ma')
        .eq('ma', source.ma)
        .maybeSingle();
      
      if (existing) {
        console.log(`  ⏭️  ${source.ma.padEnd(18)} ${source.ten.padEnd(25)} — đã tồn tại`);
        skipped++;
        continue;
      }
      
      const { error } = await supabase
        .from('demand_sources')
        .insert([source]);
      
      if (error) {
        console.log(`  ❌ ${source.ma.padEnd(18)} ${source.ten.padEnd(25)} — LỖI: ${error.message}`);
        errors++;
      } else {
        console.log(`  ✅ ${source.ma.padEnd(18)} ${source.ten.padEnd(25)} — ĐÃ THÊM`);
        added++;
      }
    } catch (e) {
      console.log(`  ❌ ${source.ma.padEnd(18)} ${source.ten.padEnd(25)} — LỖI: ${e.message}`);
      errors++;
    }
  }
  
  // Also update regex for existing sources
  console.log('\nCập nhật regex cho nguồn đã có...');
  try {
    const { error: updVlance } = await supabase
      .from('demand_sources')
      .update({ cau_hinh: { url_danh_sach: 'https://www.vlance.vn/viec-lam-freelance', regex_link_bai: 'vlance\\.vn/du-an/' } })
      .eq('ma', 'vlance')
      .is('cau_hinh->>regex_link_bai', null);
    
    if (updVlance) console.log(`  ❌ vlance: ${updVlance.message}`);
    else console.log('  ✅ vlance: cập nhật regex');
    
    const { error: updVnw } = await supabase
      .from('demand_sources')
      .update({ cau_hinh: { url_danh_sach: 'https://www.vietnamworks.com/part-time-kv', regex_link_bai: 'vietnamworks\\.com/.*-job' } })
      .eq('ma', 'vietnamworks')
      .is('cau_hinh->>regex_link_bai', null);
    
    if (updVnw) console.log(`  ❌ vietnamworks: ${updVnw.message}`);
    else console.log('  ✅ vietnamworks: cập nhật regex');
  } catch (e) {
    console.log('  ❌ Lỗi cập nhật regex:', e.message);
  }
  
  console.log(`\n📊 Kết quả:`);
  console.log(`  ✅ Đã thêm: ${added}`);
  console.log(`  ⏭️  Đã tồn tại: ${skipped}`);
  console.log(`  ❌ Lỗi: ${errors}`);
  
  // Verify total sources
  const { data: all, count } = await supabase
    .from('demand_sources')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Tổng số nguồn trong DB: ${count}`);
}

main().catch(console.error);