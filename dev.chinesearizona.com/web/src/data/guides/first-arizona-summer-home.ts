import type { Guide } from '@/lib/types';

// Facts checked against the linked APS, SRP, City of Phoenix, and Arizona
// statute sources on 2026-11-27.
export const firstArizonaSummerGuide: Guide = {
  slug: 'first-arizona-summer-home-ac',
  section: 'utilities',
  title: {
    en: 'Your First Arizona Summer at Home: A/C, Peak-Hour Power Plans, and Hiring a Licensed Contractor',
    zh: '亞利桑那第一個夏天：冷氣、尖峰電價方案與找合格包商',
  },
  excerpt: {
    en: 'How APS and SRP time-of-use plans price summer evenings, simple ways to keep the A/C running, when Arizona law requires a licensed contractor, and where to cool off if the system fails.',
    zh: 'APS 與 SRP 的時段電價怎麼計算夏天傍晚的用電、讓冷氣穩定運作的基本做法、亞利桑那法律何時要求找有執照的包商，以及冷氣故障時可以去哪裡避暑。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80',
  readTime: '8 min',
  publishedAt: '2026-11-27T18:20:00.000Z',
  updatedAt: '2026-11-27T18:20:00.000Z',
  body: [
    {
      en: 'For a household new to the desert, the first summer comes down to three things: keeping the air conditioning working, keeping the power bill predictable, and knowing who is legally allowed to fix the system. Winter is the easiest time to prepare, because nothing is broken yet and you can compare plans, find a contractor, and learn your thermostat without the house heating up.',
      zh: '對剛搬到沙漠的家庭來說，第一個夏天的重點只有三件事：讓冷氣正常運作、讓電費可以預估，以及知道法律上誰可以修冷氣。冬天是最適合準備的時候，因為東西還沒壞，可以慢慢比較電價方案、找包商、熟悉溫控器，不用一邊熱一邊趕。',
    },
    {
      en: 'Our utilities guide covers starting electric, water, and trash service. This guide picks up from there, with the summer-specific parts: peak-hour pricing, A/C upkeep, licensed contractors, and heat safety. It was checked against APS, SRP, City of Phoenix, and Arizona statute pages on November 27, 2026.',
      zh: '本站的公用事業指南說明怎麼開通電、水與垃圾服務；這篇接著談夏天才會遇到的事：尖峰時段電價、冷氣保養、合格包商與高溫安全。內容依據 2026 年 11 月 27 日查證的 APS、SRP、鳳凰城市政府與亞利桑那州法網頁整理。',
    },
    {
      en: 'Utility price plans change, so check your own plan and its current hours on your utility\'s website before making decisions.',
      zh: '電價方案會調整，做決定前請到你的電力公司網站確認自己的方案與最新時段。',
    },
  ],
  quickChecklist: [
    {
      en: 'Find out whether APS or SRP serves your address and which price plan your account is on.',
      zh: '確認你家的電力公司是 APS 還是 SRP，以及帳戶目前用的是哪個電價方案。',
    },
    {
      en: 'If you are on a time-of-use plan, write the on-peak hours on the fridge and run the washer, dryer, dishwasher, and pool pump outside them.',
      zh: '如果用的是時段電價，把尖峰時段寫下來貼在冰箱上，洗衣機、烘衣機、洗碗機與泳池幫浦都避開這段時間使用。',
    },
    {
      en: 'Find the A/C filter, the thermostat manual, and the breaker for the outdoor unit before the first hot week.',
      zh: '第一波熱浪來之前，先找到冷氣濾網、溫控器說明書，以及室外機的電源開關。',
    },
    {
      en: 'Before hiring anyone for A/C, electrical, plumbing, or roofing work, check that the business holds an Arizona contractor\'s license.',
      zh: '請人處理冷氣、電路、水管或屋頂之前，先確認對方持有亞利桑那包商執照。',
    },
    {
      en: 'Save the Heat Relief Network map on your phone so you know where to cool off if the power or A/C fails.',
      zh: '把 Heat Relief Network 地圖存在手機裡，萬一停電或冷氣故障，就知道可以去哪裡避暑。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Peak-hour power plans', zh: '尖峰時段電價方案' },
      bullets: [
        {
          en: 'APS\'s Time-of-Use 4pm-7pm Weekdays plan charges more for energy used from 4 to 7 p.m. on weekdays. APS suggests shifting major appliances such as the washer and dryer, dishwasher, and pool pump to lower-cost off-peak hours.',
          zh: 'APS 的「Time-of-Use 4pm-7pm Weekdays」方案，平日下午 4 點到 7 點用電較貴。APS 建議把洗衣機、烘衣機、洗碗機與泳池幫浦等大型家電移到較便宜的離峰時段使用。',
        },
        {
          en: 'SRP\'s Conserve 6-9 p.m. and Save plan gives the most savings when you limit energy use on weekdays from 6 to 9 p.m. year-round, with lower prices from 8 a.m. to 3 p.m. SRP also offers Manage Demand 5-10 p.m. and Save, a Basic Price Plan with the same price at any time, and the prepaid M-Power program.',
          zh: 'SRP 的「Conserve 6-9 p.m. and Save」方案，全年平日晚上 6 點到 9 點少用電最省，早上 8 點到下午 3 點電價較低。SRP 另有「Manage Demand 5-10 p.m. and Save」、任何時段同價的基本方案（Basic Price Plan），以及預付制的 M-Power。',
        },
        {
          en: 'SRP lists several older plans as discontinued, including its original Time-of-Use and EZ-3 plans. If your account is on one of them, check what you can switch to.',
          zh: 'SRP 已將幾個舊方案列為停辦，包括原本的 Time-of-Use 與 EZ-3。如果你的帳戶還在這些方案上，記得確認可以改成哪些方案。',
        },
        {
          en: 'One way to use a time-of-use plan in summer is to cool the house a little more before the on-peak window and let the temperature drift up during it. Test the approach on a mild week first.',
          zh: '夏天使用時段電價的一個做法是：尖峰開始前把室內先降溫一點，尖峰時段讓溫度慢慢回升。建議先在不那麼熱的一週試試看。',
        },
      ],
    },
    {
      title: { en: 'Keeping the A/C running', zh: '讓冷氣正常運作' },
      bullets: [
        {
          en: 'Follow the filter schedule in your system\'s manual, and check the filter again after a dust storm.',
          zh: '依冷氣說明書的時程更換或清潔濾網，遇到沙塵暴後再多檢查一次。',
        },
        {
          en: 'Keep plants, trash bins, and stored items away from the outdoor unit so air can move freely.',
          zh: '室外機周圍不要堆放植物、垃圾桶或雜物，保持通風。',
        },
        {
          en: 'If the system stops cooling, check the thermostat setting and batteries and the breaker before calling for service, and write down what you observed.',
          zh: '冷氣突然不冷時，先檢查溫控器設定、電池與電源開關，再叫人維修，並把觀察到的狀況記下來。',
        },
        {
          en: 'If the house is getting dangerously hot, leave. The Heat Relief Network offers free water and indoor places to cool off, and Phoenix parks and recreation centers, senior centers, and other city buildings act as hydration stations.',
          zh: '如果室內熱到有危險，就先離開。Heat Relief Network 提供免費飲水與室內避暑地點，鳳凰城的公園休閒中心、老人中心與其他市府建築也是補水站。',
        },
      ],
    },
    {
      title: { en: 'When Arizona law requires a licensed contractor', zh: '亞利桑那法律何時要求有執照的包商' },
      bullets: [
        {
          en: 'Arizona law makes it unlawful to act as a contractor, bid on construction work, or claim to be a contractor without a contractor\'s license in good standing, unless an exemption applies. Contractor licenses are handled by the Arizona Registrar of Contractors (ROC).',
          zh: '亞利桑那州法規定，沒有有效包商執照就以包商身分營業、投標工程或自稱包商是違法的，除非符合豁免。包商執照由亞利桑那包商登記局（ROC）管理。',
        },
        {
          en: 'The "handyman" exemption covers only casual or minor work where the total price for the project, including labor and materials, is less than $1,000. It does not apply when the work needs a local building permit, when the job is part of a larger project or split into smaller contracts, or when the person advertises without the words "not a licensed contractor."',
          zh: '所謂「修繕工」豁免只適用於零星或小型工作，而且整個工程連工帶料總價低於 1,000 美元。如果工作需要地方建築許可、屬於較大工程的一部分或被拆成多張小合約，或對方打廣告時沒有註明「not a licensed contractor」（非持照包商），就不適用豁免。',
        },
        {
          en: 'The ROC runs the Residential Contractors\' Recovery Fund for homeowners who live in, or plan to live in, a home damaged by a licensed residential contractor\'s failure to build or improve it adequately. It covers licensed contractors, which is one more reason to check the license first.',
          zh: 'ROC 設有「住宅包商補償基金」（Residential Contractors\' Recovery Fund），對象是住在（或打算住在）房子裡、因持照住宅包商施工不當而受損的屋主。這個基金只涵蓋有執照的包商，這也是先查執照的另一個理由。',
        },
        {
          en: 'Ask for written estimates from more than one licensed contractor for big jobs such as replacing a system, and avoid paying a large share in cash before work starts.',
          zh: '更換整套冷氣這類大工程，請向不只一家持照包商索取書面估價，並避免開工前就用現金付一大筆。',
        },
      ],
    },
    {
      title: { en: 'Heat safety at home and in the car', zh: '居家與行車的高溫安全' },
      bullets: [
        {
          en: 'Never leave a child in a parked car, not even for a minute. The City of Phoenix cites Phoenix Children\'s Hospital: temperatures inside a parked car can reach 131 to 172 degrees within 15 minutes.',
          zh: '絕對不要把孩子留在停著的車裡，一分鐘都不行。鳳凰城市政府引用鳳凰城兒童醫院的資料：停放的車內溫度在 15 分鐘內可達華氏 131 到 172 度。',
        },
        {
          en: 'Know the warning signs of heat exhaustion, such as feeling faint or dizzy, or pale, clammy skin. Call 911 in an emergency.',
          zh: '認識熱衰竭的警訊，例如頭暈、快要昏倒，或皮膚蒼白濕冷。緊急時撥打 911。',
        },
        {
          en: 'Renters in Phoenix: the city requires landlords to keep units at a maximum of 82°F with air conditioning or 86°F with evaporative coolers, and investigates complaints at 602-262-7210.',
          zh: '在鳳凰城租房的人：市政府規定房東要讓有冷氣的房屋維持在華氏 82 度以下、蒸發式冷卻器的房屋在 86 度以下，申訴電話 602-262-7210。',
        },
        {
          en: 'Check on older relatives and neighbors during heat waves, especially anyone without effective cooling.',
          zh: '熱浪期間多關心家中長輩與鄰居，特別是家裡沒有足夠冷氣的人。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'Be cautious with door-to-door offers for A/C inspections or system replacements. Check the license and get a second estimate before you agree to anything.',
      zh: '對上門推銷冷氣檢查或換機的人要小心。答應任何事之前，先查執照並再找一家估價。',
    },
    {
      en: 'If a caller threatens to cut off your power unless you pay immediately, hang up and call your utility using the number on your bill.',
      zh: '如果有人來電威脅不立刻付款就斷電，請直接掛斷，再用帳單上的電話號碼打給電力公司確認。',
    },
    {
      en: 'Keep receipts, model numbers, and warranty papers for your A/C in one place. They make service calls faster.',
      zh: '把冷氣的收據、型號與保固文件放在一起，叫修時會快很多。',
    },
  ],
  officialResources: [
    {
      label: { en: 'APS Time-of-Use 4pm-7pm Weekdays plan', zh: 'APS 平日 4-7 PM 時段電價方案' },
      url: 'https://www.aps.com/en/Residential/Service-Plans/Compare-Service-Plans/Time-of-Use-4pm-7pm-Weekdays',
      source: 'Arizona Public Service',
    },
    {
      label: { en: 'Compare SRP residential price plans', zh: '比較 SRP 住宅電價方案' },
      url: 'https://www.srpnet.com/price-plans/residential-electric/compare-plans',
      source: 'Salt River Project',
    },
    {
      label: { en: 'SRP Conserve 6-9 p.m. and Save', zh: 'SRP Conserve 6-9 p.m. and Save 方案' },
      url: 'https://www.srpnet.com/price-plans/residential-electric/conserve-6-9pm-and-save',
      source: 'Salt River Project',
    },
    {
      label: { en: 'Contracting without a license (A.R.S. 32-1151)', zh: '無照承攬工程（A.R.S. 32-1151）' },
      url: 'https://www.azleg.gov/ars/32/01151.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Handyman exemption (A.R.S. 32-1121)', zh: '修繕工豁免（A.R.S. 32-1121）' },
      url: 'https://www.azleg.gov/ars/32/01121.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Residential Contractors\' Recovery Fund (A.R.S. 32-1132)', zh: '住宅包商補償基金（A.R.S. 32-1132）' },
      url: 'https://www.azleg.gov/ars/32/01132.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Arizona Registrar of Contractors', zh: '亞利桑那包商登記局' },
      url: 'https://roc.az.gov/',
      source: 'Arizona Registrar of Contractors',
    },
    {
      label: { en: 'Phoenix heat safety', zh: '鳳凰城高溫安全' },
      url: 'https://www.phoenix.gov/administration/departments/heat/heat-response-programs/heat-safety.html',
      source: 'City of Phoenix',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not legal or technical advice. For A/C service, repairs, or replacement, hire a licensed contractor and confirm the license with the ROC. Our directory lists Chinese-speaking home service providers across metro Phoenix.',
      zh: '本文為一般資訊，不構成法律或技術建議。冷氣保養、維修或更換，請找有執照的包商，並向 ROC 確認執照。本站名錄列有大鳳凰城說中文的居家維修服務。',
    },
    categorySlugs: ['home-services'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
