-- Discover Arizona: replace Simplified Chinese with Traditional Chinese (Taiwan usage).
--
-- All five rows in public.discover_articles had title_zh, excerpt_zh and body_zh
-- in Simplified Chinese (checked read-only on 2026-11-27), which breaks the site
-- rule that Chinese copy is Traditional Chinese as used in Taiwan.
--
-- Each text was rewritten by hand, not only run through a converter:
--   * Taiwan wording, for example 飯店 for "hotel" (the mainland word can mean a
--     hostess bar in Taiwan), 網路, 自駕, 週末, 分店, 對寵物友善.
--   * Leftover drafting notes removed: a "Chinese text was rewritten from official
--     pages" line and a duplicated paragraph (sky-rock-sedona), a "the last sentence
--     is a summary" line (the-phoenician), and editor phrasing about "putting this in
--     the local directory" (rayoog-cafe, bearizona-wildlife-park-williams).
--   * No facts were added or changed. English fields are untouched.
--
-- Rows are matched on both id and slug, so this is a no-op on databases that do
-- not have these rows (for example the dev project).

begin;

update public.discover_articles
set
  title_zh = $zh$入住哈瓦蘇湖 The Heat Hotel，享受水岸位置與倫敦橋周邊的步行便利$zh$,
  excerpt_zh = $zh$The Heat Hotel 位於 Bridgewater Channel 旁、鄰近 London Bridge，客房臨水並附私人陽台，很適合當作遊玩哈瓦蘇湖時的住宿據點。$zh$,
  body_zh = $zh$The Heat Hotel 是 Lake Havasu City 的一家水岸精品飯店，地址為 1420 McCulloch Blvd. N。飯店緊鄰 Bridgewater Channel，也能看到 London Bridge 一帶。客房與套房配有私人陽台、現代風格家具與房內網路，很適合想住在水邊、又想靠近大橋周邊熱鬧區域的旅客。

這家飯店最吸引人的就是位置。住客可以直接住在 channel 旁邊，步行到 London Bridge 一帶，也可以把這裡當作划船、立式划槳、附近沙灘、高爾夫與其他哈瓦蘇湖活動的落腳處。飯店本身也有 patio bar and lounge、住客船位租用，以及現場 EV charging。

如果想找一家離熱鬧區域近、又有臨水氛圍的飯店，The Heat Hotel 值得列入考慮。它適合週末湖畔旅行、情侶出遊，也適合想住得更有度假感、而不是一般路邊旅館的旅客。近期住客評價也提到房間整潔、櫃台親切，而且某些時段比預期安靜。$zh$,
  updated_at = now()
where id = '597c9a2f-a145-469e-9026-fd1d38710a5c' and slug = 'heat-hotel-lake-havasu';

update public.discover_articles
set
  title_zh = $zh$Sky Rock Sedona：西賽多納可欣賞紅岩景觀的精品飯店$zh$,
  excerpt_zh = $zh$Sky Rock Sedona 位於西賽多納，住客可以欣賞紅岩景觀。飯店有翻新的客房、露台空間，以及適合週末度假的館內體驗。$zh$,
  body_zh = $zh$Sky Rock Sedona 很適合想住在賽多納、又想把風景和住宿體驗結合在一起的旅客。飯店位於西賽多納的 West Highway 89A，部分客房與露台可以直接看到紅岩景觀。飯店有翻新的客房，部分房型可直通主露台，部分房間還有壁爐，整體比一般公路旁的旅館更有度假感。

這家飯店的另一個吸引力，是入住後就有很多事可做。館內有室外泳池、熱水池、Bar WooWoo，還會舉辦每日的 moonrise ceremony。官方網頁也列出冥想、瑜伽、sound bath、現場音樂與觀星等活動。飯店對寵物友善，也提供電動車充電，對開車來賽多納的旅客更方便。

如果打算在賽多納待上幾天，Sky Rock Sedona 也很適合當作出發點，前往 Cathedral Rock、Chapel of the Holy Cross、Tlaquepaque Arts & Shopping Village、Bell Rock、Oak Creek Canyon 和 Red Rock State Park 都很方便。想找一家有景觀、有氛圍、又方便前往周邊景點的飯店，這裡值得列入考慮。$zh$,
  updated_at = now()
where id = '63af4c68-3c11-4a11-be3d-41f4ed94feda' and slug = 'sky-rock-sedona';

update public.discover_articles
set
  title_zh = $zh$Scottsdale 的 The Phoenician：泳池、高爾夫、水療一應俱全，鄰近駝峰山的度假飯店$zh$,
  excerpt_zh = $zh$The Phoenician 位於 Scottsdale 的駝峰山（Camelback Mountain）山腳下，館內有三層泳池區、18 洞高爾夫球場、水療中心和多家餐廳，也鄰近 Old Town Scottsdale 與 Scottsdale Fashion Square。$zh$,
  body_zh = $zh$The Phoenician 位於 Scottsdale 的 6000 East Camelback Road，就在 Camelback Mountain 山腳下，也鄰近 Old Town Scottsdale。這個位置很適合想把度假飯店的悠閒和城市活動安排在同一趟行程的人。

這家飯店本身就足以安排一整天。館內有三層泳池區、水療中心、18 洞高爾夫球場、運動俱樂部和八家餐飲場所。住客可以到 J&G Steakhouse 或 Mowry & Cotton 享用正餐，也可以在 The Phoenician Tavern 輕鬆用餐，或到 Thirsty Camel 喝一杯。

如果想順便逛逛 Scottsdale 周邊，這家飯店也很方便。飯店官方體驗頁面提到的附近去處包括 Camelback Mountain、Old Town Scottsdale、Scottsdale Arts District、Scottsdale Fashion Square 和 Phoenix Zoo。對想住得舒適、又想把用餐、放鬆和出遊安排在一起的人來說，這家飯店很值得列入考慮。$zh$,
  updated_at = now()
where id = 'be304f1b-8810-408e-a5aa-7093de21ee36' and slug = 'the-phoenician';

update public.discover_articles
set
  title_zh = $zh$Gilbert 的 Rayoog Cafe：吃 shakshuka、土耳其咖啡和阿拉伯早餐拼盤的早午餐店$zh$,
  excerpt_zh = $zh$Rayoog Cafe 位於 Gilbert 的 North Cooper Road，主打地中海與阿拉伯風味早餐。這裡吃得到 shakshuka、hummus、falafel、kibbe、現烤麵包和土耳其咖啡，和一般的早午餐店不太一樣。$zh$,
  body_zh = $zh$Rayoog Cafe 是那種會讓人專程開車到 strip mall 吃早餐的店。它位於 Gilbert 的 78 North Cooper Road，每天早上 8 點營業到下午 3 點，很適合安排在 East Valley 一帶吃早餐或早午餐。

這家店真正吸引人的是菜單。這裡有 shakshuka eggs、Kahi & Kemer、烤製的 cheese boat 和 zaatar boat、kibbe、阿拉伯早餐拼盤、hummus、falafel、阿拉伯茶和土耳其咖啡。餐廳官網也寫明主打 authentic Mediterranean breakfast，並提到品牌在 Jordan 和 Iraq 也有分店。

簡單來說，這是一家適合想吃得更有風味、選擇更多，也想換換一般 brunch 口味的人的 Gilbert 早餐店。適合週末慢慢吃一頓，也適合平日來喝杯咖啡，或和朋友點幾樣一起分著吃。$zh$,
  updated_at = now()
where id = 'bd306610-1dee-4561-a885-22354b452f6e' and slug = 'rayoog-cafe';

update public.discover_articles
set
  title_zh = $zh$Williams 的 Bearizona Wildlife Park：適合全家出遊的自駕野生動物園與步行園區$zh$,
  excerpt_zh = $zh$Bearizona Wildlife Park 讓全家人可以先坐在自己車上觀賞北美動物，再步行參觀 Fort Bearizona。門票包含自駕園區、步行園區、季節性 barnyard 和園內表演。$zh$,
  body_zh = $zh$Bearizona Wildlife Park 位於 Williams 的 Route 66 上，距離 Flagstaff 約 25 英里，距離大峽谷南緣約 58 英里。園區每天早上 9 點開放，下午 4 點停止車輛入園，下午 5 點 30 分閉園。對在亞利桑那北部自駕旅行的家庭來說，這樣的時間安排很方便，很容易排進當天行程。

這裡最吸引人的地方是流程簡單。遊客可以開車穿過超過 3 英里的 ponderosa pine forest，坐在自己車上看黑熊、狼、野牛、鹿、叉角羚、山羊和馴鹿。之後還可以進入 Fort Bearizona 步行區，繼續看 jaguar、grizzly bear、otter、porcupine 等動物，園內也有定時互動活動和解說牌。

簡單來說，這是亞利桑那北部相對輕鬆的親子行程之一。前半段坐在車上就能看動物，帶孩子時比較好掌握節奏；後半段停好車還能繼續慢慢逛。園區內也有餐飲，包括 Canyonlands Restaurant 和 Fort Bearizona 一帶的簡餐，所以一家人不必急著離開找東西吃。

Bearizona 也適合和 Williams 的其他行程排在一起。Williams 官方遊客資訊把 Bearizona 和 Grand Canyon Railway 都列為主要景點，市區還有 Historic Route 66 的商店和老公路氛圍，很適合排成半天到一天的行程。$zh$,
  updated_at = now()
where id = '63569731-f598-4e9f-82a7-1d5e3265e786' and slug = 'bearizona-wildlife-park-williams';

commit;
