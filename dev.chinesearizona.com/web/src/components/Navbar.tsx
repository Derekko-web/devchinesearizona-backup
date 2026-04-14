import Link from 'next/link';
import { Compass, Globe, Plus } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex-shrink-0 flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-brand-900 block leading-tight">ChineseArizona</span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block leading-none relative top-[-2px]">亞利桑那華人指南</span>
            </div>
          </Link>

          <div className="hidden md:flex space-x-8 items-center">
            <Link href="/directory" className="text-slate-600 font-medium text-sm hover:text-brand-500 transition-colors">
              Directory <span className="text-xs text-slate-500 font-normal ml-1">目錄</span>
            </Link>
            <Link href="/relocation-guide" className="text-slate-600 font-medium text-sm hover:text-brand-500 transition-colors">
              Relocation Guide <span className="text-xs text-slate-500 font-normal ml-1">搬遷指南</span>
            </Link>
            <Link href="/community" className="text-slate-600 font-medium text-sm hover:text-brand-500 transition-colors">
              Community <span className="text-xs text-slate-500 font-normal ml-1">社區</span>
            </Link>
            
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            
            <button className="flex items-center text-sm text-slate-600 hover:text-brand-900 group">
              <Globe className="w-4 h-4 mr-1 text-slate-400 group-hover:text-brand-500" /> EN / 繁
            </button>
            <Link href="/add-business" className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-brand-900 hover:bg-brand-800 transition-colors">
              Add Business <Plus className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}