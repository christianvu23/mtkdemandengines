#!/usr/bin/env node
/**
 * Submit sample marketing leads to MTK Demand Engines Worker
 * 
 * Usage:
 *   node scripts/submit-sample-leads.mjs [token] [worker-url]
 * 
 * Defaults:
 *   token: mkt-demangen-2026
 *   url:   https://mtkdemandengines.christianvu23.workers.dev
 */

const TOKEN = process.argv[2] || 'mkt-demangen-2026';
const BASE = process.argv[3] || 'https://mtkdemandengines.christianvu23.workers.dev';

// Sample marketing leads from international sources (PPH, Freelancer, WarriorForum)
const SAMPLE_LEADS = [
  {
    source: 'peopleperhour',
    url: 'https://www.peopleperhour.com/freelance-jobs/digital-marketing/example-1',
    tieuDe: 'I need constant leads for a marketing company',
    noiDung: `We are a growing marketing agency looking for a freelancer who can generate qualified leads for our B2B services. 
    We need someone with experience in cold outreach, LinkedIn prospecting, and email marketing campaigns.
    Budget: $500-1000/month retainer. Remote work. Start immediately.
    Contact: anh.nguyen@email.com or Zalo 0909123456`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'peopleperhour',
    url: 'https://www.peopleperhour.com/freelance-jobs/social-media/example-2',
    tieuDe: 'Emails marketing campaign for our digital marketing services',
    noiDung: `Looking for an experienced email marketing specialist to create and execute campaigns for our digital marketing agency.
    We need automated email sequences, newsletter design, and A/B testing.
    Budget: $300-500. Timeline: 2 weeks.
    Contact: marketing@example.com`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'peopleperhour',
    url: 'https://www.peopleperhour.com/freelance-jobs/ecommerce/example-3',
    tieuDe: 'I am looking for Ecommerce digital marketing expert',
    noiDung: `We need a digital marketing expert to help grow our ecommerce store. 
    Services needed: Facebook Ads, Google Shopping, SEO optimization, and content marketing.
    Monthly retainer: $1000-2000. Long-term collaboration preferred.
    Contact via email: ecom.store@gmail.com or Skype: live:ecomstore`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'freelancer',
    url: 'https://www.freelancer.com/projects/marketing/example-4',
    tieuDe: 'New brand marketing strategy',
    noiDung: `We are launching a new skincare brand in Vietnam and need a comprehensive marketing strategy.
    Scope: Brand positioning, social media strategy, influencer marketing plan, content calendar.
    Budget: 15-20 triệu VND. Timeline: 1 month.
    Contact: Zalo 0909123456 hoặc email: brand@example.com`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'freelancer',
    url: 'https://www.freelancer.com/projects/digital-marketing/example-5',
    tieuDe: 'Outreach and go to market for Leapfy',
    noiDung: `Tech startup looking for marketing consultant to plan go-to-market strategy.
    Need: Market research, competitor analysis, channel strategy, content plan.
    Budget: $800-1200. Remote work available.
    Please send proposal with similar past projects.`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'peopleperhour',
    url: 'https://www.peopleperhour.com/freelance-jobs/branding/example-6',
    tieuDe: 'Content creator for fashion brand social media',
    noiDung: `Fashion brand needs content creator for TikTok, Instagram and Facebook.
    We need: 20 video clips/month, 30 photos/month, caption writing.
    Must have experience in fashion/beauty niche.
    Budget: 8-12 triệu/tháng. Hợp tác lâu dài.
    Liên hệ: Zalo 0909123456`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'peopleperhour',
    url: 'https://www.peopleperhour.com/freelance-jobs/video-production/example-7',
    tieuDe: 'Video editor for YouTube channel',
    noiDung: `Looking for a talented video editor for our YouTube channel (100k+ subs).
    Tasks: Edit 4 videos/month, thumbnail design, basic motion graphics.
    Must have experience with Premiere Pro and After Effects.
    Budget: $400-600/month retainer.
    Contact: channel@email.com`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'freelancer',
    url: 'https://www.freelancer.com/projects/seo/example-8',
    tieuDe: 'SEO specialist for Vietnamese ecommerce site',
    noiDung: `Cần chuyên viên SEO cho website thương mại điện tử.
    Yêu cầu: SEO tổng thể, tối ưu tốc độ, content SEO, backlink building.
    Mục tiêu: Top 10 Google cho 20 từ khóa chính trong 3 tháng.
    Ngân sách: 10-15 triệu/tháng.
    Liên hệ: Zalo 0909123456`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'warriorforum',
    url: 'https://www.warriorforum.com/marketing/example-9',
    tieuDe: 'Need Facebook Ads expert for health product launch',
    noiDung: `I'm launching a new health supplement product in Vietnam market.
    Need a Facebook Ads expert who can set up and manage campaigns.
    Budget: $2000/month for ads + management fee $500.
    Must have experience with health/wellness niche.
    Contact: health.biz@example.com`,
    postedAt: new Date().toISOString(),
  },
  {
    source: 'freelancer',
    url: 'https://www.freelancer.com/projects/design/example-10',
    tieuDe: 'Thiết kế bộ nhận diện thương hiệu cho quán cafe',
    noiDung: `Sắp khai trương quán cafe tại Quận 1, TP.HCM. Cần thiết kế:
    - Logo + bộ nhận diện thương hiệu
    - Menu design
    - Banner social media
    - Flyer khai trương
    Ngân sách: 5-8 triệu. Deadline: 2 tuần.
    Liên hệ: Zalo 0909123456`,
    postedAt: new Date().toISOString(),
  },
];

async function main() {
  console.log(`Submitting ${SAMPLE_LEADS.length} sample leads to ${BASE}/api/demand/nap...`);
  
  const response = await fetch(`${BASE}/api/demand/nap`, {
    method: 'POST',
    headers: {
      'X-Demand-Token': TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ leads: SAMPLE_LEADS }),
  });
  
  const result = await response.json();
  
  console.log(`\n✅ Status: ${response.status}`);
  console.log(`📊 Tổng gửi: ${result.tong_vao}`);
  console.log(`📥 Đã vào inbox: ${result.da_day_vao_inbox}`);
  console.log(`🚫 Bỏ qua: ${result.bo_qua}`);
  console.log(`🏷️  Run label: ${result.run_label}`);
  
  if (result.xem_truoc && result.xem_truoc.length > 0) {
    console.log('\n📋 Preview:');
    result.xem_truoc.forEach((lead, i) => {
      console.log(`  ${i+1}. [${lead.hang}] ${lead.tieu_de?.slice(0, 60)} — ${lead.diem}/100`);
    });
  }
  
  if (result.buoc_tiep) {
    console.log(`\n💡 ${result.buoc_tiep}`);
  }
}

main().catch(console.error);