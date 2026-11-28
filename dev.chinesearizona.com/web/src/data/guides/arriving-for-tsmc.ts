import type { Guide } from '@/lib/types';

// Facts checked on 2026-11-27 against the Maricopa County School
// Superintendent, Deer Valley Unified, Peoria Unified, A.R.S. 15-816.01,
// Taiwan's Ministry of Foreign Affairs press releases, and Taiwan's Bureau of
// Consular Affairs. Grocery listings come from this site's own directory.
export const arrivingForTsmcGuide: Guide = {
  slug: 'arriving-for-tsmc-north-phoenix-peoria',
  section: 'moving',
  title: {
    en: 'Arriving for TSMC: School Districts, Taiwan Document Services, and Groceries for North Phoenix and Peoria Families',
    zh: '為台積電來亞利桑那：北鳳凰城與 Peoria 家庭的學區、台灣證件服務與採買',
  },
  excerpt: {
    en: 'How to find the school district and school assigned to a home, what Deer Valley Unified asks for at registration, where Taiwan passport and document services for Arizona stand now, and the Asian supermarkets already in our directory.',
    zh: '如何查詢房子所屬的學區與分發學校、Deer Valley 學區註冊要準備哪些文件、亞利桑那的台灣護照與文件服務目前狀況，以及本站名錄中已收錄的亞洲超市。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?auto=format&fit=crop&w=1200&q=80',
  readTime: '7 min',
  publishedAt: '2026-11-28T00:30:00.000Z',
  updatedAt: '2026-11-28T00:30:00.000Z',
  body: [
    {
      en: 'Our guide to where newcomer families look first compares areas, and our 30-day moving checklist covers the first month. This page adds the specific lookups a family heading to north Phoenix, Peoria, or Glendale needs: which district serves the home, how to register, where Taiwan passport and document matters are handled, and where to buy groceries.',
      zh: '本站「新移居家庭先看哪裡」一文比較各區特色，「搬來亞利桑那 30 天安家清單」整理第一個月要辦的事。這一篇補充前往北鳳凰城、Peoria 或 Glendale 的家庭需要的具體查詢：房子屬於哪個學區、怎麼註冊、台灣護照與文件在哪裡辦，以及去哪裡買菜。',
    },
    {
      en: 'Everything here comes from official pages checked on November 27, 2026, except the grocery list, which comes from this site\'s own directory. We do not give drive times or rank neighborhoods.',
      zh: '除了超市名單取自本站名錄之外，本文內容都來自 2026 年 11 月 27 日查證的官方網頁。本文不提供車程，也不替社區排名。',
    },
    {
      en: 'Districts, boundaries, and office details change, so confirm with the district or office before you sign a lease or book travel.',
      zh: '學區範圍與辦事處資訊都可能調整，簽租約或安排行程前，請先向學區或辦事處確認。',
    },
  ],
  quickChecklist: [
    {
      en: 'Look up the home\'s school district on the Maricopa County School Superintendent\'s "Locate My Home School District" map.',
      zh: '用 Maricopa 郡教育局長辦公室的「Locate My Home School District」地圖，查詢房子所屬學區。',
    },
    {
      en: 'Then find the assigned school on that district\'s boundary map before you sign.',
      zh: '再到該學區的學區範圍地圖查分發學校，確認後再簽約。',
    },
    {
      en: 'For Deer Valley Unified, have a birth certificate, immunization record, proof of residency, parent ID, and the previous school\'s withdrawal form ready.',
      zh: '如果是 Deer Valley 學區，先備妥出生證明、預防接種紀錄、居住證明、家長身分證件，以及前一所學校的轉出證明。',
    },
    {
      en: 'Check Taiwan\'s Ministry of Foreign Affairs and the Taipei Economic and Cultural Office pages for the new Phoenix office\'s consular services before booking a trip to Los Angeles.',
      zh: '在訂機票去洛杉磯辦事之前，先查看外交部與台北經濟文化辦事處網頁，確認新的駐鳳凰城辦事處已開辦哪些領務。',
    },
    {
      en: 'Save the Asian supermarkets below, and see our Chinese classes guide for weekend schools and Mandarin immersion.',
      zh: '把下方的亞洲超市存起來，週末中文學校與中文沉浸課程請參考本站的兒童中文課指南。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Find the school district and the assigned school', zh: '查詢學區與分發學校' },
      bullets: [
        {
          en: 'Start with the "Locate My Home School District" map linked from the Maricopa County School Superintendent\'s school district page. The county explains that its districts are elementary (kindergarten to 8th grade), union high school (9th to 12th), or unified (kindergarten to 12th), so some addresses belong to one district for K–8 and another for high school.',
          zh: '先從 Maricopa 郡教育局長辦公室學區頁面上的「Locate My Home School District」地圖查起。郡政府說明，學區分為小學學區（幼稚園至 8 年級）、聯合高中學區（9 至 12 年級）與一貫學區（幼稚園至 12 年級），所以有些地址的 K–8 與高中分屬不同學區。',
        },
        {
          en: 'Deer Valley Unified posts an interactive boundary map with separate layers for K–6 and K–8, 7th–8th grade, and high school. Open the map full screen with the icon in the upper right corner, then type the address into the map\'s search bar. The district also posts separate 2027–28 boundary maps, and its site lists boundary changes for 2027–28 in some areas, so check the year that matches your move.',
          zh: 'Deer Valley 學區提供互動式學區地圖，分為 K–6 與 K–8、7–8 年級與高中三個圖層。點右上角圖示切換全螢幕，再在地圖搜尋列輸入地址即可。學區另外公布 2027–28 學年的學區地圖，網站也列出部分地區 2027–28 學年的學區調整，請查看與搬家時間相符的年度。',
        },
        {
          en: 'Peoria Unified publishes a District & School Boundaries page. Its district office is at 6330 W. Thunderbird Road, Glendale, phone 623-486-6000.',
          zh: 'Peoria 學區公布有「District & School Boundaries」學區範圍頁面。學區辦公室位於 Glendale 的 6330 W. Thunderbird Road，電話 623-486-6000。',
        },
        {
          en: 'The county says Maricopa County has 58 school districts, so the county map is the quickest way to see which one covers a specific address.',
          zh: '郡政府表示 Maricopa 郡共有 58 個學區，想知道某個地址屬於哪個學區，郡政府地圖是最快的查法。',
        },
        {
          en: 'If you want a school other than the assigned one, Arizona law requires every district to have an open enrollment policy without charging tuition, with limited exceptions. Districts must enroll resident students at any time, give preference to resident students, returning students, and siblings, and use a fair selection process such as a lottery when space runs out.',
          zh: '想讀分發以外的學校時，亞利桑那州法規定每個學區都必須有免學費的跨區就讀（open enrollment）制度（少數例外）。學區必須隨時接受學區內學生入學，並優先錄取學區內學生、原校學生與兄弟姊妹；名額不足時，須以抽籤等公平方式決定。',
        },
      ],
    },
    {
      title: { en: 'Registering at a Deer Valley school', zh: '在 Deer Valley 學區註冊' },
      bullets: [
        {
          en: 'Deer Valley Unified asks parents to provide a birth certificate or certified copy, an immunization record, proof of residency (such as a utility bill, rent receipt, lease, or escrow document), parent identification, guardianship or custody papers if applicable, and the official withdrawal form from the previous school for grades 1 to 12.',
          zh: 'Deer Valley 學區要求家長提供出生證明或經認證的副本、預防接種紀錄、居住證明（例如水電帳單、房租收據、租約或過戶文件）、家長身分證件、必要時的監護或監護權文件，以及 1 至 12 年級學生前一所學校的正式轉出證明。',
        },
        {
          en: 'The district says registration is normally done at the school of attendance, and most school offices close in July and reopen two weeks before the first day of school. Families arriving in summer should plan around that.',
          zh: '學區表示，註冊通常在就讀的學校辦理，多數學校辦公室 7 月不開放，開學前兩週才恢復上班。夏天抵達的家庭請預先安排。',
        },
        {
          en: 'If you are registering for a school you are not zoned for, the district asks you to apply for open enrollment first, before registering.',
          zh: '如果要註冊的學校不是分發學校，學區要求先申請跨區就讀，再辦理註冊。',
        },
        {
          en: 'Deer Valley Unified also runs Mandarin immersion at Desert Sage Elementary. Our Chinese classes guide lists it with the district\'s application steps.',
          zh: 'Deer Valley 學區在 Desert Sage 小學設有中文沉浸課程，申請步驟請見本站的兒童中文課指南。',
        },
      ],
    },
    {
      title: { en: 'Taiwan passport and document services for Arizona', zh: '亞利桑那的台灣護照與文件服務' },
      bullets: [
        {
          en: 'Taiwan\'s Ministry of Foreign Affairs announced on July 3, 2026 that it would open the Taipei Economic and Cultural Office in Phoenix, and said that once it opens it will provide consular services nearby for people in Arizona and New Mexico. The ministry says the office opened on October 5, 2026, as Taiwan\'s 14th office in the United States.',
          zh: '外交部於 2026 年 7 月 3 日宣布設立「駐鳳凰城台北經濟文化辦事處」，並表示成立後將就近為亞利桑納州及新墨西哥州的僑胞、台商及國人提供更便捷的領務服務。外交部表示，該處已於 2026 年 10 月 5 日揭牌，是我國在美國的第 14 個館處。',
        },
        {
          en: 'On November 27, 2026, we could not find the Phoenix office\'s address, hours, or list of consular services on an official page, and the Taipei Economic and Cultural Office websites showed "under repair." Taiwan\'s Bureau of Consular Affairs still listed Arizona under the Taipei Economic and Cultural Office in Los Angeles.',
          zh: '截至 2026 年 11 月 27 日，我們在官方網頁上找不到駐鳳凰城辦事處的地址、服務時間或領務項目，台北經濟文化辦事處網站也顯示維修中。外交部領事事務局網站仍把亞利桑納州列在駐洛杉磯台北經濟文化辦事處之下。',
        },
        {
          en: 'Until the Phoenix office posts its services, check both offices before you travel for a passport renewal, document authentication, or other consular matter. The Los Angeles office is in another state, so ask whether a service can be handled by mail or at the Phoenix office first.',
          zh: '在駐鳳凰城辦事處公布服務項目之前，辦理護照換發、文件驗證或其他領務前，請先查看兩個辦事處的公告。駐洛杉磯辦事處在外州，出發前先問清楚能否郵寄辦理，或改到駐鳳凰城辦事處。',
        },
      ],
    },
    {
      title: { en: 'Asian supermarkets in our directory', zh: '本站名錄中的亞洲超市' },
      intro: {
        en: 'As of November 27, 2026. We list stores already in our directory and do not rank them or estimate drive times.',
        zh: '截至 2026 年 11 月 27 日。以下只列出本站名錄已收錄的店家，不排名也不估算車程。',
      },
      bullets: [
        {
          en: 'West Valley: Lee Lee Oriental Supermarket, 7575 W. Cactus Rd., Peoria. It is the only Asian supermarket in our directory in the West Valley so far.',
          zh: '西谷：Lee Lee Oriental Supermarket，Peoria 的 7575 W. Cactus Rd.。目前是本站名錄中唯一位於西谷的亞洲超市。',
        },
        {
          en: 'Chandler: 99 Ranch Market (northeast corner of W. Chandler Blvd. and N. Dobson Rd.) and Lee Lee Oriental Supermarket (2025 N. Dobson Rd.).',
          zh: 'Chandler：99 Ranch Market（W. Chandler Blvd. 與 N. Dobson Rd. 東北角），以及 Lee Lee Oriental Supermarket（2025 N. Dobson Rd.）。',
        },
        {
          en: 'Mesa: H Mart (1919 W. Main St.), Mekong Supermarket (66 S. Dobson Rd.), Korea Mart (1350 S. Longmore), and Dong Feng Seafood City (1116 S. Dobson Rd.).',
          zh: 'Mesa：H Mart（1919 W. Main St.）、Mekong Supermarket（66 S. Dobson Rd.）、Korea Mart（1350 S. Longmore）與 Dong Feng Seafood City（1116 S. Dobson Rd.）。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'A nearby school is not always the assigned school. Check the boundary map for the exact address.',
      zh: '離家近的學校不一定是分發學校，請用學區地圖查詢確切地址。',
    },
    {
      en: 'Bring immunization records with English translations, and ask the school which form it needs.',
      zh: '預防接種紀錄請附英文翻譯，並問清楚學校需要哪一種表格。',
    },
    {
      en: 'Store hours and addresses change. Check the store\'s listing before a long drive.',
      zh: '店家營業時間與地址可能變動，長途前往前請先查看店家資訊。',
    },
  ],
  officialResources: [
    {
      label: { en: 'Maricopa County school districts and "Locate My Home School District"', zh: 'Maricopa 郡學區與「Locate My Home School District」' },
      url: 'https://schoolsup.org/schooldistricts',
      source: 'Maricopa County School Superintendent',
    },
    {
      label: { en: 'Deer Valley Unified boundary maps', zh: 'Deer Valley 學區範圍地圖' },
      url: 'https://www.dvusd.org/school-information/general-school-information/dvusd-school-boundary-maps',
      source: 'Deer Valley Unified School District',
    },
    {
      label: { en: 'Deer Valley Unified: register for school', zh: 'Deer Valley 學區註冊' },
      url: 'https://dvusd.org/school-information/register-for-school',
      source: 'Deer Valley Unified School District',
    },
    {
      label: { en: 'Peoria Unified district and school boundaries', zh: 'Peoria 學區範圍' },
      url: 'https://www.peoriaunified.org/o/pusd/page/district-school-boundaries',
      source: 'Peoria Unified School District',
    },
    {
      label: { en: 'Open enrollment (A.R.S. 15-816.01)', zh: '跨區就讀（A.R.S. 15-816.01）' },
      url: 'https://www.azleg.gov/ars/15/00816-01.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'MOFA: Taiwan to open an office in Phoenix (July 3, 2026)', zh: '外交部：設立駐鳳凰城辦事處（2026/7/3）' },
      url: 'https://www.mofa.gov.tw/News_Content.aspx?n=96&s=122595',
      source: 'Ministry of Foreign Affairs, Republic of China (Taiwan)',
    },
    {
      label: { en: 'MOFA: Phoenix office opening (October 6, 2026)', zh: '外交部：駐鳳凰城辦事處揭牌（2026/10/6）' },
      url: 'https://www.mofa.gov.tw/News_Content.aspx?n=95&s=123191',
      source: 'Ministry of Foreign Affairs, Republic of China (Taiwan)',
    },
    {
      label: { en: 'Bureau of Consular Affairs: Los Angeles office region', zh: '領事事務局：駐洛杉磯辦事處轄區資訊' },
      url: 'https://www.boca.gov.tw/sp-foof-countrycp-02-107-79acc-04-1.html',
      source: 'Bureau of Consular Affairs, Republic of China (Taiwan)',
    },
    {
      label: { en: 'Taipei Economic and Cultural Office in Los Angeles', zh: '駐洛杉磯台北經濟文化辦事處' },
      url: 'https://www.roc-taiwan.org/uslax/index.html',
      source: 'Taipei Economic and Cultural Office in Los Angeles',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information. For housing, tutoring, and settling in, our directory lists Chinese-speaking realtors and education providers across metro Phoenix, and the stores above have their own listings below.',
      zh: '本文為一般資訊。找房、補習與安家相關服務，本站名錄列有大鳳凰城說中文的地產經紀與教育機構；上方超市的店家資訊列在下方。',
    },
    categorySlugs: ['real-estate', 'education'],
  },
  relatedBusinessSlugs: [
    'lee-lee-oriental-supermarket-peoria',
    '99-ranch-market-chandler',
    'lee-lee-oriental-supermarket-chandler',
    'h-mart-mesa',
    'mekong-supermarket-mesa',
    'korea-mart-mesa',
    'dong-feng-seafood-city-mesa',
  ],
  relatedEventSlugs: [],
};
