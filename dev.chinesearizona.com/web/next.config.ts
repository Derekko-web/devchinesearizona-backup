import type { NextConfig } from "next";

const articleImageHosts = [
  'atlasobscura.com',
  'cdnwww.sinovision.net',
  'cht.sunbirdarizona.com',
  'farm3.static.flickr.com',
  'farm6.static.flickr.com',
  'farm7.static.flickr.com',
  'farm8.staticflickr.com',
  'g1.cn.nytimes.com',
  'gdb.voanews.eu',
  'images.unsplash.com',
  'img.univs.cn',
  'img4.cache.netease.com',
  'img5.cache.netease.com',
  'jxo.idq.mybluehost.me',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'mail.google.com',
  'mmbiz.qlogo.cn',
  'mmbiz.qpic.cn',
  'news.xinhuanet.com',
  'owmaic.uu-88.com',
  'p2.ifengimg.com',
  'paaca.us',
  'photocdn.sohu.com',
  'pic.anhuinews.com',
  'pnewsapp.tc.qq.com',
  'res.wx.qq.com',
  'space.wenxuecity.com',
  'sphotos-a.xx.fbcdn.net',
  'sunbirdarizona.com',
  'tucsonchineseconnections.com',
  'wscdn.bbc.co.uk',
  'www.arizonatour.net',
  'www.atlasobscura.com',
  'www.azhopechineseschool.org',
  'www.craa.us',
  'www.dw.de',
  'www.paaca.us',
  'www.shufa.com',
  'www.sunbirdarizona.com',
  'www.uscis.gov',
  'www.wenxuecity.com',
  'images.atlasobscura.com',
  'img.atlasobscura.com',
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: articleImageHosts.map((hostname) => ({
      hostname,
    })),
  },
  async redirects() {
    return [
      {
        source: '/zh-TW',
        destination: '/zh',
        permanent: true,
      },
      {
        source: '/zh-TW/:path*',
        destination: '/zh/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
