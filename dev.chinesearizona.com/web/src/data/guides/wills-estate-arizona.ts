import type { Guide } from '@/lib/types';

// Facts checked against the linked Arizona Revised Statutes on azleg.gov on
// 2026-11-27.
export const willsEstateArizonaGuide: Guide = {
  slug: 'wills-estate-planning-arizona-families',
  section: 'safety',
  title: {
    en: 'Wills, Powers of Attorney, and Estate Basics in Arizona for Immigrant Families',
    zh: '亞利桑那移民家庭的遺囑、授權書與遺產規劃入門',
  },
  excerpt: {
    en: 'How Arizona community property works, who inherits if there is no will, what makes a will and a power of attorney valid, how beneficiary deeds pass a home, and when a small estate can skip probate.',
    zh: '亞利桑那夫妻共同財產怎麼運作、沒有遺囑時誰繼承、遺囑與授權書怎樣才有效、受益人契據怎麼把房子傳下去，以及小額遺產何時可以不走遺產認證程序。',
  },
  heroImage:
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80',
  readTime: '8 min',
  publishedAt: '2026-11-27T19:10:00.000Z',
  updatedAt: '2026-11-27T19:10:00.000Z',
  body: [
    {
      en: 'Families who move to Arizona may have assets in two or three places: a home and bank accounts here, retirement savings through a US employer, and property or accounts in Taiwan, China, or Hong Kong. Relatives who could step in may live overseas. If something happened to you, Arizona law, not your wishes, would decide who raises your children and who inherits what you own here, unless you put your wishes in writing.',
      zh: '搬到亞利桑那的家庭，資產可能分散在兩三個地方：這裡的房子與銀行帳戶、美國僱主的退休帳戶，以及在台灣、中國或香港的房產或帳戶。能出面幫忙的親人也可能住在海外。萬一你發生意外，除非事先寫下你的意願，否則誰來照顧孩子、你在這裡的財產由誰繼承，都會交給亞利桑那州法決定。',
    },
    {
      en: 'Arizona is a community property state. Under state law, property either spouse acquires during the marriage is community property, except property acquired by gift or inheritance and certain property acquired after a divorce or separation petition is served. That rule shapes what each spouse can leave to others.',
      zh: '亞利桑那是夫妻共同財產州。依州法，婚姻期間任一方取得的財產都屬於夫妻共同財產，但受贈或繼承取得的財產，以及送達離婚或分居訴狀後取得的特定財產除外。這項規定會影響每位配偶能把哪些財產留給別人。',
    },
    {
      en: 'This guide summarizes Arizona statutes read on the Arizona Legislature website on November 27, 2026. It is general information, not legal or tax advice, and it does not cover the law of other countries where you may own property.',
      zh: '本文整理 2026 年 11 月 27 日在亞利桑那州議會網站查閱的州法條文，屬一般資訊，不構成法律或稅務建議，也不涵蓋你可能擁有財產的其他國家的法律。',
    },
  ],
  quickChecklist: [
    {
      en: 'List what you own and how each item is titled: the home, bank and brokerage accounts, retirement accounts, life insurance, vehicles, and anything overseas.',
      zh: '列出你擁有的財產與每項的登記方式：房子、銀行與證券帳戶、退休帳戶、壽險、車輛，以及所有海外資產。',
    },
    {
      en: 'If you have minor children, decide who you want as their guardian. Arizona law lets a parent name a guardian in a will.',
      zh: '有未成年子女的話，先決定希望由誰擔任監護人。亞利桑那州法允許父母在遺囑中指定監護人。',
    },
    {
      en: 'Sign your will the Arizona way: in writing, signed by you, and signed by at least two witnesses.',
      zh: '依亞利桑那規定簽署遺囑：書面、本人簽名，並由至少兩位見證人簽名。',
    },
    {
      en: 'Add a durable financial power of attorney and a health care power of attorney so someone can act for you if you cannot.',
      zh: '另外準備持久財務授權書與醫療授權書，萬一你無法自己處理事務，有人可以代你行事。',
    },
    {
      en: 'Ask whether a beneficiary deed makes sense for your home. It must be recorded with the county recorder before death to work.',
      zh: '問問看你的房子適不適合用受益人契據（beneficiary deed）。這份契據必須在生前向郡登記處登記才有效。',
    },
    {
      en: 'Tell the person you name where the originals are kept.',
      zh: '告訴你指定的人，原始文件放在哪裡。',
    },
  ],
  detailSections: [
    {
      title: { en: 'If there is no will', zh: '沒有遺囑會怎樣' },
      bullets: [
        {
          en: 'If all of your children are also your surviving spouse\'s children, or you have no children, your spouse receives your entire intestate estate, both your separate property and your half of the community property.',
          zh: '如果你所有的子女也都是在世配偶的子女，或你沒有子女，配偶會繼承你全部的無遺囑遺產，包括你的個人財產與你那一半的夫妻共同財產。',
        },
        {
          en: 'If you have a child who is not your spouse\'s child, your spouse receives half of your separate property and none of your half of the community property; the rest passes to your descendants. Blended families should plan with this in mind.',
          zh: '如果你有不是配偶所生的子女，配偶只繼承你一半的個人財產，你那一半的夫妻共同財產則完全不歸配偶，其餘由你的直系卑親屬繼承。再婚或重組家庭特別需要事先規劃。',
        },
        {
          en: 'Without a spouse, the estate passes first to your descendants, then to your parents, then to your parents\' descendants, and then further out to grandparents and their descendants.',
          zh: '沒有配偶時，遺產依序由直系卑親屬繼承，其次是父母，再來是父母的直系卑親屬（兄弟姊妹及其子女），再往外才是祖父母與其後代。',
        },
      ],
    },
    {
      title: { en: 'Making a valid will', zh: '怎樣的遺囑才有效' },
      bullets: [
        {
          en: 'A standard Arizona paper will must be in writing, signed by you (or by someone else in your presence and at your direction), and signed by at least two people who witnessed your signature or your acknowledgment of it.',
          zh: '一般的亞利桑那紙本遺囑必須是書面、由你本人簽名（或由他人在你面前依你指示代簽），並由至少兩位見證你簽名或你確認簽名的人簽名。',
        },
        {
          en: 'Arizona also accepts a handwritten (holographic) will, witnessed or not, if the signature and the material provisions are in your own handwriting.',
          zh: '亞利桑那也承認自書遺囑：只要簽名與主要內容都是你親筆寫的，有沒有見證人都有效。',
        },
        {
          en: 'A will can be made "self-proved" when you and your witnesses sign sworn statements before a notary at the same time you sign it. Arizona law includes a sample form for this.',
          zh: '遺囑可以做成「自證遺囑」：簽遺囑時，你和見證人同時在公證人面前簽署宣誓聲明。亞利桑那州法附有這份聲明的範本格式。',
        },
        {
          en: 'If you prefer to write in Chinese, ask a lawyer how to handle translation so the court and your family read the same thing.',
          zh: '如果你想用中文書寫，請律師說明翻譯該怎麼處理，讓法院與家人看到的內容一致。',
        },
      ],
    },
    {
      title: { en: 'Powers of attorney', zh: '授權書' },
      bullets: [
        {
          en: 'A durable financial power of attorney must contain words showing it continues if you become disabled or incapacitated. It must be signed by you, witnessed by someone other than your agent, the agent\'s spouse or children, or the notary, and acknowledged before a notary.',
          zh: '持久財務授權書必須寫明你失能或無行為能力時仍然有效。它必須由你簽名，由代理人、代理人的配偶或子女，以及公證人以外的人見證，並在公證人面前確認。',
        },
        {
          en: 'A health care power of attorney lets an adult choose who makes health care decisions, and funeral arrangements, for them. It must clearly state that intent, be dated and signed, and be notarized or witnessed by at least one adult.',
          zh: '醫療授權書讓成年人指定由誰替自己做醫療決定與安排後事。文件必須清楚表達這項意思、註明日期並簽名，並經公證或至少一位成年人見證。',
        },
        {
          en: 'If your parents live with you or visit for long stays, they may want their own Arizona documents too.',
          zh: '如果父母與你同住或長期來訪，他們可能也需要準備自己的亞利桑那文件。',
        },
      ],
    },
    {
      title: { en: 'Passing on a home and settling small estates', zh: '房屋傳承與小額遺產' },
      bullets: [
        {
          en: 'A beneficiary deed transfers your interest in real property to the person you name when you die. It is valid only if signed and recorded with the county recorder before death, it can name a trust (even a revocable one), and you can revoke it by recording a revocation before death.',
          zh: '受益人契據會在你過世時，把不動產權益移轉給你指定的人。契據必須在生前簽署並向郡登記處登記才有效，可以指定信託（包括可撤銷信託）為受益人，你也可以在生前登記撤銷。',
        },
        {
          en: 'For small estates, a successor can collect personal property by affidavit 30 days after death if no personal representative has been appointed and the personal property, less liens, is worth no more than $200,000.',
          zh: '小額遺產方面，如果沒有指定遺產管理人，且扣除負擔後的動產價值不超過 200,000 美元，繼承人可以在死亡 30 天後以宣誓書領取動產。',
        },
        {
          en: 'An employer owing wages to someone who died must pay the surviving spouse up to $5,000 on receiving the spouse\'s affidavit.',
          zh: '死者的僱主如有積欠工資，收到在世配偶的宣誓書後，必須支付最多 5,000 美元給配偶。',
        },
        {
          en: 'Property in Taiwan, China, Hong Kong, or elsewhere follows local law. Ask a lawyer whether you need documents in that country too.',
          zh: '在台灣、中國、香港或其他地方的財產適用當地法律，請律師評估是否也需要在當地準備文件。',
        },
      ],
    },
  ],
  practicalNotes: [
    {
      en: 'Review beneficiary designations on retirement accounts and life insurance whenever you marry, divorce, or have a child.',
      zh: '結婚、離婚或生小孩時，記得檢查退休帳戶與壽險的受益人設定。',
    },
    {
      en: 'Online will templates still need proper signing. A will without the required signatures may not work the way you expect.',
      zh: '網路上的遺囑範本一樣要依規定簽署；缺少必要簽名的遺囑，可能無法照你預期的方式發揮作用。',
    },
    {
      en: 'Keep originals somewhere safe that your family can actually reach, and keep a list of overseas accounts with contact details for each institution.',
      zh: '原始文件要放在家人真的拿得到的安全地方，並保留一份海外帳戶清單與各機構的聯絡方式。',
    },
  ],
  officialResources: [
    {
      label: { en: 'Community property (A.R.S. 25-211)', zh: '夫妻共同財產（A.R.S. 25-211）' },
      url: 'https://www.azleg.gov/ars/25/00211.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Surviving spouse\'s share without a will (A.R.S. 14-2102)', zh: '無遺囑時配偶的繼承份額（A.R.S. 14-2102）' },
      url: 'https://www.azleg.gov/ars/14/02102.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Other heirs (A.R.S. 14-2103)', zh: '其他繼承人（A.R.S. 14-2103）' },
      url: 'https://www.azleg.gov/ars/14/02103.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Signing a will (A.R.S. 14-2502)', zh: '遺囑簽署（A.R.S. 14-2502）' },
      url: 'https://www.azleg.gov/ars/14/02502.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Handwritten wills (A.R.S. 14-2503)', zh: '自書遺囑（A.R.S. 14-2503）' },
      url: 'https://www.azleg.gov/ars/14/02503.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Self-proved wills (A.R.S. 14-2504)', zh: '自證遺囑（A.R.S. 14-2504）' },
      url: 'https://www.azleg.gov/ars/14/02504.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Guardian named in a will (A.R.S. 14-5202)', zh: '遺囑指定監護人（A.R.S. 14-5202）' },
      url: 'https://www.azleg.gov/ars/14/05202.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Durable power of attorney (A.R.S. 14-5501)', zh: '持久授權書（A.R.S. 14-5501）' },
      url: 'https://www.azleg.gov/ars/14/05501.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Health care power of attorney (A.R.S. 36-3221)', zh: '醫療授權書（A.R.S. 36-3221）' },
      url: 'https://www.azleg.gov/ars/36/03221.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Beneficiary deeds (A.R.S. 33-405)', zh: '受益人契據（A.R.S. 33-405）' },
      url: 'https://www.azleg.gov/ars/33/00405.htm',
      source: 'Arizona State Legislature',
    },
    {
      label: { en: 'Small estate affidavits (A.R.S. 14-3971)', zh: '小額遺產宣誓書（A.R.S. 14-3971）' },
      url: 'https://www.azleg.gov/ars/14/03971.htm',
      source: 'Arizona State Legislature',
    },
  ],
  directoryPrompt: {
    note: {
      en: 'This guide is general information, not legal or tax advice. An estate planning attorney can draft documents that fit your family and assets, and a CPA can help with tax questions, especially when property is in more than one country. Our directory lists Chinese-speaking legal and finance professionals across metro Phoenix.',
      zh: '本文為一般資訊，不構成法律或稅務建議。遺產規劃律師可以依你的家庭與資產擬定文件，會計師可以協助稅務問題，特別是財產分散在不同國家時。本站名錄列有大鳳凰城說中文的法律與財務專業人士。',
    },
    categorySlugs: ['legal-finance'],
  },
  relatedBusinessSlugs: [],
  relatedEventSlugs: [],
};
