import Link from 'next/link';
import { Search, MapPin, Home, HeartPulse, Scale, Utensils, Wrench, Truck, GraduationCap, ArrowRight, BadgeCheck, Star, BookOpen, Calendar, Store } from 'lucide-react';
import Image from 'next/image';

export default function HomePage() {
  return (
    <>
      {/* Hero Search Section */}
      <div className="bg-[linear-gradient(to_bottom,rgba(30,58,138,0.9),rgba(30,58,138,0.8)),url('https://images.unsplash.com/photo-1549463935-7cff9d9f1f1d?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-50/20 text-brand-50 mb-6 backdrop-blur-sm border border-brand-100/20 shadow-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Welcome to the new standard for Arizona's Chinese community.
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Discover Arizona.<br className="hidden sm:block" /> Find Who You Trust.
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto font-light">
            The modern, bilingual directory and newcomer guide for relocating families, professionals, and locals. (亞利桑那州最值得信賴的華人生活互助平台)
          </p>

          {/* Search Bar */}
          <div className="bg-white p-2 rounded-xl shadow-xl flex flex-col sm:flex-row max-w-3xl mx-auto gap-2">
            <div className="flex-1 flex items-center px-4 bg-slate-50 rounded-lg border border-transparent focus-within:bg-white focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
              <Search className="w-5 h-5 text-slate-400" />
              <input type="text" placeholder="Search for realtors, doctors, restaurants..." className="w-full bg-transparent border-none py-3 px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0" />
            </div>
            <div className="flex-1 flex items-center px-4 bg-slate-50 rounded-lg border border-transparent focus-within:bg-white focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100 hidden sm:flex sm:border-slate-200">
              <MapPin className="w-5 h-5 text-slate-400" />
              <input type="text" placeholder="City or Zip (e.g. Chandler)" className="w-full bg-transparent border-none py-3 px-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0" />
            </div>
            <button className="bg-accent-500 hover:bg-accent-600 text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-sm flex-shrink-0 flex items-center justify-center">
              Search
            </button>
          </div>
          
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-blue-100">
            <span className="opacity-70">Popular:</span>
            <Link href="/directory" className="hover:text-white hover:underline underline-offset-4 decoration-accent-500 transition-all">Real Estate</Link>
            <Link href="/directory" className="hover:text-white hover:underline underline-offset-4 decoration-accent-500 transition-all">Immigration Lawyers</Link>
            <Link href="/relocation-guide" className="hover:text-white hover:underline underline-offset-4 decoration-accent-500 transition-all">TSMC Relocation Info</Link>
            <Link href="/directory" className="hover:text-white hover:underline underline-offset-4 decoration-accent-500 transition-all">Dim Sum</Link>
          </div>
        </div>
      </div>

      {/* Quick Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-20 hidden sm:block">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-start gap-4 md:gap-8 lg:gap-12 flex-wrap md:flex-nowrap">
          <Link href="/directory" className="group flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 group-hover:text-brand-900 transition-colors">
              <Home className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Housing<br /><span className="text-xs text-slate-400 font-normal">房地產買賣</span></span>
          </Link>
          <Link href="/directory" className="group flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 group-hover:text-brand-900 transition-colors">
              <HeartPulse className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Medical<br /><span className="text-xs text-slate-400 font-normal">醫療保健</span></span>
          </Link>
          <Link href="/directory" className="group flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 group-hover:text-brand-900 transition-colors">
              <Scale className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Legal<br /><span className="text-xs text-slate-400 font-normal">法律移民</span></span>
          </Link>
          <Link href="/directory" className="group flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 group-hover:text-brand-900 transition-colors">
              <Utensils className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Dining<br /><span className="text-xs text-slate-400 font-normal">餐廳美食</span></span>
          </Link>
          <Link href="/directory" className="group flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 group-hover:text-brand-900 transition-colors">
              <Wrench className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Services<br /><span className="text-xs text-slate-400 font-normal">居家維修</span></span>
          </Link>
          <Link href="/directory" className="group flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 group-hover:text-brand-900 transition-colors">
              <Truck className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Moving<br /><span className="text-xs text-slate-400 font-normal">搬家物流</span></span>
          </Link>
          <Link href="/directory" className="group flex flex-col items-center flex-1 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-100 group-hover:text-brand-900 transition-colors">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Education<br /><span className="text-xs text-slate-400 font-normal">教育培訓</span></span>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Column: Directory Listings */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  Featured Local Businesses 
                  <span className="ml-2 text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-md">推薦商家</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">Verified community favorites across Arizona.</p>
              </div>
              <Link href="/directory" className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            <div className="space-y-4">
              {/* Business Card 1 (Premium) */}
              <div className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col sm:flex-row gap-4">
                <div className="absolute top-0 right-0 bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-1 uppercase rounded-bl-lg z-10 w-auto h-auto">Sponsored</div>
                <div className="w-full sm:w-40 h-32 sm:h-auto bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80" alt="Real Estate" fill sizes="(max-width: 640px) 100vw, 160px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Real Estate</span>
                      <BadgeCheck className="w-4 h-4 text-brand-500" title="Verified" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Elite AZ Realty Team <span className="text-base font-normal text-slate-600 ml-1">精英房產團隊</span></h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">Specializing in relocation for TSMC employees and California transplants. Fluent in Mandarin, Taiwanese, and English.</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-y-2 justify-between items-center text-sm border-t border-slate-100 pt-3">
                    <div className="flex items-center text-slate-600">
                      <Star className="w-4 h-4 text-amber-400 fill-current mr-1" />
                      <span className="font-bold text-slate-700">4.9</span> <span className="text-slate-400 ml-1">(120 reviews)</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <MapPin className="w-4 h-4 mr-1 text-slate-400" /> Chandler, AZ
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Card 2 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-40 h-32 sm:h-auto bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80" alt="Restaurant" fill sizes="(max-width: 640px) 100vw, 160px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">Dining</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Taste of Taiwan <span className="text-base font-normal text-slate-600 ml-1">台灣古早味</span></h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">Authentic beef noodle soup, boba tea, and street food. Just like the night markets in Taipei.</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-y-2 justify-between items-center text-sm border-t border-slate-100 pt-3">
                    <div className="flex items-center text-slate-600">
                      <Star className="w-4 h-4 text-amber-400 fill-current mr-1" />
                      <span className="font-bold text-slate-700">4.7</span> <span className="text-slate-400 ml-1">(84 reviews)</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <MapPin className="w-4 h-4 mr-1 text-slate-400" /> Tempe, AZ
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Card 3 */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-40 h-32 sm:h-auto bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <Image src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80" alt="CPA" fill sizes="(max-width: 640px) 100vw, 160px" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Financial</span>
                      <BadgeCheck className="w-4 h-4 text-brand-500" title="Verified" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Chen CPA & Associates <span className="text-base font-normal text-slate-600 ml-1">陳氏會計師事務所</span></h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">Business tax planning, cross-border tax issues between US and Taiwan, and individual tax prep.</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-y-2 justify-between items-center text-sm border-t border-slate-100 pt-3">
                    <div className="flex items-center text-slate-600">
                      <Star className="w-4 h-4 text-amber-400 fill-current mr-1" />
                      <span className="font-bold text-slate-700">5.0</span> <span className="text-slate-400 ml-1">(31 reviews)</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <MapPin className="w-4 h-4 mr-1 text-slate-400" /> Phoenix, AZ
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Newcomer Guides & Community */}
          <div className="space-y-8">
            {/* Relocation Guides */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 text-brand-600 mr-2" />
                New to Arizona?
                <span className="ml-2 text-xs font-normal text-slate-500 bg-white px-2 py-1 border border-slate-200 rounded-md">新手必看</span>
              </h2>
              
              <ul className="space-y-4">
                <li>
                  <Link href="/relocation-guide" className="group block border-l-2 border-transparent hover:border-brand-500 pl-3 transition-all space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 tracking-tight">How to Convert a CA/TW Driver's License in AZ</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">Step-by-step guide to MVD, paperwork, and timelines.</p>
                  </Link>
                </li>
                <li>
                  <Link href="/relocation-guide" className="group block border-l-2 border-transparent hover:border-brand-500 pl-3 transition-all space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 tracking-tight">Top School Districts in Chandler & Gilbert</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">Ratings, bilingual programs, and housing boundaries.</p>
                  </Link>
                </li>
                <li>
                  <Link href="/relocation-guide" className="group block border-l-2 border-transparent hover:border-brand-500 pl-3 transition-all space-y-1">
                    <h4 className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 tracking-tight">Setting up Power & Water (SRP vs APS)</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">Understanding Arizona utility providers.</p>
                  </Link>
                </li>
              </ul>
              
              <Link href="/relocation-guide" className="block w-full text-center mt-5 py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                View All Relocation Guides
              </Link>
            </div>

            {/* Upcoming Events Widget */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <Calendar className="w-5 h-5 text-accent-500 mr-2" />
                  Upcoming Events
                </h2>
                <Link href="/community" className="text-sm text-slate-500 hover:text-brand-500">More</Link>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-lg min-w-[3rem] py-1 px-2 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-accent-600 uppercase tracking-widest leading-none">Oct</span>
                    <span className="text-lg font-bold text-slate-800 leading-tight mt-0.5">14</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 leading-tight"><Link href="/community" className="hover:text-brand-600">Taiwanese Double Ten Day Picnic</Link></h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center"><MapPin className="w-3 h-3 mr-1" /> Freestone Park, Gilbert</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-lg min-w-[3rem] py-1 px-2 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-accent-600 uppercase tracking-widest leading-none">Oct</span>
                    <span className="text-lg font-bold text-slate-800 leading-tight mt-0.5">28</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 leading-tight"><Link href="/community" className="hover:text-brand-600">AZ Asian Night Market</Link></h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center"><MapPin className="w-3 h-3 mr-1" /> Mesa Grand</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action Banner */}
            <div className="bg-gradient-to-r from-brand-900 to-brand-800 rounded-2xl p-6 text-white text-center shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Store className="w-24 h-24" />
              </div>
              <h3 className="font-bold text-lg relative z-10">Own a Local Business?</h3>
              <p className="text-brand-100 text-sm mt-2 mb-4 relative z-10">Reach thousands of newcomers and established families in the Arizona Chinese community.</p>
              <Link href="/add-business" className="inline-block bg-white text-brand-900 font-medium text-sm px-6 py-2 rounded-md shadow-sm hover:bg-slate-50 transition-colors relative z-10">
                Claim Your Profile
              </Link>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
