import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 py-12 border-t border-slate-800 text-slate-400 mt-12 w-full mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-brand-500 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white block">ChineseArizona</span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm">The most trusted, modern bilingual platform connecting the Chinese-speaking community and local businesses across Arizona.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/directory" className="hover:text-white transition-colors">Directory Categories</Link></li>
              <li><Link href="/relocation-guide" className="hover:text-white transition-colors">Relocation Guides</Link></li>
              <li><Link href="/community" className="hover:text-white transition-colors">Events Calendar</Link></li>
              <li><Link href="/community" className="hover:text-white transition-colors">Local News</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">For Business</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/add-business" className="hover:text-white transition-colors">Add a Listing</Link></li>
              <li><Link href="/add-business" className="hover:text-white transition-colors">Advertising Options</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact Support</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>&copy; {new Date().getFullYear()} ChineseArizona.com. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="#" className="hover:text-white">Privacy Policy</Link>
            <Link href="#" className="hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
