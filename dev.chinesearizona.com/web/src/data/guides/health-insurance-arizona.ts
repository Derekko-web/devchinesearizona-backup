import type { Guide } from '@/lib/types';

// Facts checked against the linked HealthCare.gov, Medicare.gov, and SSA pages
// on 2026-11-27.
export const healthInsuranceArizonaGuide: Guide = {
  slug: 'health-insurance-arizona-newcomers',
  section: 'healthcare',
  title: {
    en: 'Health Insurance in Arizona for Newcomer Families: Marketplace, AHCCCS, Medicare, and the 2027 Changes',
    zh: '亞利桑那新移民家庭健康保險指南：Marketplace、AHCCCS、Medicare 與 2027 年新規',
  },
  excerpt: {
    en: 'Open Enrollment deadlines, who can get Marketplace savings in 2027, Medicaid waiting periods for green card holders, plan types in plain language, and Medicare basics for parents who immigrate.',
    zh: '開放投保截止日、2027 年誰能拿到 Marketplace 保費補助、綠卡持有人的 Medicaid 等待期、各種保險計畫白話說明，以及移民父母的 Medicare 基本知識。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80',
  readTime: '9 min',
  publishedAt: '2026-11-27T17:20:00.000Z',
  updatedAt: '2026-11-27T17:20:00.000Z',
  body: [
    {
      en: 'Health insurance is the part of settling in that newcomers most often put off, and the part with the hardest deadlines. Open Enrollment for 2027 Marketplace plans runs from November 1, 2026 to January 15, 2027. Enroll by December 15 for coverage that starts January 1; enrolling from December 16 through January 15 gets coverage starting February 1. Arizona residents apply through HealthCare.gov.',
      zh: '健康保險是很多新移民最容易拖延、截止日卻最硬的一件事。2027 年 Marketplace 保險的開放投保期是 2026 年 11 月 1 日到 2027 年 1 月 15 日：12 月 15 日前投保，保單 1 月 1 日生效；12 月 16 日到 1 月 15 日之間投保，則從 2 月 1 日生效。亞利桑那居民透過 HealthCare.gov 申請。',
    },
    {
      en: 'The biggest change for immigrant families is about money, not access. HealthCare.gov says that starting January 1, 2027, only lawful permanent residents (green card holders), Cuban or Haitian entrants, and Compact of Free Association migrants qualify for Marketplace savings. People with other lawful statuses, including valid work or student visas, may still buy Marketplace coverage, but without the premium tax credit or the extra savings on out-of-pocket costs. If you are on H-1B, L-1, F-1, or a similar status, budget for the full premium in 2027.',
      zh: '對移民家庭來說，最大的改變不在能不能買，而在補助。HealthCare.gov 表示，自 2027 年 1 月 1 日起，只有綠卡持有人（永久居民）、古巴或海地入境者，以及自由聯合協定（COFA）移民能拿到 Marketplace 的費用補助。其他合法身分（包括有效的工作或學生簽證）仍可以購買 Marketplace 保險，但拿不到保費稅收抵免，也沒有自付額的額外減免。持 H-1B、L-1、F-1 等身分的人，2027 年請以全額保費做預算。',
    },
    {
      en: 'This guide was checked against HealthCare.gov, Medicare.gov, and Social Security pages on November 27, 2026. It explains the rules in plain language; your own eligibility depends on income, immigration status, and household, so confirm on the official sites or with a licensed professional.',
      zh: '本文依據 2026 年 11 月 27 日查證的 HealthCare.gov、Medicare.gov 與社會安全局網頁整理，用白話說明規則。實際資格取決於收入、移民身分與家庭狀況，請到官方網站或找有執照的專業人士確認。',
    },
  ],
  quickChecklist: [
    {
      en: 'If you need coverage starting January 1, 2027, choose and enroll in a Marketplace plan by December 15, 2026.',
      zh: '需要 2027 年 1 月 1 日起生效的保險，請在 2026 年 12 月 15 日前選好並完成 Marketplace 投保。',
    },
    {
      en: 'Write down each family member\'s immigration status and the date they got it. Marketplace savings and Medicaid rules both depend on status, not only income.',
      zh: '把每位家人的移民身分與取得日期寫下來。Marketplace 補助與 Medicaid 資格都看身分，不只看收入。',
    },
    {
      en: 'Estimate your household income for 2027. Premium tax credits are generally available to eligible people with income between 100% and 400% of the federal poverty level.',
      zh: '估算 2027 年的家庭收入。符合身分條件、收入介於聯邦貧窮線 100% 到 400% 的人，一般可以申請保費稅收抵免。',
    },
    {
      en: 'Before you pick a plan, check that your doctors, children\'s pediatrician, and nearest hospital are in its network.',
      zh: '選計畫前，先確認你的醫師、孩子的小兒科醫師與最近的醫院都在該計畫的網路內。',
    },
    {
      en: 'If you moved to Arizona from another state or a new county, check whether you qualify for a Special Enrollment Period outside Open Enrollment.',
      zh: '如果是從外州或其他郡搬來，確認自己是否符合開放投保期以外的特殊投保期（Special Enrollment Period）。',
    },
    {
      en: 'For parents turning 65, mark the 7-month Medicare enrollment window, which starts 3 months before the birthday month.',
      zh: '父母快滿 65 歲的話，記下 Medicare 的 7 個月投保期，從生日月份的前 3 個月開始。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Reading a plan without getting lost', zh: '看懂保險計畫' },
      bullets: [
        {
          en: 'HMO plans usually cover care only from doctors who work for or contract with the HMO, and generally do not cover out-of-network care except in an emergency. EPO plans also cover only in-network care except in emergencies.',
          zh: 'HMO 通常只給付與該 HMO 合作的醫師，除了急診之外，網路外的醫療一般不給付。EPO 同樣只給付網路內的醫療，急診除外。',
        },
        {
          en: 'PPO plans cost you less when you use in-network providers, and let you see out-of-network providers without a referral for an additional cost. POS plans require a referral from your primary care doctor to see a specialist.',
          zh: 'PPO 在網路內看診比較便宜，也可以不經轉診去看網路外的醫師，但要多付費用。POS 則要先由家庭醫師轉診才能看專科。',
        },
        {
          en: 'The metal levels describe cost sharing, not quality. On average the plan pays about 60% of covered costs for Bronze, 70% for Silver, 80% for Gold, and 90% for Platinum, and you pay the rest.',
          zh: '金屬等級代表費用分擔，跟醫療品質無關。平均來說，銅級計畫約給付 60% 的承保費用、銀級 70%、金級 80%、白金級 90%，其餘由你自付。',
        },
        {
          en: 'The deductible is what you pay for covered services before the plan starts to pay. The out-of-pocket maximum is the most you pay for covered services in a plan year: up to $12,000 for an individual and $24,000 for a family in 2027.',
          zh: '自付額（deductible）是保險開始給付前，你要先自己付的承保醫療費用。自付上限（out-of-pocket maximum）是一個保單年度內你最多要付的承保費用；2027 年個人最高 12,000 美元、家庭 24,000 美元。',
        },
      ],
    },
    {
      title: { en: 'Marketplace and Medicaid rules for immigrants', zh: '移民適用的 Marketplace 與 Medicaid 規定' },
      bullets: [
        {
          en: 'HealthCare.gov\'s page on lawfully present immigrants says they can buy Marketplace coverage, and that "lawfully present" includes qualified non-citizens, several humanitarian statuses, and people with valid non-immigrant visas.',
          zh: 'HealthCare.gov 的「合法居留移民」頁面說明，合法居留的移民可以購買 Marketplace 保險；「合法居留」包括合格非公民、多種人道身分，以及持有效非移民簽證的人。',
        },
        {
          en: 'HealthCare.gov\'s immigration status page lists work visas (it names H1, H-2A, and H-2B) and student visas among the statuses that may buy Marketplace coverage, and notes that DACA recipients are not eligible for Marketplace coverage.',
          zh: 'HealthCare.gov 的「移民身分」頁面把工作簽證（頁面列出 H1、H-2A、H-2B）與學生簽證列為可購買 Marketplace 保險的身分，並註明 DACA 身分者不能投保 Marketplace。',
        },
        {
          en: 'Arizona\'s Medicaid program is AHCCCS, and KidsCare is its program for children. Under federal rules, green card holders who meet state income and residency rules are generally eligible for Medicaid and CHIP only after a 5-year waiting period from the date they became qualified non-citizens. Green card holders who were previously refugees or asylees do not have that wait.',
          zh: '亞利桑那的 Medicaid 叫 AHCCCS，兒童方案叫 KidsCare。依聯邦規定，符合州收入與居住條件的綠卡持有人，一般要從取得「合格非公民」身分起等滿 5 年，才能申請 Medicaid 與 CHIP；原本是難民或庇護身分的綠卡持有人不用等。',
        },
        {
          en: 'If you are in the 5-year waiting period, you may still be able to buy Marketplace coverage. HealthCare.gov also notes that states may remove the waiting period for children and pregnant women who are lawfully residing, so ask AHCCCS about your family.',
          zh: '在 5 年等待期內，仍可能可以購買 Marketplace 保險。HealthCare.gov 也提到，各州可以為合法居住的兒童與孕婦取消等待期，請向 AHCCCS 詢問你家的情況。',
        },
        {
          en: 'Medicaid may cover treatment of an emergency medical condition for people who meet all other Medicaid rules, such as income and state residency, but do not have an eligible immigration status.',
          zh: '如果符合收入、州居住等其他所有 Medicaid 條件，只是移民身分不符，Medicaid 仍可能給付緊急醫療狀況的治療。',
        },
        {
          en: 'HealthCare.gov points to new federal guidance on "public charge." If anyone in your household is applying for a visa or a green card, read the USCIS public charge information before applying for Medicaid or CHIP.',
          zh: 'HealthCare.gov 提醒，聯邦政府對「公共負擔」（public charge）有新的認定指引。家中如果有人正在申請簽證或綠卡，申請 Medicaid 或 CHIP 前請先看 USCIS 的公共負擔說明。',
        },
      ],
    },
    {
      title: { en: 'Moving, job changes, and enrolling outside Open Enrollment', zh: '搬家、換工作與開放投保期以外的投保' },
      bullets: [
        {
          en: 'Moving to a new home in a new ZIP code or county may qualify you for a Special Enrollment Period. Moving only for medical treatment or staying somewhere on vacation does not.',
          zh: '搬到不同郵遞區號或郡的新家，可能符合特殊投保期。只為了就醫或度假暫住則不算。',
        },
        {
          en: 'If you start a job with health benefits, compare the employer plan\'s premium, deductible, and network with a Marketplace plan before you decide. Visa holders do not get Marketplace savings in 2027, so the employer plan may well cost less.',
          zh: '如果新工作有提供健康保險，先比較僱主方案與 Marketplace 計畫的保費、自付額與網路。2027 年簽證持有人拿不到 Marketplace 補助，僱主方案很可能比較便宜。',
        },
      ],
    },
    {
      title: { en: 'Medicare for parents who immigrate', zh: '移民父母的 Medicare' },
      bullets: [
        {
          en: 'Medicare is for people 65 or older who are US citizens or nationals, lawful permanent residents, Cuban-Haitian entrants, or Compact of Free Association migrants. You sign up for Parts A and B through Social Security.',
          zh: 'Medicare 的對象是 65 歲以上的美國公民或國民、永久居民（綠卡）、古巴海地入境者，或 COFA 移民。A 部分與 B 部分透過社會安全局（SSA）申請。',
        },
        {
          en: 'Part A (hospital insurance) is free if you or your spouse worked and paid Medicare taxes for at least 10 years. Parents who immigrate later in life may not have that work history, and without it Part A has a monthly premium if they buy it. Most people also pay a monthly Part B premium based on income.',
          zh: 'A 部分（住院保險）只有在本人或配偶工作並繳 Medicare 稅滿 10 年時才免費。晚年才移民的父母可能沒有這樣的工作紀錄，沒有的話，購買 A 部分就要每月繳保費。B 部分大多數人也要每月繳費，金額依收入而定。',
        },
        {
          en: 'Medicare\'s enrollment booklet says a green card holder 65 or older who is not eligible for premium-free Part A can buy Part B after living in the US without a break for the 5 years immediately before applying. Plan for that gap when a parent first arrives.',
          zh: 'Medicare 的投保手冊說明，65 歲以上、不符合免費 A 部分的綠卡持有人，要在申請前連續住在美國滿 5 年，才能購買 B 部分。父母剛移民時，記得先規劃這段空窗期。',
        },
        {
          en: 'The Initial Enrollment Period lasts 7 months, from 3 months before the month you turn 65 to 3 months after. Missing it can mean waiting for the General Enrollment Period (January 1 to March 31) and paying a late enrollment penalty for as long as you have Part B.',
          zh: '首次投保期共 7 個月，從滿 65 歲當月的前 3 個月到後 3 個月。錯過的話，可能要等每年 1 月 1 日到 3 月 31 日的一般投保期，並在持有 B 部分期間一直繳交延遲投保罰款。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'Do not assume last year\'s savings will continue. If your household is not a green card, Cuban or Haitian entrant, or COFA household, recheck the 2027 premium before January 1.',
      zh: '不要以為今年的補助明年還有。如果家中成員不是綠卡、古巴海地入境者或 COFA 身分，請在 1 月 1 日前重新確認 2027 年保費。',
    },
    {
      en: 'Provider directories can be outdated. Call the clinic to confirm it takes your exact plan, not just the insurance company name, and ask whether a Mandarin or Cantonese speaker is available.',
      zh: '醫師名錄可能過時。打電話給診所，確認他們接受你「這一個」計畫（不只是保險公司名稱），並詢問是否有說國語或粵語的人員。',
    },
    {
      en: 'Parents on short visits are a different situation from parents who immigrate. Ask a licensed insurance agent what coverage fits a visit before the trip.',
      zh: '短期探親的父母和移民的父母情況不同。出發前，請向有執照的保險經紀人詢問適合探親的保障。',
    },
  ],
  officialResources: [
    {
      label: { en: 'Open Enrollment dates and deadlines', zh: '開放投保日期與截止日' },
      url: 'https://www.healthcare.gov/quick-guide/dates-and-deadlines/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Coverage for lawfully present immigrants', zh: '合法居留移民的保險資格' },
      url: 'https://www.healthcare.gov/immigrants/lawfully-present-immigrants/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Immigration statuses and Marketplace savings', zh: '移民身分與 Marketplace 補助' },
      url: 'https://www.healthcare.gov/immigrants/immigration-status/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Special Enrollment Periods', zh: '特殊投保期' },
      url: 'https://www.healthcare.gov/coverage-outside-open-enrollment/special-enrollment-period/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Plan types: HMO, PPO, EPO, POS', zh: '計畫類型：HMO、PPO、EPO、POS' },
      url: 'https://www.healthcare.gov/choose-a-plan/plan-types/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Metal categories', zh: '金屬等級說明' },
      url: 'https://www.healthcare.gov/choose-a-plan/plans-categories/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Out-of-pocket maximum', zh: '自付上限' },
      url: 'https://www.healthcare.gov/glossary/out-of-pocket-maximum-limit/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Parts of Medicare and who qualifies', zh: 'Medicare 各部分與資格' },
      url: 'https://www.ssa.gov/medicare/plan/medicare-parts',
      source: 'Social Security Administration',
    },
    {
      label: { en: 'When Medicare coverage starts', zh: 'Medicare 何時生效' },
      url: 'https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start',
      source: 'Medicare.gov',
    },
    {
      label: { en: 'Enrolling in Medicare Part A and Part B (booklet)', zh: 'Medicare A、B 部分投保手冊' },
      url: 'https://www.medicare.gov/publications/11036-enrolling-medicare-part-a-part-b.pdf',
      source: 'Medicare.gov',
    },
    {
      label: { en: 'AHCCCS (Arizona Medicaid)', zh: 'AHCCCS（亞利桑那 Medicaid）' },
      url: 'https://www.azahcccs.gov/',
      source: 'Arizona Health Care Cost Containment System',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not medical, legal, or insurance advice. Eligibility depends on your income, status, and household. A licensed insurance agent can compare plans with you, and our directory lists Chinese-speaking doctors and clinics as well as insurance and financial professionals across metro Phoenix.',
      zh: '本文為一般資訊，不構成醫療、法律或保險建議。資格取決於你的收入、身分與家庭狀況。有執照的保險經紀人可以陪你比較計畫；本站名錄列有大鳳凰城說中文的醫師、診所，以及保險與理財專業人士。',
    },
    categorySlugs: ['medical', 'legal-finance'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
