import type { Guide } from '@/lib/types';

// Facts checked against the linked Arizona IDA, CFPB, HUD, Maricopa County,
// and Arizona statute sources on 2026-11-27.
export const firstHomeMetroPhoenixGuide: Guide = {
  slug: 'first-home-buying-metro-phoenix',
  section: 'housing',
  title: {
    en: 'Buying Your First Home in Metro Phoenix: Steps, State Down Payment Help, and Property Tax',
    zh: '在大鳳凰城買第一間房：流程、州政府頭期款補助與房屋稅',
  },
  excerpt: {
    en: 'A first-time buyer\'s path through preapproval, Arizona\'s statewide Home Plus down payment program, Loan Estimates and the Closing Disclosure, and the Maricopa County steps that keep your property tax at the primary-residence rate.',
    zh: '首購族從貸款預先核准、亞利桑那全州 Home Plus 頭期款補助、比較貸款估價單與成交揭露書，到在 Maricopa 郡申報自住以適用自住房屋稅率的完整流程。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  readTime: '9 min',
  publishedAt: '2026-11-27T18:00:00.000Z',
  updatedAt: '2026-11-27T18:00:00.000Z',
  body: [
    {
      en: 'If you are renting in Chandler, Gilbert, Tempe, or north Phoenix while you decide where to settle, use that time to prepare. Before you tour a single house, sort out three things: how much a lender will approve, how much cash you really need at closing, and which programs you qualify for.',
      zh: '如果你正在 Chandler、Gilbert、Tempe 或北鳳凰城租房，還在決定要在哪裡落腳，這段時間正好拿來準備。看第一間房之前，先弄清楚三件事：貸款機構願意核貸多少、成交時實際要準備多少現金，以及自己符合哪些補助方案。',
    },
    {
      en: 'Arizona has a statewide down payment program that many buyers never hear about. Home Plus, run by the Arizona Industrial Development Authority, offers up to 4% assistance toward the down payment and closing costs in every Arizona county, city, and ZIP code, with a 2026 borrower income limit of $155,386. You do not apply to Home Plus directly; you use a participating lender.',
      zh: '亞利桑那有一個很多買家都沒聽過的全州頭期款補助方案。由亞利桑那產業發展局（Arizona IDA）辦理的 Home Plus，提供最高 4% 的頭期款與成交費用補助，適用全州所有郡、城市與郵遞區號；2026 年借款人收入上限為 155,386 美元。Home Plus 不接受買家直接申請，要透過參與方案的貸款機構辦理。',
    },
    {
      en: 'This guide is general information based on official pages checked on November 27, 2026. Program limits and rates change, so confirm current terms with the program and your lender before you sign anything.',
      zh: '本文為一般資訊，依據 2026 年 11 月 27 日查證的官方網頁整理。方案上限與利率都會變動，簽約前請向方案單位與貸款機構確認最新條件。',
    },
  ],
  quickChecklist: [
    {
      en: 'Pull your credit reports early and fix errors before you apply. A new arrival with a short US credit history should talk to lenders sooner rather than later.',
      zh: '提早調出信用報告，申請前先更正錯誤。剛來美國、信用紀錄較短的人，更應該早點和貸款機構談。',
    },
    {
      en: 'Get Loan Estimates from more than one lender. The Consumer Financial Protection Bureau encourages comparing them line by line.',
      zh: '向不只一家貸款機構索取貸款估價單（Loan Estimate）。美國消費者金融保護局（CFPB）建議逐項比較。',
    },
    {
      en: 'Ask each lender whether it participates in Home Plus or Arizona Is Home, and what the assistance would cost you in interest rate.',
      zh: '詢問每家貸款機構是否參與 Home Plus 或 Arizona Is Home，以及使用補助對利率有什麼影響。',
    },
    {
      en: 'If you plan to use Home Plus, one borrower must finish a pre-purchase homebuyer education course before closing. Do it early.',
      zh: '打算使用 Home Plus 的話，至少一位借款人必須在成交前完成購屋前教育課程，越早上完越好。',
    },
    {
      en: 'Check a real estate agent\'s license on the Arizona Department of Real Estate public database before you sign a buyer agreement.',
      zh: '簽買方經紀合約前，先到亞利桑那州房地產局（ADRE）的公開資料庫查詢經紀人執照。',
    },
    {
      en: 'Set aside time three business days before closing to read the Closing Disclosure against your Loan Estimate.',
      zh: '在成交前三個工作天預留時間，把成交揭露書（Closing Disclosure）和貸款估價單對照看清楚。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Arizona\'s Home Plus program, in plain terms', zh: '白話看懂 Home Plus' },
      bullets: [
        {
          en: 'Home Plus offers up to 4% of assistance for the down payment, closing costs, or both, and it is available year-round across the state. Its income limit was raised to $155,386 as of April 6, 2026, based on the borrowers\' gross income as the lender calculates it.',
          zh: 'Home Plus 提供最高 4% 的補助，可用於頭期款、成交費用或兩者，全年在全州都可以申請。收入上限自 2026 年 4 月 6 日起提高到 155,386 美元，以貸款機構計算的借款人稅前總收入為準。',
        },
        {
          en: 'The program page describes the assistance as a second mortgage with no interest and no monthly payment that is forgiven after 60 months. If you sell or refinance within those 60 months, it must be repaid. The program also mentions both forgivable and non-forgivable options, so ask your lender which one you are getting.',
          zh: '方案網頁說明，這筆補助是一筆免利息、免月付的第二順位貸款，滿 60 個月後全額免除；若在 60 個月內賣房或轉貸，就要償還。方案也提到有可免除與不可免除兩種選項，請問清楚貸款機構你用的是哪一種。',
        },
        {
          en: 'Home Plus says the interest rate on its first mortgage may be slightly higher than current market rates, and each assistance option has a different rate. Compare the total cost with and without assistance.',
          zh: 'Home Plus 表示，搭配方案的第一順位貸款利率可能略高於市場利率，而且不同補助選項的利率也不同。請比較有補助與沒補助的總成本。',
        },
        {
          en: 'One borrower must complete a pre-purchase homebuyer education course before closing, either with a Home Plus approved online provider or in person with a HUD-certified homebuyer education provider.',
          zh: '至少一位借款人要在成交前完成購屋前教育課程，可以上 Home Plus 認可的線上課程，或找 HUD 認證的購屋教育機構上實體課。',
        },
        {
          en: 'The Arizona IDA also runs a separate program, Arizona Is Home, with its own county income limits.',
          zh: 'Arizona IDA 另外還有 Arizona Is Home 方案，各郡有不同的收入上限。',
        },
      ],
    },
    {
      title: { en: 'From offer to closing', zh: '從出價到成交' },
      bullets: [
        {
          en: 'A Loan Estimate shows the key details of a mortgage you have requested. CFPB suggests checking that it matches what you discussed and asking about anything that looks different.',
          zh: '貸款估價單列出你申請的房貸重要條件。CFPB 建議確認內容與你和貸款機構談的一致，有不同就要問清楚。',
        },
        {
          en: 'Lenders are required to give you the Closing Disclosure three business days before your scheduled closing. CFPB calls those days the time to resolve problems, so do not leave the review for the closing table.',
          zh: '貸款機構必須在預定成交日前三個工作天提供成交揭露書。CFPB 提醒，這三天就是解決問題的時間，不要拖到成交當天才看。',
        },
        {
          en: 'If you buy in a subdivision, the Buyer Advisory posted by the Arizona Department of Real Estate tells buyers to read the subdivision Public Report before signing a purchase contract.',
          zh: '如果買的是新社區（subdivision）的房子，亞利桑那州房地產局公布的《買方須知》（Buyer Advisory）提醒買家，簽買賣合約前要先讀社區的公開報告（Public Report）。',
        },
        {
          en: 'HUD\'s website has a tool to find a HUD-certified housing counselor, who can help first-time buyers plan a budget and understand the purchase process.',
          zh: 'HUD 網站有查詢工具，可以找到 HUD 認證的住房諮詢員，協助首購族規劃預算、了解購屋流程。',
        },
      ],
    },
    {
      title: { en: 'After you get the keys: property tax', zh: '拿到鑰匙之後：房屋稅' },
      bullets: [
        {
          en: 'The Maricopa County Assessor treats a home as a primary residence (legal class 3.1) when it is the main home where you live for more than seven months of the year. Under Arizona law you can have only one primary residence, even if you own other homes.',
          zh: 'Maricopa 郡估價官把一年住滿七個月以上的主要住所列為自住房屋（法定類別 3.1）。依亞利桑那州法，每人只能有一個自住房屋，就算名下還有其他房子也一樣。',
        },
        {
          en: 'The Assessor notes that changing away from primary residence can remove the State Aid to Education credit, a reduction in school district property tax for owner-occupied homes. If your home is not listed as your primary residence, file the Request for Residential Legal Class Change.',
          zh: '估價官提醒，如果不再列為自住，可能會失去「州教育補助」抵減（State Aid to Education），這是自住房屋在學區房屋稅上的減免。如果你的房子沒有列為自住，請提交住宅法定類別變更申請（Request for Residential Legal Class Change）。',
        },
        {
          en: 'Proof of primary residence can be a driver license or voter registration card showing the owner\'s name and the property address, or the name and address section of a federal or state tax return.',
          zh: '自住證明可以是顯示屋主姓名與房屋地址的駕照或選民登記卡，或聯邦、州報稅表上有姓名與地址的那一頁。',
        },
        {
          en: 'Arizona property tax is paid in two halves. The first half is due October 1 and becomes delinquent after 5 p.m. on November 1; the second half is due March 1 and becomes delinquent after 5 p.m. on May 1. If a delinquency date falls on a weekend or holiday, it moves to the next business day.',
          zh: '亞利桑那房屋稅分兩期繳。上半年 10 月 1 日到期，11 月 1 日下午 5 點後算逾期；下半年 3 月 1 日到期，5 月 1 日下午 5 點後算逾期。逾期日如果是週末或假日，順延到下一個工作日。',
        },
        {
          en: 'If your lender collects property tax through an escrow account, it pays these bills for you, but you should still check your parcel on the Maricopa County Treasurer site.',
          zh: '如果貸款機構透過代管帳戶（escrow）代繳房屋稅，帳單會由它付，但你還是應該到 Maricopa 郡財務官網站查看自己的地號資料。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'During the loan process, ask your lender before you move large sums between accounts or open new credit, and ask how to document any large deposit.',
      zh: '貸款審核期間，大額轉帳或開新的信用額度前先問過貸款機構，也問清楚大額存款要怎麼提供證明。',
    },
    {
      en: 'If family overseas is helping with the down payment, ask your lender early how the gift must be documented.',
      zh: '如果海外家人要資助頭期款，請及早問貸款機構贈與款需要哪些證明文件。',
    },
    {
      en: 'Read HOA documents, rules, and fees before your inspection period ends, not after closing.',
      zh: '在驗屋期結束前就把 HOA 文件、規章與費用讀完，不要等成交後才看。',
    },
    {
      en: 'Never wire closing funds based only on an emailed instruction. Call your title or escrow officer at a number you already know to confirm.',
      zh: '不要只憑電子郵件指示就電匯成交款，請用你原本就知道的電話號碼打給產權或代管公司確認。',
    },
  ],
  officialResources: [
    {
      label: { en: 'Home Plus down payment assistance', zh: 'Home Plus 頭期款補助' },
      url: 'https://homeplusaz.com/home-plus-dpa/',
      source: 'Arizona Industrial Development Authority',
    },
    {
      label: { en: 'Home Plus 2026 income limit', zh: 'Home Plus 2026 年收入上限' },
      url: 'https://homeplusaz.com/homeplus-2026-income-limits/',
      source: 'Arizona Industrial Development Authority',
    },
    {
      label: { en: 'Loan Estimate explainer', zh: '貸款估價單說明' },
      url: 'https://www.consumerfinance.gov/owning-a-home/loan-estimate/',
      source: 'Consumer Financial Protection Bureau',
    },
    {
      label: { en: 'Closing Disclosure explainer', zh: '成交揭露書說明' },
      url: 'https://www.consumerfinance.gov/owning-a-home/closing-disclosure/',
      source: 'Consumer Financial Protection Bureau',
    },
    {
      label: { en: 'HUD housing counseling', zh: 'HUD 住房諮詢' },
      url: 'https://www.hud.gov/housingcounseling',
      source: 'US Department of Housing and Urban Development',
    },
    {
      label: { en: 'ADRE license lookup', zh: 'ADRE 經紀人執照查詢' },
      url: 'https://services.azre.gov/publicdatabase/',
      source: 'Arizona Department of Real Estate',
    },
    {
      label: { en: 'Arizona Buyer Advisory', zh: '亞利桑那《買方須知》' },
      url: 'https://azre.gov/sites/default/files/2025-08/Buyer%20Advisory%20January%202025.pdf',
      source: 'Arizona Department of Real Estate',
    },
    {
      label: { en: 'Update your legal class (primary residence)', zh: '變更法定類別（自住申報）' },
      url: 'https://www.mcassessor.maricopa.gov/home/help/update-legal-class/',
      source: 'Maricopa County Assessor',
    },
    {
      label: { en: 'Property tax due dates (A.R.S. 42-18052)', zh: '房屋稅繳納期限（A.R.S. 42-18052）' },
      url: 'https://www.azleg.gov/ars/42/18052.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Property tax calendar', zh: '房屋稅行事曆' },
      url: 'https://treasurer.maricopa.gov/PropertyTaxInformation/calendar/',
      source: 'Maricopa County Treasurer',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not legal, financial, or real estate advice. A licensed real estate agent, a mortgage professional, and in some cases a real estate attorney or CPA can help with your purchase. Our directory lists Chinese-speaking realtors and finance professionals across metro Phoenix.',
      zh: '本文為一般資訊，不構成法律、財務或房地產建議。有執照的房地產經紀人、貸款專員，必要時再加上房地產律師或會計師，都能協助你買房。本站名錄列有大鳳凰城說中文的地產經紀與財務專業人士。',
    },
    categorySlugs: ['real-estate', 'legal-finance'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
