export const metadata = {
  title: 'Add Business - Chinese Arizona',
};

export default function AddBusinessPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
      <div className="bg-white p-8 rounded-xl border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Claim or Add Your Business</h1>
        <p className="text-slate-600 mb-6">Reach thousands of newcomers and established families in Arizona.</p>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Business Name</label>
            <input type="text" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm" placeholder="e.g. Taste of Taiwan" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm">
              <option>Real Estate</option>
              <option>Medical</option>
              <option>Legal</option>
              <option>Dining</option>
              <option>Services</option>
              <option>Moving</option>
              <option>Education</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Contact Email</label>
            <input type="email" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm" placeholder="you@example.com" />
          </div>
          <button type="button" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500">
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
}
