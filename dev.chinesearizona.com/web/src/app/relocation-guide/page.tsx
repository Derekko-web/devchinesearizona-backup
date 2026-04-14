import { CarFront, GraduationCap, Plug } from 'lucide-react';

export const metadata = {
  title: 'Relocation Guide - Chinese Arizona',
};

export default function RelocationGuidePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Relocation Guide</h1>
      <p className="text-slate-600 mb-8">Essential guides for moving to Arizona.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <CarFront className="w-8 h-8 text-brand-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Driver's License & DMV</h3>
          <p className="text-sm text-slate-600">How to convert an out-of-state or international license.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <GraduationCap className="w-8 h-8 text-brand-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">School Districts</h3>
          <p className="text-sm text-slate-600">A guide to the top-rated schools in Chandler and Gilbert.</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <Plug className="w-8 h-8 text-brand-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Setting Up Utilities</h3>
          <p className="text-sm text-slate-600">Navigating SRP, APS, and local water services.</p>
        </div>
      </div>
    </div>
  );
}
