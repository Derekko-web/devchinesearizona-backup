import type { Guide } from '@/lib/types';

// Facts checked against the linked IRS and Arizona sources on 2026-11-27.
export const taxesNewImmigrantsGuide: Guide = {
  slug: 'us-arizona-taxes-new-immigrants',
  section: 'safety',
  title: {
    en: 'US and Arizona Taxes for New Immigrants, H-1B Workers, and International Students',
    zh: '新移民、H-1B 與留學生的美國及亞利桑那報稅指南',
  },
  excerpt: {
    en: 'How the IRS decides whether you file as a resident or a nonresident, what Form 8843, Form 1040-NR, ITIN, and FBAR mean, and where the Arizona return fits in.',
    zh: '國稅局怎麼判定你是稅務居民還是非居民，8843、1040-NR、ITIN 與 FBAR 各是什麼，以及亞利桑那州稅怎麼搭配。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
  readTime: '9 min',
  publishedAt: '2026-11-27T17:00:00.000Z',
  updatedAt: '2026-11-27T17:00:00.000Z',
  body: [
    {
      en: 'Your first US tax return is mostly a status question. What matters is less the visa in your passport than whether the IRS treats you as a resident alien or a nonresident alien for that tax year. That status decides which form you file, which income you report, and which deductions you can take. Many people who move to Phoenix, Chandler, or Tempe from overseas end up with a split first year: nonresident for part of it and resident for the rest.',
      zh: '第一次在美國報稅，關鍵不在簽證種類，而在於你那一年被國稅局（IRS）視為「稅務居民」還是「非稅務居民」。身分決定要用哪份表、哪些收入要申報、能用哪些扣除額。很多從海外搬到鳳凰城、Chandler 或 Tempe 的人，第一年會是前段非居民、後段居民的「雙重身分」年度。',
    },
    {
      en: 'The IRS treats you as a nonresident unless you meet the green card test or the substantial presence test. The substantial presence test needs at least 31 days in the US this year and 183 days across three years, counting every day this year, one third of last year\'s days, and one sixth of the days from the year before. Students on F, J, M, or Q visas who follow their visa terms are "exempt individuals" whose days do not count, but that stops once you have been exempt for any part of more than five calendar years, unless you can show you do not intend to live here permanently.',
      zh: 'IRS 的原則是：除非符合「綠卡測試」或「實質居留測試」，否則就是非居民。實質居留測試要求當年在美國至少 31 天，而且三年加權合計至少 183 天：今年的天數全算、去年算三分之一、前年算六分之一。持 F、J、M、Q 簽證並遵守簽證規定的學生屬於「豁免個人」，天數不列入計算；但只要以豁免身分待過超過五個日曆年（哪怕只是其中一部分），除非能證明沒有長住打算，就不再適用。',
    },
    {
      en: 'This guide is written for metro Phoenix residents from IRS pages and Arizona law checked on November 27, 2026. Tax rules change every year and depend on your own dates and documents, so use it to get organized and to prepare questions for a professional.',
      zh: '本文依據 2026 年 11 月 27 日查證的 IRS 網站與亞利桑那州法整理，寫給大鳳凰城的讀者。稅法每年都會調整，結果也取決於你自己的日期與文件，建議用來整理資料、準備要問專業人士的問題。',
    },
  ],
  quickChecklist: [
    {
      en: 'Write down every date you entered and left the US in the last three years. Your passport and I-94 records are the starting point for the day count.',
      zh: '把過去三年每次入境、出境美國的日期列出來，護照與 I-94 紀錄是計算天數的起點。',
    },
    {
      en: 'If you exclude days as a student or scholar, file Form 8843 for every year you claim it, even with no income. Attach it to your return, or mail it by the return due date if you have no return to file.',
      zh: '以學生或學者身分排除天數的人，每年都要交 Form 8843，就算當年沒有收入也一樣。有報稅就附在申報書裡，不用報稅也要在報稅截止日前寄出。',
    },
    {
      en: 'Collect W-2, 1099, and 1042-S forms plus records of income earned outside the US. Residents report worldwide income, including overseas interest, rent, and salary.',
      zh: '收齊 W-2、1099、1042-S 與海外收入紀錄。稅務居民要申報全球收入，包括海外的利息、房租與薪資。',
    },
    {
      en: 'If a spouse or child cannot get a Social Security number, apply for an ITIN with Form W-7 and send it together with the tax return it supports.',
      zh: '配偶或孩子無法申請社會安全號碼（SSN）時，用 Form W-7 申請 ITIN，並和對應的報稅表一起寄出。',
    },
    {
      en: 'List every bank, brokerage, and investment account outside the US with its highest balance during the year. That decides whether FBAR or Form 8938 applies.',
      zh: '列出所有美國境外的銀行、證券與投資帳戶，以及每個帳戶當年的最高餘額，這會決定要不要申報 FBAR 或 Form 8938。',
    },
    {
      en: 'Mark the deadlines: April 15 for most returns, June 15 for nonresidents with no US wages subject to withholding, and Form 4868 by the regular due date if you need more time to file.',
      zh: '記下截止日：多數人是 4 月 15 日；沒有預扣稅薪資的非居民是 6 月 15 日；需要延期申報，就在原截止日前提交 Form 4868。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Resident, nonresident, or dual-status', zh: '居民、非居民，還是雙重身分' },
      bullets: [
        {
          en: 'Residents file Form 1040 or 1040-SR and report worldwide income. Nonresidents who must file use Form 1040-NR. Their taxable income falls into two groups: income connected with a US trade or business, taxed at the regular graduated rates, and certain other US-source income such as dividends, which is generally taxed at a flat 30 percent or a lower treaty rate.',
          zh: '稅務居民用 Form 1040 或 1040-SR，申報全球收入。需要報稅的非居民用 Form 1040-NR，應稅收入分兩類：與美國營業活動相關的收入，按一般累進稅率計稅；股利等其他特定美國來源收入，原則上按 30% 單一稅率或較低的協定稅率計稅。',
        },
        {
          en: 'In a dual-status year, if you are a resident on December 31 you file Form 1040 marked "Dual-Status Return" and attach a statement for the nonresident months; Form 1040-NR can serve as that statement. If you are a nonresident at year end, you file Form 1040-NR marked "Dual-Status Return."',
          zh: '雙重身分年度：12 月 31 日時是居民，就交 Form 1040 並在上方註明「Dual-Status Return」，另附非居民期間的說明（可以用 Form 1040-NR 當說明）。年底是非居民的話，就交 Form 1040-NR 並註明「Dual-Status Return」。',
        },
        {
          en: 'Dual-status filers cannot take the standard deduction, cannot use head of household rates, and cannot file a joint return, unless they are married to a US citizen or resident and elect to file jointly.',
          zh: '雙重身分申報不能用標準扣除額、不能用戶長（head of household）稅率，也不能夫妻合併申報；例外是配偶為美國公民或居民，並選擇合併申報。',
        },
        {
          en: 'If one spouse is a resident and the other is not, the IRS lets you choose to treat the nonresident spouse as a resident. Both spouses must then report worldwide income for that year and later years until the choice ends, and the IRS calls it a once-in-a-lifetime choice. Run the numbers both ways first.',
          zh: '夫妻一方是居民、另一方不是時，IRS 允許把非居民配偶視為居民。選了之後，兩人當年和之後每年都要申報全球收入，直到選擇終止；IRS 形容這是一生只有一次的選擇。決定前最好兩種方式都試算。',
        },
      ],
    },
    {
      title: { en: 'Students, scholars, and H-1B workers', zh: '留學生、訪問學者與 H-1B' },
      bullets: [
        {
          en: 'Students and scholars who exclude days must file Form 8843. The IRS says that if you do not file it on time, you cannot exclude those days, which can turn you into a resident for tax purposes without meaning to.',
          zh: '要排除天數的學生與學者一定要交 Form 8843。IRS 明確表示，沒有按時提交就不能排除那些天數，結果可能在不知情的情況下變成稅務居民。',
        },
        {
          en: 'The IRS exempt-individual categories cover certain foreign government-related visitors, students, J or Q teachers and trainees, and some professional athletes. H-1B status is not on that list, so every day in H-1B status counts toward the substantial presence test.',
          zh: 'IRS 的「豁免個人」包括特定外交相關人士、學生、J 或 Q 簽證的教師與受訓人員，以及部分職業運動員。H-1B 不在名單上，所以以 H-1B 身分在美國的每一天都計入實質居留測試。',
        },
        {
          en: 'If you change from F-1 to H-1B, the year you switch needs a careful day count, because days as an exempt student and days in work status are treated differently.',
          zh: '從 F-1 轉 H-1B 的那一年要特別仔細算天數，因為豁免學生期間與工作身分期間的算法不一樣。',
        },
        {
          en: 'Some countries, including the People\'s Republic of China, have income tax treaties with the US with provisions for students and other groups. IRS Publication 901 lists them. Treaty claims have their own forms and disclosures, so ask a preparer who handles them regularly.',
          zh: '包括中華人民共和國在內的部分國家和美國簽有所得稅協定，其中有針對學生等身分的條款，IRS Publication 901 有完整列表。主張協定優惠需要特定表格與揭露，請找常處理這類申報的報稅人員。',
        },
      ],
    },
    {
      title: { en: 'Accounts and income outside the US', zh: '海外帳戶與海外收入' },
      bullets: [
        {
          en: 'A US person, which includes a resident, must file an FBAR (FinCEN Form 114) if the combined value of foreign financial accounts was more than $10,000 at any time during the year. It is filed electronically through FinCEN\'s BSA E-Filing System, not with your tax return.',
          zh: '「美國人」（包括稅務居民）如果海外金融帳戶合計金額在當年任何時候超過 10,000 美元，就要申報 FBAR（FinCEN Form 114）。FBAR 透過 FinCEN 的 BSA E-Filing 系統線上申報，不附在報稅表裡。',
        },
        {
          en: 'The FBAR is due April 15, with an automatic extension to October 15 that you do not need to request.',
          zh: 'FBAR 的截止日是 4 月 15 日，並自動延長到 10 月 15 日，不需要另外申請。',
        },
        {
          en: 'Form 8938 is a separate form filed with your tax return. For people living in the US, it applies to unmarried filers when specified foreign financial assets are more than $50,000 on the last day of the year or more than $75,000 at any time, and to married couples filing jointly at $100,000 and $150,000.',
          zh: 'Form 8938 是另一份表，附在報稅表中。住在美國的人，單身（或夫妻分開申報）年底海外指定金融資產超過 50,000 美元、或年中任何時候超過 75,000 美元就要申報；夫妻合併申報的門檻是 100,000 與 150,000 美元。',
        },
        {
          en: 'Penalties for missing these reports can be large. List accounts in Taiwan, China, Hong Kong, or anywhere else early and let your preparer decide what is required.',
          zh: '漏報的罰則可能很重。請提早整理在台灣、中國、香港或其他地方的帳戶，交給報稅人員判斷要申報哪些。',
        },
      ],
    },
    {
      title: { en: 'Your Arizona return', zh: '亞利桑那州稅' },
      bullets: [
        {
          en: 'Arizona has its own income tax return. State law requires full-year and part-year residents to file when their gross income is more than the Arizona standard deduction amount, and uses a prorated test for nonresidents with Arizona income.',
          zh: '亞利桑那有自己的州所得稅申報。州法規定，全年或部分年度居民的總收入超過州標準扣除額就要申報；有亞利桑那收入的非居民則按比例判斷。',
        },
        {
          en: 'Arizona law says that filing rule applies whether or not you have to file a federal return, so a student with Arizona wages should check the state rule separately.',
          zh: '州法也寫明，不論你需不需要申報聯邦稅，州的申報規定都照樣適用。有亞利桑那薪資的學生要另外確認州稅。',
        },
        {
          en: 'The Arizona Department of Revenue has separate returns for part-year residents (Form 140PY) and nonresidents (Form 140NR). If you moved to Arizona during the year, ask your preparer about the part-year resident return.',
          zh: '亞利桑那州稅務局（ADOR）另有部分年度居民（Form 140PY）與非居民（Form 140NR）的申報表。年中搬來亞利桑那的人，記得問報稅人員部分年度居民的申報方式。',
        },
        {
          en: 'Give your employer your Arizona address as soon as you move so payroll records match where you live.',
          zh: '搬家後盡快把亞利桑那地址告訴僱主，讓薪資紀錄和實際居住地一致。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'Before you buy tax software, confirm it supports Form 1040-NR or dual-status returns if you need them.',
      zh: '購買報稅軟體前，先確認它支援 Form 1040-NR 或雙重身分申報（如果你需要的話）。',
    },
    {
      en: 'Free help exists. IRS Volunteer Income Tax Assistance (VITA) sites generally serve people who make about $70,244 or less, and each site can set its own limits. The IRS VITA locator is updated from February through April.',
      zh: '有免費資源：IRS 的志工報稅服務（VITA）一般服務年收入約 70,244 美元以下的民眾，各站點也可能自訂條件。IRS 的 VITA 站點查詢工具每年 2 月到 4 月更新。',
    },
    {
      en: 'Send an ITIN application together with the tax return it supports. The IRS says not to file the return separately.',
      zh: 'ITIN 申請要和對應的報稅表放在同一份資料中寄出，IRS 明確說不要把報稅表分開寄。',
    },
    {
      en: 'Be wary of anyone who promises a refund before seeing your documents or asks for your refund to be deposited into their account.',
      zh: '如果有人還沒看文件就保證退稅，或要求把退稅存進他的帳戶，請提高警覺。',
    },
  ],
  officialResources: [
    {
      label: { en: 'Substantial presence test', zh: '實質居留測試' },
      url: 'https://www.irs.gov/individuals/international-taxpayers/substantial-presence-test',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Exempt individuals: students', zh: '豁免個人：學生' },
      url: 'https://www.irs.gov/individuals/international-taxpayers/exempt-individual-who-is-a-student',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'About Form 8843', zh: 'Form 8843 說明' },
      url: 'https://www.irs.gov/forms-pubs/about-form-8843',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Taxation of dual-status individuals', zh: '雙重身分的課稅方式' },
      url: 'https://www.irs.gov/individuals/international-taxpayers/taxation-of-dual-status-individuals',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Taxation of nonresident aliens', zh: '非居民的課稅方式' },
      url: 'https://www.irs.gov/individuals/international-taxpayers/taxation-of-nonresident-aliens',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Nonresident spouse election', zh: '非居民配偶選擇' },
      url: 'https://www.irs.gov/individuals/international-taxpayers/nonresident-spouse',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'ITIN (Individual Taxpayer Identification Number)', zh: 'ITIN 個人報稅識別號碼' },
      url: 'https://www.irs.gov/individuals/individual-taxpayer-identification-number',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'FBAR foreign account reporting', zh: 'FBAR 海外帳戶申報' },
      url: 'https://www.irs.gov/businesses/small-businesses-self-employed/report-of-foreign-bank-and-financial-accounts-fbar',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Form 8938 and FBAR compared', zh: 'Form 8938 與 FBAR 比較' },
      url: 'https://www.irs.gov/businesses/comparison-of-form-8938-and-fbar-requirements',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Publication 901: US tax treaties', zh: 'Publication 901：美國租稅協定' },
      url: 'https://www.irs.gov/publications/p901',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Free tax help (VITA and TCE)', zh: '免費報稅協助（VITA 與 TCE）' },
      url: 'https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Arizona filing requirement (A.R.S. 43-301)', zh: '亞利桑那申報義務（A.R.S. 43-301）' },
      url: 'https://www.azleg.gov/ars/43/00301.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Arizona individual income tax', zh: '亞利桑那個人所得稅' },
      url: 'https://azdor.gov/individuals',
      source: 'Arizona Department of Revenue',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not tax or legal advice. Residency status, treaty claims, and foreign account reporting depend on your exact dates and documents. A CPA, enrolled agent, or tax preparer who handles nonresident and dual-status returns can review your situation, and our directory lists Chinese-speaking professionals across metro Phoenix.',
      zh: '本文為一般資訊，不構成稅務或法律建議。稅務身分、協定優惠與海外帳戶申報都取決於你的實際日期與文件。可以請熟悉非居民與雙重身分申報的會計師（CPA）、IRS 登記代理人（EA）或報稅人員協助檢視；本站名錄列有大鳳凰城說中文的專業人士。',
    },
    categorySlugs: ['legal-finance'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
