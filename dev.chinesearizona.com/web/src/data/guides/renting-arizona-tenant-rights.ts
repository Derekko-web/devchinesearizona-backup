import type { Guide } from '@/lib/types';

// Facts checked against the Arizona Residential Landlord and Tenant Act
// sections on azleg.gov and the City of Phoenix heat safety page on 2026-11-27.
export const rentingArizonaGuide: Guide = {
  slug: 'renting-arizona-tenant-rights',
  section: 'housing',
  title: {
    en: 'Renting in Arizona: Deposits, Repairs, Air Conditioning, and Your Rights as a Tenant',
    zh: '在亞利桑那租房：押金、修繕、冷氣與房客權益',
  },
  excerpt: {
    en: 'What Arizona law says about security deposits, move-in forms, repairs, landlord entry, late rent, and cooling, plus the Phoenix rule on maximum indoor temperatures for rentals.',
    zh: '亞利桑那州法對押金、入住檢查表、修繕、房東進屋、遲繳房租與冷氣的規定，以及鳳凰城對出租房屋室內最高溫度的要求。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  readTime: '9 min',
  publishedAt: '2026-11-27T18:10:00.000Z',
  updatedAt: '2026-11-27T18:10:00.000Z',
  body: [
    {
      en: 'Renting is often the first step after a move, while you wait for a job to start, build a credit history, or settle on a school area. Residential renting in Arizona is governed by the Arizona Residential Landlord and Tenant Act, a set of state statutes covering apartments and rented houses, with some exceptions. Knowing a handful of its rules prevents the most common disputes: deposits that never come back, repairs that drag on, and air conditioning that fails in July.',
      zh: '搬家後通常先租房，一邊等工作開始、累積信用紀錄，或決定孩子的學區。亞利桑那的住宅租賃由《亞利桑那住宅房東與房客法》（Arizona Residential Landlord and Tenant Act）規範，涵蓋公寓與出租獨棟房屋，但有部分例外。了解其中幾條規定，就能避開最常見的糾紛：押金拿不回來、修繕一拖再拖，以及七月冷氣壞掉。',
    },
    {
      en: 'The rules below come straight from the statute text on the Arizona Legislature website and from the City of Phoenix, checked on November 27, 2026. Leases can add terms, but a lease cannot take away rights the Act gives you.',
      zh: '以下規定直接來自亞利桑那州議會網站上的法條，以及鳳凰城市政府網站，查證日期為 2026 年 11 月 27 日。租約可以增加條款，但不能拿走這部法律賦予你的權利。',
    },
    {
      en: 'This guide is general information, not legal advice. If a dispute is heading toward an eviction filing or a large sum of money, talk to a lawyer quickly, because the timelines in landlord and tenant cases are short.',
      zh: '本文為一般資訊，不構成法律建議。如果糾紛可能走向驅逐訴訟，或涉及大筆金額，請盡快諮詢律師，因為租屋案件的期限都很短。',
    },
  ],
  quickChecklist: [
    {
      en: 'Do not pay more than 1.5 months\' rent in combined security and prepaid rent unless you choose to prepay more. That is the legal cap on what a landlord can demand.',
      zh: '押金加預付房租，房東最多只能要求一個半月的房租；除非你自願多預付，否則不要多給。',
    },
    {
      en: 'Ask which fees are nonrefundable. The landlord must state the purpose of any nonrefundable fee in writing, and anything not labeled nonrefundable is refundable.',
      zh: '問清楚哪些費用不退。房東必須以書面說明不退費用的用途，沒有標明不退的費用就是可退的。',
    },
    {
      en: 'At move-in, get a signed copy of the lease and the move-in form, and record existing damage with dated photos.',
      zh: '入住時要拿到簽好的租約副本與入住檢查表，並用有日期的照片記錄原有損壞。',
    },
    {
      en: 'Send repair requests in writing and keep copies. Several tenant remedies under Arizona law begin only after you notify the landlord.',
      zh: '修繕要求一律用書面提出並留存副本。亞利桑那州法有多項房客救濟措施，要在通知房東之後才能主張。',
    },
    {
      en: 'Before you move out, tell the landlord you want to attend the move-out inspection, and give a forwarding address for the deposit.',
      zh: '搬走前告訴房東你要參加退租檢查，並留下轉寄地址以便退還押金。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Security deposits', zh: '押金' },
      bullets: [
        {
          en: 'A landlord cannot demand or receive security, including prepaid rent, of more than one and a half months\' rent. You may voluntarily pay more rent in advance.',
          zh: '房東收取的押金（包括預付房租）不得超過一個半月的房租；房客可以自願預付更多房租。',
        },
        {
          en: 'At move-in, the landlord must give you a signed copy of the lease, a move-in form for listing existing damage, and written notice that you may be present at the move-out inspection.',
          zh: '入住時，房東必須提供簽好的租約副本、可填寫原有損壞的入住檢查表，以及你可以在場參加退租檢查的書面通知。',
        },
        {
          en: 'After the tenancy ends, you hand back possession, and you ask for your deposit, the landlord has 14 days, not counting weekends and legal holidays, to give you an itemized list of deductions and any amount owed to you.',
          zh: '租約結束、交還房屋並要求退押金後，房東要在 14 天內（不含週末與法定假日）提供逐項列出的扣款明細，並退還應退金額。',
        },
        {
          en: 'If the landlord does not follow that rule, the law lets the tenant recover the money due plus damages of twice the amount wrongfully withheld.',
          zh: '如果房東沒有遵守這項規定，法律允許房客追回應退款項，並請求相當於不當扣留金額兩倍的賠償。',
        },
      ],
    },
    {
      title: { en: 'Repairs, cooling, and landlord entry', zh: '修繕、冷氣與房東進屋' },
      bullets: [
        {
          en: 'The landlord must keep the home fit and habitable and keep supplied electrical, plumbing, heating, ventilating, and air-conditioning systems and appliances in good and safe working order.',
          zh: '房東必須維持房屋適合居住，並讓房東提供的電力、水管、暖氣、通風、冷氣系統與家電保持正常安全運作。',
        },
        {
          en: 'Where air conditioning or cooling is installed and offered, the landlord must supply reasonable cooling when the season requires it. If the landlord deliberately or negligently fails to, the tenant can give notice and may have remedies, including damages for the reduced rental value or, in some cases, substitute housing. These rights start only after notice and do not include a right to make the repair yourself.',
          zh: '房屋有安裝並提供冷氣或降溫設備時，房東必須在季節需要時提供合理的冷氣。如果房東故意或疏忽沒有提供，房客可以發出通知，並可能取得救濟，例如依租金價值減損請求賠償，某些情況下可以另找替代住處。這些權利要在發出通知後才成立，而且不包括自行修理的權利。',
        },
        {
          en: 'In Phoenix, the city requires landlords to keep units at a maximum of 82°F with air conditioning or 86°F with evaporative coolers. The city says it will investigate complaints at 602-262-7210, and its Landlord and Tenant Program counselors can explain your rights.',
          zh: '鳳凰城規定，有冷氣的出租房屋室內最高溫度為華氏 82 度，使用蒸發式冷卻器的為華氏 86 度。市政府表示會調查申訴，電話 602-262-7210；市府的房東與房客諮詢計畫也有專人說明你的權利。',
        },
        {
          en: 'The landlord must give at least two days\' notice before entering, except in an emergency or when notice is impracticable, and may enter only at reasonable times. When you submit a maintenance request, that request counts as permission to enter for that repair.',
          zh: '除非緊急或無法事先通知，房東進屋前至少要提前兩天通知，而且只能在合理時間進入。你提出修繕要求時，該要求就視同同意房東為了那項修繕進屋。',
        },
      ],
    },
    {
      title: { en: 'Rent, late payment, and lease terms', zh: '房租、遲繳與租約條款' },
      bullets: [
        {
          en: 'A tenant may not withhold rent for any reason the Act does not allow. If rent is unpaid, the landlord can deliver a written notice giving five days to pay before filing an eviction case.',
          zh: '房客不能以法律未允許的理由拒付房租。房租未付時，房東可以發出書面通知，給你五天付款，逾期才提出驅逐訴訟。',
        },
        {
          en: 'Before the landlord files, paying all past-due rent and the reasonable late fee written in the lease reinstates the lease. After filing, you would also owe attorney fees and court costs to reinstate it.',
          zh: '在房東提告之前，付清所有積欠房租與租約中載明的合理滯納金，租約就會恢復。提告之後，還要另外支付律師費與訴訟費才能恢復。',
        },
        {
          en: 'A lease cannot make you waive your rights under the Act, pay the landlord\'s attorney fees (except a clause awarding fees to whoever wins in court), limit the landlord\'s legal liability, or limit your right to call police or emergency help. Those clauses are unenforceable.',
          zh: '租約不能要求你放棄這部法律給你的權利、替房東付律師費（勝訴方可請求律師費的條款除外）、限制房東的法律責任，或限制你報警與求救的權利。這類條款無效。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'Do not send a deposit for a listing you have not seen in person or verified with the owner or property manager. Pay through a traceable method and get a receipt.',
      zh: '還沒親自看房、也沒向屋主或物業管理確認的房源，不要先付押金。用可追蹤的方式付款並索取收據。',
    },
    {
      en: 'Keep the A/C filter and thermostat instructions handy, and report cooling problems in writing the same day.',
      zh: '把冷氣濾網與溫控器說明放在手邊，冷氣一有問題當天就用書面通知房東。',
    },
    {
      en: 'If you rent a house or condo in an HOA community, ask for the HOA rules and whether they apply to you as a tenant.',
      zh: '如果租的房子在 HOA 社區裡，向房東索取 HOA 規章，並問清楚房客是否也要遵守。',
    },
    {
      en: 'Save every text, email, and receipt in one folder. If a dispute happens, dated records matter more than memory.',
      zh: '把所有簡訊、電子郵件與收據存在同一個資料夾。真的發生糾紛時，有日期的紀錄比記憶可靠得多。',
    },
  ],
  officialResources: [
    {
      label: { en: 'Security deposits (A.R.S. 33-1321)', zh: '押金規定（A.R.S. 33-1321）' },
      url: 'https://www.azleg.gov/ars/33/01321.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Landlord must maintain fit premises (A.R.S. 33-1324)', zh: '房東維持居住品質義務（A.R.S. 33-1324）' },
      url: 'https://www.azleg.gov/ars/33/01324.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Failure to supply cooling or essential services (A.R.S. 33-1364)', zh: '未提供冷氣或基本服務（A.R.S. 33-1364）' },
      url: 'https://www.azleg.gov/ars/33/01364.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Landlord access (A.R.S. 33-1343)', zh: '房東進屋規定（A.R.S. 33-1343）' },
      url: 'https://www.azleg.gov/ars/33/01343.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Nonpayment of rent (A.R.S. 33-1368)', zh: '未付房租（A.R.S. 33-1368）' },
      url: 'https://www.azleg.gov/ars/33/01368.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Prohibited lease provisions (A.R.S. 33-1315)', zh: '租約禁止條款（A.R.S. 33-1315）' },
      url: 'https://www.azleg.gov/ars/33/01315.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Phoenix heat safety and renters\' cooling rights', zh: '鳳凰城高溫安全與房客冷氣權益' },
      url: 'https://www.phoenix.gov/administration/departments/heat/heat-response-programs/heat-safety.html',
      source: 'City of Phoenix',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not legal advice. For a lease review, a deposit dispute, or an eviction notice, talk to a lawyer. A licensed real estate agent or property manager can help you find a rental. Our directory lists Chinese-speaking realtors and legal professionals across metro Phoenix.',
      zh: '本文為一般資訊，不構成法律建議。審閱租約、押金糾紛或收到驅逐通知時，請諮詢律師；找房子可以請有執照的房地產經紀人或物業管理協助。本站名錄列有大鳳凰城說中文的地產經紀與法律專業人士。',
    },
    categorySlugs: ['real-estate', 'legal-finance'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
