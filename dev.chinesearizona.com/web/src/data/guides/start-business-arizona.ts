import type { Guide } from '@/lib/types';

// Facts checked against the linked ACC, IRS, FinCEN, City of Phoenix,
// Maricopa County, and SBA sources on 2026-11-27.
export const startBusinessArizonaGuide: Guide = {
  slug: 'start-small-business-arizona-llc',
  section: 'safety',
  title: {
    en: 'Starting a Small Business in Arizona: LLC, EIN, Sales Tax License, and Permits',
    zh: '在亞利桑那開公司：LLC、EIN、營業稅執照與各項許可',
  },
  excerpt: {
    en: 'The order of paperwork for a new Arizona business: forming an LLC with the Corporation Commission, choosing a statutory agent, getting a free EIN, registering for transaction privilege tax, and checking county and city permits.',
    zh: '在亞利桑那創業的文件順序：向州公司委員會成立 LLC、指定法定代理人、免費申請 EIN、登記交易特權稅，以及確認郡與市的許可。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
  readTime: '9 min',
  publishedAt: '2026-11-27T17:10:00.000Z',
  updatedAt: '2026-11-27T17:10:00.000Z',
  body: [
    {
      en: 'Whether you are opening a restaurant in Chandler, a tutoring center in Gilbert, a salon in Mesa, an online shop, or a consulting practice from home, the order of the paperwork matters more than any single form. A workable sequence is: form the business with the state, get a federal Employer Identification Number (EIN), register for Arizona transaction privilege tax if your activity is taxable, then add the permits and licenses your trade and city require.',
      zh: '不管是在 Chandler 開餐廳、在 Gilbert 開補習班、在 Mesa 開美髮店、經營網店，還是在家做顧問，文件的先後順序比任何一張表都重要。比較順的流程是：先向州政府成立公司，再申請聯邦僱主識別號碼（EIN），如果營業項目需要課稅就登記亞利桑那交易特權稅，最後補齊行業與城市要求的許可和執照。',
    },
    {
      en: 'Arizona does not call its sales tax a sales tax. It is the transaction privilege tax, or TPT, and it is charged on certain business activities. Since January 1, 2017, the Arizona Department of Revenue has been the single place to license, file, and pay state, county, and city TPT, including the City of Phoenix tax.',
      zh: '亞利桑那的營業稅不叫 sales tax，而是「交易特權稅」（Transaction Privilege Tax，簡稱 TPT），針對特定營業活動課徵。自 2017 年 1 月 1 日起，州、郡與市的 TPT（包括鳳凰城市稅）都統一由亞利桑那州稅務局（ADOR）辦理執照、申報與繳納。',
    },
    {
      en: 'This guide focuses on the most common choice for small owners, a limited liability company (LLC). It is general information based on official pages checked on November 27, 2026. Fees and procedures change, so confirm each step on the linked official page before you pay anything.',
      zh: '本文以小型業主最常選的有限責任公司（LLC）為主，依據 2026 年 11 月 27 日查證的官方網頁整理，屬一般資訊。費用與程序會調整，付款前請先到下方官方連結確認每一步。',
    },
  ],
  quickChecklist: [
    {
      en: 'Search the Arizona Corporation Commission (ACC) records for your name. An LLC name must include "limited liability company," "limited company," or an abbreviation such as "LLC."',
      zh: '先到亞利桑那州公司委員會（ACC）查詢名稱。LLC 的名稱必須包含「limited liability company」、「limited company」或「LLC」等縮寫。',
    },
    {
      en: 'Choose a statutory agent with an Arizona street address who will accept the appointment in writing.',
      zh: '找一位有亞利桑那實體地址、願意書面接受指定的法定代理人（statutory agent）。',
    },
    {
      en: 'File Articles of Organization, preferably online through the ACC\'s Arizona Business Center (ABC). The ACC fee schedule lists $50 for regular processing and $85 for expedited.',
      zh: '提交組織章程（Articles of Organization），ACC 建議透過線上系統 Arizona Business Center（ABC）辦理。ACC 費用表列出一般處理 50 美元、加急 85 美元。',
    },
    {
      en: 'After the LLC is approved, get an EIN directly from the IRS. It is free.',
      zh: 'LLC 核准後，直接向 IRS 申請 EIN，完全免費。',
    },
    {
      en: 'If you sell taxable goods or services, get a TPT license from the Arizona Department of Revenue before you start selling.',
      zh: '如果銷售應稅商品或服務，開始營業前先向 ADOR 申請 TPT 執照。',
    },
    {
      en: 'Check county and city rules: food permits, zoning for home businesses, signs, and any license your profession needs.',
      zh: '確認郡與市的規定：餐飲許可、居家營業的分區規定、招牌，以及你的專業是否需要執照。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Forming the LLC', zh: '成立 LLC' },
      bullets: [
        {
          en: 'One person can form an Arizona LLC, and the only member can also be the only manager. You choose either member-managed or manager-managed on the Articles. The ACC says it cannot advise on that choice because it is legal advice.',
          zh: '一個人就能成立亞利桑那 LLC，唯一成員也可以同時是唯一經理。組織章程上要選「成員管理」或「經理管理」，ACC 表示這屬於法律建議，無法替你決定。',
        },
        {
          en: 'An operating agreement is not required by Arizona statute, and you do not file it with the ACC. Without one, the LLC statutes decide how the company runs, including one vote per member no matter what percentage each person owns.',
          zh: '亞利桑那州法沒有強制要求營運協議（operating agreement），也不用交給 ACC。但沒有營運協議時，就由 LLC 相關法條決定公司怎麼運作，例如不論持股比例，每位成員都是一人一票。',
        },
        {
          en: 'The ACC warns that in a two-member LLC with no operating agreement saying otherwise, both members must agree on every decision because there is never a majority.',
          zh: 'ACC 特別提醒：兩位成員的 LLC 如果沒有營運協議另作約定，每個決定都必須兩人同意，因為永遠不會有多數。',
        },
        {
          en: 'If you work in a licensed profession, check with your licensing board about whether you should form a professional LLC. The ACC notes that real estate agents and brokers should check with the Arizona Department of Real Estate first.',
          zh: '如果從事需要執照的專業，先向主管機關確認是否應成立專業 LLC（PLLC）。ACC 提醒房地產經紀人應先洽詢亞利桑那州房地產局（ADRE）。',
        },
        {
          en: 'Arizona LLCs do not file annual reports with the ACC. Only corporations do.',
          zh: '亞利桑那的 LLC 不需要向 ACC 提交年度報告，只有公司（corporation）需要。',
        },
      ],
    },
    {
      title: { en: 'Statutory agent, publication, and timing', zh: '法定代理人、公告與處理時間' },
      bullets: [
        {
          en: 'Every LLC must keep a statutory agent on record at all times. An individual agent must be a permanent, full-time Arizona resident with an Arizona street address, and the LLC cannot be its own agent, although a member can serve as an individual.',
          zh: '每家 LLC 都必須隨時有登記在案的法定代理人。個人擔任時，必須是長期全職住在亞利桑那、有州內實體地址的居民；LLC 不能當自己的代理人，但成員可以用個人身分擔任。',
        },
        {
          en: 'Official ACC notices go to the statutory agent. If the LLC stops maintaining an agent, it can be administratively dissolved.',
          zh: 'ACC 的正式通知都寄給法定代理人。如果 LLC 沒有維持代理人，可能會被行政解散。',
        },
        {
          en: 'A notice of the filing must be published, but only after the ACC approves the Articles. If your statutory agent\'s street address is in Maricopa or Pima County, the ACC publishes the notice on its own website automatically. Elsewhere, you publish in a newspaper using the instructions in your approval letter.',
          zh: '成立後必須刊登公告，但要等 ACC 核准章程後才能刊登。法定代理人的實體地址在 Maricopa 或 Pima 郡的話，ACC 會自動在官網公告；其他郡則要依核准信的說明登報。',
        },
        {
          en: 'The ACC estimates regular processing at about 14 to 16 days and expedited processing ($35 extra) at about 3 to 5 days, and it posts current processing times each week. Same-day and next-day services cost more.',
          zh: 'ACC 估計一般處理約 14 到 16 天，加急（另加 35 美元）約 3 到 5 天，每週會更新最新處理時間；當天或隔天處理的費用更高。',
        },
      ],
    },
    {
      title: { en: 'Federal and state tax registrations', zh: '聯邦與州稅務登記' },
      bullets: [
        {
          en: 'The IRS says you never have to pay a fee for an EIN. Form the LLC with the state first, then use the IRS online tool. The responsible party needs a Social Security number or an ITIN, the application must be finished in one session, and the IRS issues one EIN per responsible party per day.',
          zh: 'IRS 明確表示申請 EIN 不需要任何費用。先向州政府成立 LLC，再使用 IRS 的線上申請工具。負責人必須有社會安全號碼或 ITIN，申請要一次完成，而且每位負責人每天只能申請一個 EIN。',
        },
        {
          en: 'Under a FinCEN final rule effective August 14, 2026, companies created in the US are exempt from beneficial ownership information (BOI) reporting. Be skeptical of letters or emails that demand a BOI filing fee from a new Arizona LLC.',
          zh: '依 FinCEN 於 2026 年 8 月 14 日生效的最終規則，在美國成立的公司免除受益所有人資訊（BOI）申報。如果收到要求新成立的亞利桑那 LLC 繳交 BOI 申報費的信件或電子郵件，請提高警覺。',
        },
        {
          en: 'A business engaged in taxable activity needs a TPT license. The City of Phoenix says the Department of Revenue now handles state, county, and city TPT together, sends annual renewal bills around November, and expects renewal fees by January 1.',
          zh: '從事應稅營業活動就需要 TPT 執照。鳳凰城市政府說明，州稅務局統一處理州、郡與市的 TPT，每年約 11 月寄出續約帳單，續約費用須在 1 月 1 日前繳納。',
        },
        {
          en: 'The ACC does not register or recognize "doing business as" names. Trade names are registered with the Arizona Secretary of State, last five years, and carry certain legal rights. DBA names can be recorded with the Maricopa County Recorder.',
          zh: 'ACC 不登記也不承認 DBA（doing business as）名稱。商號（trade name）要向亞利桑那州務卿辦公室登記，有效期五年，並享有一定法律權利；DBA 名稱可以到 Maricopa 郡登記處（Recorder）登錄。',
        },
      ],
    },
    {
      title: { en: 'Hiring, food businesses, and local rules', zh: '僱用員工、餐飲業與地方規定' },
      bullets: [
        {
          en: 'When you hire, the IRS says every US employer must complete Form I-9 for each new employee, keep a signed Form W-4 for withholding, and record each employee\'s name and Social Security number for Form W-2, including nonresident alien employees.',
          zh: '開始僱人時，IRS 說明所有美國僱主都要替每位新員工完成 Form I-9、保存員工簽名的 Form W-4 作為預扣依據，並記錄員工姓名與社會安全號碼以填寫 Form W-2，非居民員工也一樣。',
        },
        {
          en: 'Restaurants, bakeries, and other food businesses in Maricopa County go through the county Environmental Services Department. Construction or remodel plans are reviewed before you build, applications go through the county Permit Center, and annual permit fees apply to operating permits.',
          zh: '在 Maricopa 郡開餐廳、烘焙坊或其他餐飲業，要經過郡環境服務局。新建或改裝前要先送審工程圖，申請透過郡的 Permit Center 辦理，營業許可每年都要繳費。',
        },
        {
          en: 'The county also tells food businesses to check city rules before operating. Your city may have its own zoning, building, sign, and home-business requirements.',
          zh: '郡政府也提醒餐飲業者，營業前要確認所在城市的規定。各市可能另有分區、建築、招牌與居家營業的要求。',
        },
        {
          en: 'The SBA Arizona District Office serves the whole state from offices in Phoenix, Show Low, and Tucson, and helps with SBA funding programs, counseling, and federal contracting certifications.',
          zh: '美國小型企業管理局（SBA）亞利桑那分局服務全州，在 Phoenix、Show Low 與 Tucson 都有辦公室，可協助 SBA 融資計畫、創業諮詢與聯邦採購認證。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'Do not pay a website to get an EIN for you. The IRS application is free.',
      zh: '不要付錢給網站代辦 EIN，向 IRS 申請是免費的。',
    },
    {
      en: 'Do not publish your newspaper notice before the ACC approves the Articles. The ACC instructions say to wait for approval.',
      zh: '在 ACC 核准章程之前不要登報公告，ACC 的說明明確要求等核准後再刊登。',
    },
    {
      en: 'Statutory agent and principal addresses appear on the public record online. Use an address you are comfortable having published.',
      zh: '法定代理人與主要營業地址都會公開在網路上，請使用你願意公開的地址。',
    },
    {
      en: 'Two owners with no written operating agreement can end up deadlocked. Settle ownership, voting, and exit terms in writing before money comes in.',
      zh: '兩位合夥人沒有書面營運協議，很容易陷入僵局。在收入進來之前，先把持股、表決與退出條件寫清楚。',
    },
  ],
  officialResources: [
    {
      label: { en: 'ACC business services FAQs', zh: 'ACC 商業服務常見問題' },
      url: 'https://azcc.gov/faqs/BusinessServicesFAQs',
      source: 'Arizona Corporation Commission',
    },
    {
      label: { en: 'ACC LLC fee schedule', zh: 'ACC LLC 收費表' },
      url: 'https://azcc.gov/docs/default-source/corps-files/fee-schedules/fee-schedule-llcs.pdf',
      source: 'Arizona Corporation Commission',
    },
    {
      label: { en: 'Articles of Organization instructions', zh: '組織章程填寫說明' },
      url: 'https://azcc.gov/docs/default-source/corps-files/instructions/l010i-instructions-articles-of-organization.pdf',
      source: 'Arizona Corporation Commission',
    },
    {
      label: { en: 'Get an EIN', zh: '申請 EIN' },
      url: 'https://www.irs.gov/businesses/small-businesses-self-employed/get-an-employer-identification-number',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Hiring employees', zh: '僱用員工須知' },
      url: 'https://www.irs.gov/businesses/small-businesses-self-employed/hiring-employees',
      source: 'Internal Revenue Service',
    },
    {
      label: { en: 'Beneficial ownership information (BOI)', zh: '受益所有人資訊（BOI）' },
      url: 'https://www.fincen.gov/boi',
      source: 'Financial Crimes Enforcement Network',
    },
    {
      label: { en: 'TPT license', zh: 'TPT 交易特權稅執照' },
      url: 'https://azdor.gov/business/transaction-privilege-tax/tpt-license',
      source: 'Arizona Department of Revenue',
    },
    {
      label: { en: 'Phoenix privilege (sales) and use tax', zh: '鳳凰城交易特權稅與使用稅' },
      url: 'https://www.phoenix.gov/administration/departments/finance/privilege-sales-use-tax.html',
      source: 'City of Phoenix',
    },
    {
      label: { en: 'Maricopa County food permits', zh: 'Maricopa 郡餐飲許可' },
      url: 'https://www.maricopa.gov/5339/Food-Permits',
      source: 'Maricopa County Environmental Services',
    },
    {
      label: { en: 'Maricopa County plan review for fixed food businesses', zh: 'Maricopa 郡固定餐飲場所工程審查' },
      url: 'https://www.maricopa.gov/3973/PermanentFixed-Businesses',
      source: 'Maricopa County Environmental Services',
    },
    {
      label: { en: 'SBA Arizona District Office', zh: 'SBA 亞利桑那分局' },
      url: 'https://www.sba.gov/district/arizona',
      source: 'US Small Business Administration',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not legal or tax advice. Entity choice, operating agreements, tax elections, and permits depend on your business and city. A business lawyer or CPA can help you set it up correctly the first time, and our directory lists Chinese-speaking professionals across metro Phoenix.',
      zh: '本文為一般資訊，不構成法律或稅務建議。公司型態、營運協議、稅務選擇與許可都取決於你的行業與所在城市。商業律師或會計師可以幫你一次設定正確；本站名錄列有大鳳凰城說中文的專業人士。',
    },
    categorySlugs: ['legal-finance'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
