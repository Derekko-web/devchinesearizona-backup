import type { Guide } from '@/lib/types';

// Facts checked against the linked HealthCare.gov, Medicare.gov, CMS, eCFR
// (45 CFR 92.201 and 92.4), and Arizona statute pages on 2026-11-27.
export const chineseSpeakingDoctorDentistGuide: Guide = {
  slug: 'mandarin-speaking-doctor-dentist-phoenix',
  section: 'healthcare',
  title: {
    en: 'Finding a Mandarin- or Cantonese-Speaking Doctor or Dentist in Metro Phoenix',
    zh: '在大鳳凰城找會說國語或粵語的醫師與牙醫',
  },
  excerpt: {
    en: 'How to search by insurance network and language, your right to a free medical interpreter, how dental coverage works for adults, children, and Medicare, and how to check a provider\'s license and avoid surprise bills.',
    zh: '如何依保險網路與語言找醫師、你有權免費使用醫療口譯、成人、兒童與 Medicare 的牙科保障差異，以及如何查證醫師執照、避免意外帳單。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
  readTime: '8 min',
  publishedAt: '2026-11-27T21:00:00.000Z',
  updatedAt: '2026-11-27T21:00:00.000Z',
  body: [
    {
      en: 'For many families, a doctor who speaks Mandarin or Cantonese makes the difference between explaining symptoms clearly and nodding along. But language is only one filter. A doctor is only affordable if they are in your insurance network, close enough to reach when a child is sick, and taking new patients. The fastest search starts with your plan, not with a name from a group chat.',
      zh: '對很多家庭來說，醫師會不會說國語或粵語，決定了你是能把症狀講清楚，還是只能點頭。不過語言只是條件之一：醫師要在你的保險網路內才負擔得起，距離要近到孩子生病時去得了，還要有在收新病人。最快的找法是從你的保險計畫開始，而不是從群組裡聽來的名字開始。',
    },
    {
      en: 'If you cannot find a Chinese-speaking provider who fits, you still have options. Under a federal rule, health programs that receive federal financial assistance must provide language assistance free of charge, including a qualified interpreter when interpretation is needed. They may not require you to bring or pay for your own interpreter.',
      zh: '如果找不到條件合適又會說中文的醫師，你還是有其他選擇。依聯邦規定，接受聯邦經費補助的醫療計畫必須免費提供語言協助，需要口譯時要提供合格口譯員，而且不得要求你自備口譯或自付口譯費用。',
    },
    {
      en: 'This guide is general information based on HealthCare.gov, Medicare, CMS, federal regulation, and Arizona statute pages checked on November 27, 2026. It is not medical advice.',
      zh: '本文為一般資訊，依據 2026 年 11 月 27 日查證的 HealthCare.gov、Medicare、CMS、聯邦法規與亞利桑那州法網頁整理，不構成醫療建議。',
    },
  ],
  quickChecklist: [
    {
      en: 'Start with your plan\'s provider directory and filter by location and specialty. Your network is the set of providers your plan has contracted with.',
      zh: '先用保險計畫的醫師名錄，依地點與科別篩選。所謂網路，就是與你的計畫簽約的醫療院所與醫師。',
    },
    {
      en: 'Call the office before booking. Confirm it takes your exact plan, is accepting new patients, and whether the doctor or front desk staff speak Mandarin or Cantonese.',
      zh: '預約前先打電話，確認診所接受你「這一個」計畫、有收新病人，並問醫師或櫃台人員是否會說國語或粵語。',
    },
    {
      en: 'If you have an HMO, check whether you need a referral from your primary care doctor before seeing a specialist.',
      zh: '如果是 HMO 計畫，看專科前先確認是否需要家庭醫師轉診。',
    },
    {
      en: 'When you book, ask for an interpreter if you need one. In health programs covered by the federal rule, it is free.',
      zh: '預約時如果需要口譯就直接提出。適用聯邦規定的醫療計畫必須免費提供。',
    },
    {
      en: 'Look up the provider\'s record on the CMS NPI Registry and check the license with the Arizona Medical Board or the State Board of Dental Examiners.',
      zh: '到 CMS 的 NPI Registry 查醫師資料，並向亞利桑那醫療委員會（Arizona Medical Board）或州牙醫委員會（State Board of Dental Examiners）查證執照。',
    },
    {
      en: 'Book a preventive visit early. In-network preventive services are generally covered at no cost to you.',
      zh: '及早安排預防保健門診。網路內的預防保健服務一般不需要自付費用。',
    },
  ],
  detailSections: [
    {
      title: { en: 'Searching the smart way', zh: '聰明的找法' },
      bullets: [
        {
          en: 'Pick a primary care doctor first. In many HMOs, you need a written referral from your primary care doctor before you can see anyone else, and the plan may not pay if you skip it.',
          zh: '先選定家庭醫師。在許多 HMO 計畫中，看家庭醫師以外的醫師都需要家庭醫師開立書面轉診，沒有轉診的話保險可能不給付。',
        },
        {
          en: 'A directory\'s language listing may not tell the whole story. Ask who will be in the exam room and who answers the phone, since the doctor and the front desk may not speak the same languages.',
          zh: '名錄上的語言欄位不一定完整。問清楚看診時誰在診間、誰負責接電話，因為醫師和櫃台會說的語言可能不同。',
        },
        {
          en: 'Medical groups often have several locations. Confirm that the specific office and the specific doctor take your plan.',
          zh: '醫療集團常有多個據點。請確認你要去的那一間診所、那一位醫師都接受你的計畫。',
        },
        {
          en: 'HealthCare.gov says that in most cases you will not pay a copayment or coinsurance for certain preventive services, such as immunizations and screening tests, from an in-network provider, even before you meet your deductible.',
          zh: 'HealthCare.gov 說明，在網路內接受特定預防保健服務（例如疫苗與篩檢），多數情況下不需要付共付額或共保額，即使還沒達到自付額也一樣。',
        },
      ],
    },
    {
      title: { en: 'Your right to a medical interpreter', zh: '你有權使用醫療口譯' },
      bullets: [
        {
          en: 'The federal rule (45 CFR 92.201) applies to covered entities, which include recipients of federal financial assistance. They must take reasonable steps to give people with limited English meaningful access, and language help must be free, accurate, timely, and private.',
          zh: '這項聯邦規定（45 CFR 92.201）適用於「受規範機構」，包括接受聯邦經費補助的單位。它們必須採取合理措施，讓英語能力有限的人能實質使用服務，而語言協助必須免費、正確、及時並保護隱私。',
        },
        {
          en: 'A covered entity may not require you to provide your own interpreter or pay for one, and may not rely on a minor child to interpret except as a temporary measure in an emergency while finding a qualified interpreter.',
          zh: '受規範機構不得要求你自備口譯或自付口譯費用，也不得讓未成年子女翻譯，除非是緊急情況下、在找到合格口譯員之前的暫時做法。',
        },
        {
          en: 'An accompanying adult may interpret only in limited cases, such as when you ask for it in private with a qualified interpreter present, the adult agrees, and the request is documented.',
          zh: '陪同的成年人只有在有限情況下可以翻譯，例如你在合格口譯員在場、陪同者不在場時私下提出要求，陪同者同意，而且有書面紀錄。',
        },
      ],
    },
    {
      title: { en: 'Dental care and coverage', zh: '牙科照護與保障' },
      bullets: [
        {
          en: 'In the Marketplace, dental coverage comes two ways: health plans that include dental, or separate dental plans with their own premium. You cannot buy a Marketplace dental plan unless you are buying a health plan at the same time.',
          zh: '在 Marketplace，牙科保障有兩種：含牙科的健康保險計畫，或另外繳保費的獨立牙科計畫。不同時購買健康保險，就不能單獨在 Marketplace 買牙科計畫。',
        },
        {
          en: 'Dental coverage is an essential health benefit for children 18 and under, so it must be available to you for a child, though you do not have to buy it. It is not an essential health benefit for adults.',
          zh: '牙科是 18 歲以下兒童的基本健康福利，所以一定要提供給孩子選購，但你可以選擇不買；對成人來說，牙科不是基本健康福利。',
        },
        {
          en: 'Separate dental plans can have waiting periods before they cover services for adults, and you pay premiums during the wait. Ask the insurer before you enroll.',
          zh: '獨立牙科計畫對成人可能有等待期，等待期間不給付但仍要繳保費。投保前請先問清楚。',
        },
        {
          en: 'Original Medicare, in most cases, does not cover routine cleanings, fillings, extractions, dentures, or implants. Social Security notes that Medicare Advantage (Part C) plans may include dental insurance, so parents on Medicare should compare plans.',
          zh: '傳統 Medicare 多數情況下不給付洗牙、補牙、拔牙、假牙或植牙。社會安全局說明，Medicare Advantage（C 部分）計畫可能包含牙科保險，有 Medicare 的父母應比較各計畫。',
        },
      ],
    },
    {
      title: { en: 'Checking licenses and avoiding surprise bills', zh: '查證執照與避免意外帳單' },
      bullets: [
        {
          en: 'The CMS NPI Registry lets you search providers by name, type, city, and state. Arizona law establishes the Arizona Medical Board, which can investigate doctors of medicine, and the State Board of Dental Examiners, which can discipline licensed dentists.',
          zh: 'CMS 的 NPI Registry 可以用姓名、類型、城市與州別查詢醫療人員。亞利桑那州法設立了亞利桑那醫療委員會，可以調查西醫醫師；也設立了州牙醫委員會，可以懲處持照牙醫。',
        },
        {
          en: 'The federal No Surprises Act protects most insured people from unexpected out-of-network bills for emergency room visits, certain non-emergency care at in-network hospitals and surgery centers, and air ambulance services.',
          zh: '聯邦《無意外帳單法》（No Surprises Act）保護多數有保險的人，避免在急診、於網路內醫院或手術中心接受的特定非急診照護，以及空中救護時，收到意外的網路外帳單。',
        },
        {
          en: 'If you do not have or use insurance, providers usually must give you a good faith estimate when you schedule care in advance or ask for one. You may be able to dispute the bill if it is at least $400 more than the estimate.',
          zh: '如果沒有保險或不使用保險，醫療院所通常必須在你事先預約或提出要求時，提供費用的善意估價（good faith estimate）。實際帳單比估價多 400 美元以上時，你可能可以提出爭議。',
        },
        {
          en: 'CMS runs a help line for medical bill rights at 1-800-985-3059, with help in many languages.',
          zh: 'CMS 設有醫療帳單權益專線 1-800-985-3059，提供多種語言協助。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'Do not ask your child to interpret a diagnosis. Ask for a qualified interpreter instead.',
      zh: '不要讓孩子替你翻譯病情，請直接要求合格口譯員。',
    },
    {
      en: 'Bring a list of your medications with English names and doses, plus translated summaries of important records from Taiwan, China, or Hong Kong.',
      zh: '帶一份列出英文藥名與劑量的用藥清單，以及在台灣、中國或香港重要病歷的英文摘要。',
    },
    {
      en: 'Ask for a written estimate before dental work, and compare more than one office for big treatments such as crowns or implants.',
      zh: '牙科治療前先索取書面估價；牙冠、植牙這類大型治療，最好多比較幾家診所。',
    },
  ],
  officialResources: [
    {
      label: { en: 'What a provider network is', zh: '什麼是醫療網路' },
      url: 'https://www.healthcare.gov/glossary/network/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Referrals', zh: '轉診' },
      url: 'https://www.healthcare.gov/glossary/referral/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Preventive care benefits', zh: '預防保健福利' },
      url: 'https://www.healthcare.gov/coverage/preventive-care-benefits/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Dental coverage in the Marketplace', zh: 'Marketplace 牙科保障' },
      url: 'https://www.healthcare.gov/coverage/dental-coverage/',
      source: 'HealthCare.gov',
    },
    {
      label: { en: 'Medicare and dental services', zh: 'Medicare 與牙科服務' },
      url: 'https://www.medicare.gov/coverage/dental-services',
      source: 'Medicare.gov',
    },
    {
      label: { en: 'Language assistance rule (45 CFR 92.201)', zh: '語言協助規定（45 CFR 92.201）' },
      url: 'https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-92/subpart-C/section-92.201',
      source: 'Electronic Code of Federal Regulations',
    },
    {
      label: { en: 'Medical bill rights and the No Surprises Act', zh: '醫療帳單權益與無意外帳單法' },
      url: 'https://www.cms.gov/medical-bill-rights',
      source: 'Centers for Medicare & Medicaid Services',
    },
    {
      label: { en: 'NPI Registry provider search', zh: 'NPI Registry 醫療人員查詢' },
      url: 'https://npiregistry.cms.hhs.gov/',
      source: 'Centers for Medicare & Medicaid Services',
    },
    {
      label: { en: 'Arizona Medical Board (A.R.S. 32-1402)', zh: '亞利桑那醫療委員會（A.R.S. 32-1402）' },
      url: 'https://www.azleg.gov/ars/32/01402.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'State Board of Dental Examiners (A.R.S. 32-1203)', zh: '州牙醫委員會（A.R.S. 32-1203）' },
      url: 'https://www.azleg.gov/ars/32/01203.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Medical Board investigations (A.R.S. 32-1451)', zh: '醫療委員會調查權（A.R.S. 32-1451）' },
      url: 'https://www.azleg.gov/ars/32/01451.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Dental board discipline (A.R.S. 32-1263)', zh: '牙醫委員會懲處（A.R.S. 32-1263）' },
      url: 'https://www.azleg.gov/ars/32/01263.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Parts of Medicare, including Medicare Advantage', zh: 'Medicare 各部分（含 Medicare Advantage）' },
      url: 'https://www.ssa.gov/medicare/plan/medicare-parts',
      source: 'Social Security Administration',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not medical advice. Our directory lists Chinese-speaking doctors, dentists, and clinics across metro Phoenix. Confirm languages, insurance, and appointment availability directly with each office.',
      zh: '本文為一般資訊，不構成醫療建議。本站名錄列有大鳳凰城說中文的醫師、牙醫與診所，請直接向各診所確認服務語言、保險與預約情況。',
    },
    categorySlugs: ['medical'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
