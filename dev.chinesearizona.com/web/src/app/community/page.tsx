import { Users } from 'lucide-react';

export const metadata = {
  title: 'Community - Chinese Arizona',
};

export default function CommunityPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Community Board</h1>
      <p className="text-slate-600 mb-8">Events, news, and classifieds from your local community.</p>
      
      <div className="bg-white p-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-center min-h-[300px]">
        <div>
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Community events and classifieds will appear here.</p>
        </div>
      </div>
    </div>
  );
}
