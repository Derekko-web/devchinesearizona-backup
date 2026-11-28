-- Rollback for the November 2026 corrections: writes back the production values captured on 2026-11-27.

begin;

-- Eastern Art Academy: restore production values from 2026-11-27.
update public.businesses set
  city = $cx$Phoenix$cx$,
  address = null,
  service_area_text = $cx$Phoenix, Arizona$cx$,
  short_description_en = $cx$新东方中文艺术学院是亚利桑那州最大的私立中文学校，建校时间最长的中国舞蹈学校。主要教授中文简体汉字、中国舞蹈、音乐、乐器、美术，及各类中国传统艺术课程。承办凤凰之春华人春晚，美中艺术教育交流。$cx$,
  description_en = $cx$新东方中文艺术学院是亚利桑那州最大的私立中文学校，建校时间最长的中国舞蹈学校。主要教授中文简体汉字、中国舞蹈、音乐、乐器、美术，及各类中国传统艺术课程。承办凤凰之春华人春晚，美中艺术教育交流。$cx$,
  short_description_zh_tw = null,
  description_zh_tw = null,
  search_aliases = array[$cx$Eastern Art Academy$cx$, $cx$​新東方中文藝術學院 -- Eastern Art Academy$cx$, $cx$Phoenix$cx$, $cx$education$cx$, $cx$easternartacademy.com$cx$, $cx$English$cx$, $cx$Mandarin$cx$, $cx$凤凰之春$cx$, $cx$华人春晚$cx$, $cx$艺术教育$cx$, $cx$新东方中文艺术学院$cx$, $cx$美中艺术教育交流$cx$, $cx$Chinese$cx$, $cx$Chinese characters$cx$]::text[],
  last_updated = now()
where slug = 'eastern-art-academy-phoenix';

-- Axia Senior Insurance Advisors: restore production values from 2026-11-27.
update public.businesses set
  city = $cx$Chandler$cx$,
  address = $cx$333, North Dobson Road, Chandler, AZ, 85224$cx$,
  phone = $cx$+1-602-576-1838$cx$,
  email = null,
  short_description_en = $cx$Finance and practical listing near Chandler Ranch in Chandler.$cx$,
  description_en = $cx$Axia Senior Insurance Advisors is listed near Chandler Ranch in Chandler. This profile was generated from plaza directory sources and map-based verification, so direct business contact details may still be incomplete.$cx$,
  short_description_zh_tw = null,
  description_zh_tw = null,
  search_aliases = array[$cx$Axia Senior Insurance Advisors$cx$, $cx$Chandler Ranch$cx$, $cx$Chandler$cx$, $cx$legal-finance$cx$, $cx$insurance$cx$, $cx$NEC of W Chandler Blvd & N Dobson Rd, Chandler, AZ 85224$cx$, $cx$nearby$cx$, $cx$www.axiasiadvisors.com$cx$]::text[],
  last_updated = now()
where slug = 'axia-senior-insurance-advisors-chandler';

-- az-hope-chinese-school-chandler: restore the original alias.
update public.businesses set search_aliases = array_replace(search_aliases, $cx$記建校三十周年義工聚會$cx$, $cx$记建校三十周年义工聚会$cx$), last_updated = now()
where slug = 'az-hope-chinese-school-chandler';

-- contemporary-chinese-school-of-arizona-tempe: restore the original alias.
update public.businesses set search_aliases = array_replace(search_aliases, $cx$亞省現代中文學校24-25新學年開啟$cx$, $cx$亚省现代中文学校24-25新学年开启$cx$), last_updated = now()
where slug = 'contemporary-chinese-school-of-arizona-tempe';

-- gilbert-chinese-church-gilbert: restore the original alias.
update public.businesses set search_aliases = array_replace(search_aliases, $cx$邀請你與我們一起：真誠敬拜、研習聖經、彼此服事、傳揚福音。$cx$, $cx$邀请你与我们一起：真诚敬拜、研习圣经、彼此服事、传扬福音。$cx$), last_updated = now()
where slug = 'gilbert-chinese-church-gilbert';

-- tucson-christian-mandarin-church-tucson: restore the original alias.
update public.businesses set search_aliases = array_replace(search_aliases, $cx$原創詩歌 這一刻我跟從了耶穌基督 我是喜樂的基督徒 約伯記的啟示 神的國度$cx$, $cx$原創詩歌 这一刻我跟从了耶稣基督 我是喜樂的基督徒 約伯記的啟示 神的國度$cx$), last_updated = now()
where slug = 'tucson-christian-mandarin-church-tucson';

commit;
