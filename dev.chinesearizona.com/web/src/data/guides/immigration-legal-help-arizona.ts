import type { Guide } from '@/lib/types';

// Facts checked against the linked USCIS, DOJ EOIR, and Arizona statute pages
// on 2026-11-27.
export const immigrationLegalHelpGuide: Guide = {
  slug: 'immigration-legal-help-avoid-scams-arizona',
  section: 'safety',
  title: {
    en: 'Finding Real Immigration Legal Help in Arizona and Avoiding Scams',
    zh: '在亞利桑那找合法的移民法律協助，避開移民詐騙',
  },
  excerpt: {
    en: 'Who is legally allowed to represent you or prepare immigration forms in Arizona, how to check an attorney or accredited representative, the payment rules USCIS actually uses, and where to report a scam.',
    zh: '在亞利桑那，誰在法律上可以代理你或替你準備移民表格、怎麼查證律師或認證代表、USCIS 真正的收費方式，以及遇到詐騙該向哪裡檢舉。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
  readTime: '8 min',
  publishedAt: '2026-11-27T19:00:00.000Z',
  updatedAt: '2026-11-27T19:00:00.000Z',
  body: [
    {
      en: 'Green cards, work permits, student status, and citizenship are high-stakes paperwork, and that is exactly why scams target them. USCIS warns that some people and businesses pretend to be immigration experts or claim special connections to the government. A wrong form, a missed deadline, or false information signed under your name can be hard and costly to fix.',
      zh: '綠卡、工作許可、學生身分與入籍，每一件都牽涉重大，也正因如此成為詐騙目標。美國公民及移民服務局（USCIS）提醒，有些個人與公司會假裝是移民專家，或自稱和政府有特殊關係。填錯表、錯過期限，或以你的名義簽下不實資料，事後往往很難補救，代價也高。',
    },
    {
      en: 'You do not need a representative to file forms with USCIS; you may file and represent yourself. If you do hire help, both federal rules and Arizona law limit who may give you legal advice. In Arizona, charging for immigration legal services you are not authorized to provide is a class 6 felony, and the Attorney General can investigate.',
      zh: '向 USCIS 送件並不一定要找代理人，你可以自己送件、自己代表自己。但如果要找人協助，聯邦規定與亞利桑那州法都限制了誰可以提供法律建議。在亞利桑那，未經授權收費提供移民法律服務屬於第 6 級重罪，州檢察長可以調查。',
    },
    {
      en: 'This guide is general information based on USCIS, Department of Justice, and Arizona statute pages checked on November 27, 2026. It is not legal advice about your case.',
      zh: '本文為一般資訊，依據 2026 年 11 月 27 日查證的 USCIS、美國司法部與亞利桑那州法網頁整理，不構成對個案的法律建議。',
    },
  ],
  quickChecklist: [
    {
      en: 'Ask an attorney for proof of a current license, then verify it with the state bar that licensed them. USCIS also points to the Department of Justice list of disciplined practitioners.',
      zh: '請律師出示有效執照，並向核發執照的州律師公會查證。USCIS 也建議查看美國司法部的受懲戒執業人員名單。',
    },
    {
      en: 'If someone says they are an accredited representative, look them up on the Department of Justice Recognition and Accreditation roster and confirm they work for a recognized organization.',
      zh: '如果對方自稱是「認證代表」（accredited representative），到美國司法部的認可與認證名冊查證，並確認他任職於認可機構。',
    },
    {
      en: 'Download USCIS forms yourself. USCIS says its forms are free to everyone.',
      zh: 'USCIS 的表格請自己下載。USCIS 明確表示所有表格都是免費的。',
    },
    {
      en: 'Pay USCIS fees only in the ways USCIS lists on its fee page; online payments go only through your USCIS online account and Pay.gov. Never pay a person who calls or emails you.',
      zh: 'USCIS 規費只用 USCIS 收費頁面列出的方式繳納，線上繳費只能透過你的 USCIS 線上帳戶與 Pay.gov；絕對不要付錢給打電話或寄電子郵件來的人。',
    },
    {
      en: 'Keep copies of every form, notice, and receipt. Never sign a blank form or a form with false information.',
      zh: '每一份表格、通知與收據都要留副本。不要簽空白表格，也不要簽有不實內容的表格。',
    },
    {
      en: 'Keep your original documents. Arizona law says a person or organization may not keep a client\'s original document without the client\'s permission.',
      zh: '原始文件要自己保管。亞利桑那州法規定，未經當事人同意，任何人或機構都不得扣留其原始文件。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Who can legally help you', zh: '誰可以合法協助你' },
      bullets: [
        {
          en: 'USCIS lists who may represent you before it: an attorney in good standing with a US state or territory bar who is not disbarred or restricted; an accredited representative working for an organization on the Department of Justice list of recognized organizations; or a law student or graduate supervised by an attorney or accredited representative. Foreign attorneys may represent you only in matters outside the United States.',
          zh: 'USCIS 列出可以在該局代理你的人：在美國任一州或屬地律師公會具良好資格、未被吊銷或限制執業的律師；任職於美國司法部認可機構名單上的認證代表；或在律師或認證代表監督下的法學院學生或畢業生。外國律師只能代理美國境外的事務。',
        },
        {
          en: 'Accredited representatives are non-attorneys accredited through the Justice Department\'s Recognition and Accreditation Program. They may provide immigration legal services only through recognized organizations, and only non-profit, federally tax-exempt groups can be recognized.',
          zh: '認證代表不是律師，而是經美國司法部「認可與認證計畫」認證的人員。他們只能透過認可機構提供移民法律服務，而只有聯邦免稅的非營利組織才能成為認可機構。',
        },
        {
          en: 'Arizona law sets its own list, and says that apart from those listed, no one may represent others, prepare immigration applications or forms, or give legal advice on an immigration matter. Anyone who misrepresents the immigration services they can provide also violates the law.',
          zh: '亞利桑那州法另有一份名單，並規定除了名單上的人以外，任何人都不得代理他人、準備移民申請或表格，或就移民事務提供法律建議。誇大或不實宣稱自己能提供的移民服務，也屬違法。',
        },
        {
          en: 'An attorney who practices immigration law in Arizona but is not licensed by the State Bar of Arizona must tell you in writing, when you hire them, which state they are licensed in, and may not advise you on Arizona law.',
          zh: '在亞利桑那執業但沒有亞利桑那州律師執照的移民律師，必須在受委任時以書面告知你他在哪一州取得執照，而且不得就亞利桑那州法提供建議。',
        },
      ],
    },
    {
      title: { en: 'Notarios, consultants, and paid form-fillers', zh: '公證人、移民顧問與代填表格' },
      bullets: [
        {
          en: 'USCIS explains that a notary public in the United States is not an attorney. Notaries are authorized by states to witness signatures on important documents and administer oaths, not to give immigration legal services.',
          zh: 'USCIS 說明，美國的公證人（notary public）不是律師。公證人由州政府授權見證重要文件簽名、主持宣誓，並不能提供移民法律服務。',
        },
        {
          en: 'The same caution applies to anyone who calls themselves a visa consultant or offers "代辦" services. Titles do not matter; what matters is whether the person is an attorney or an accredited representative.',
          zh: '自稱「移民顧問」或提供「代辦」服務的人也一樣。頭銜不重要，重點是對方是不是律師或認證代表。',
        },
        {
          en: 'Be wary of anyone who promises a guaranteed approval, a faster line, or special connections. USCIS names claimed government connections as a warning sign.',
          zh: '對保證核准、保證插隊或自稱有特殊關係的人要特別小心。USCIS 明確把自稱與政府有關係列為警訊。',
        },
      ],
    },
    {
      title: { en: 'Scams USCIS warns about', zh: 'USCIS 提醒的常見詐騙' },
      bullets: [
        {
          en: 'Government impersonators: USCIS says it contacts you only through official government channels and will not contact you through personal social media accounts. Government email addresses end in .gov.',
          zh: '假冒政府人員：USCIS 表示只會透過官方管道聯絡你，不會用個人社群媒體帳號聯絡。政府電子郵件地址一律以 .gov 結尾。',
        },
        {
          en: 'Payment demands: USCIS will never ask you to transfer money to an individual, does not accept Western Union, MoneyGram, PayPal, Venmo, or gift cards for immigration fees, and will never ask you to pay a person by phone or email.',
          zh: '要求付款：USCIS 不會要求你匯款給個人，不接受以 Western Union、MoneyGram、PayPal、Venmo 或禮物卡繳納移民規費，也不會在電話或電子郵件中要你付錢給某個人。',
        },
        {
          en: 'Visa lottery messages: the Diversity Visa Program is run by the State Department, not USCIS. USCIS notes the program is free and the State Department will never email you about being selected.',
          zh: '抽籤中獎通知：多元化移民簽證（DV）由美國國務院辦理，不是 USCIS。USCIS 提醒，這個計畫完全免費，國務院也不會用電子郵件通知你中籤。',
        },
        {
          en: 'Job offers and student scams: be suspicious of a job offer that asks you to pay money, and students should confirm their school is SEVP-certified before relying on a Form I-20.',
          zh: '工作與留學詐騙：要求先付錢的工作機會要提高警覺；學生在依賴 Form I-20 之前，先確認學校是否經 SEVP 認證。',
        },
      ],
    },
    {
      title: { en: 'Where to report and find help', zh: '去哪裡檢舉、去哪裡求助' },
      bullets: [
        {
          en: 'USCIS says suspected immigration fraud can be reported to the Federal Trade Commission or your state consumer protection office. In Arizona, the Attorney General can take action against unauthorized immigration practice.',
          zh: 'USCIS 表示，疑似移民詐騙可以向聯邦貿易委員會（FTC）或州消費者保護單位檢舉。在亞利桑那，州檢察長可以對無照從事移民業務者採取行動。',
        },
        {
          en: 'USCIS points to the Department of Justice list of attorneys who provide immigration services for free or at low cost, and to its list of recognized organizations and accredited representatives.',
          zh: 'USCIS 也推薦美國司法部的免費或低收費移民律師名單，以及認可機構與認證代表名單。',
        },
        {
          en: 'If you or someone you know is being forced to work or threatened, call the National Human Trafficking Hotline at 888-373-7888.',
          zh: '如果你或認識的人被強迫工作或受到威脅，請撥打全國人口販運求助專線 888-373-7888。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'A recommendation in a WeChat or LINE group is a starting point, not a check. Verify the license yourself.',
      zh: '微信或 LINE 群組裡的推薦只能當參考，執照還是要自己查。',
    },
    {
      en: 'Get a written fee agreement that says what is included and who will actually work on your case.',
      zh: '請對方提供書面收費協議，寫清楚包含哪些服務，以及實際由誰處理你的案件。',
    },
    {
      en: 'Make sure any form filed for you has your representative\'s Form G-28 attached, which USCIS uses to send case information to both you and your representative.',
      zh: '確認替你送出的申請附有代理人的 Form G-28；USCIS 會依這份表格把案件資訊同時寄給你和代理人。',
    },
  ],
  officialResources: [
    {
      label: { en: 'Find legal services (who can represent you)', zh: '尋找法律服務（誰可以代理你）' },
      url: 'https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/legal-services',
      source: 'US Citizenship and Immigration Services',
    },
    {
      label: { en: 'Common immigration scams', zh: '常見移民詐騙' },
      url: 'https://www.uscis.gov/scams-fraud-and-misconduct/avoid-scams/common-scams',
      source: 'US Citizenship and Immigration Services',
    },
    {
      label: { en: 'Recognition and Accreditation Program', zh: '認可與認證計畫' },
      url: 'https://www.justice.gov/eoir/recognition-and-accreditation-program',
      source: 'US Department of Justice, EOIR',
    },
    {
      label: { en: 'Who may provide immigration services (A.R.S. 12-2702)', zh: '誰可以提供移民服務（A.R.S. 12-2702）' },
      url: 'https://www.azleg.gov/ars/12/02702.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Penalties (A.R.S. 12-2703)', zh: '罰則（A.R.S. 12-2703）' },
      url: 'https://www.azleg.gov/ars/12/02703.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Attorney General enforcement (A.R.S. 12-2704)', zh: '州檢察長執法（A.R.S. 12-2704）' },
      url: 'https://www.azleg.gov/ars/12/02704.htm',
      source: 'Arizona State Legislature',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not legal advice. Immigration cases turn on details and deadlines, so talk to a licensed immigration attorney or a DOJ-accredited representative about your situation. Our directory lists Chinese-speaking legal professionals across metro Phoenix; check any attorney\'s license before you hire them.',
      zh: '本文為一般資訊，不構成法律建議。移民案件取決於細節與期限，請就你的情況諮詢有執照的移民律師或司法部認證代表。本站名錄列有大鳳凰城說中文的法律專業人士；委任前，請務必查證律師執照。',
    },
    categorySlugs: ['legal-finance'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
