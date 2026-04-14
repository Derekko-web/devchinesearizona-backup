import Link from 'next/link';
import { Store, Phone, MapPin } from 'lucide-react';
import Image from 'next/image';

const directoryListings = [
  {
    id: 1,
    name: "Elite AZ Realty Team",
    chineseName: "精英房產團隊",
    category: "Real Estate (房地產)",
    address: "3200 N Central Ave, Phoenix, AZ 85012",
    phone: "(602) 555-0198",
    description: "Your trusted partners in Arizona real estate, specializing in residential and commercial properties for the Chinese-speaking community.",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 2,
    name: "Taste of Taiwan",
    chineseName: "台灣古早味",
    category: "Dining (餐廳美食)",
    address: "1800 W Main St, Mesa, AZ 85201",
    phone: "(480) 555-0122",
    description: "Authentic Taiwanese street food and traditional dishes. Famous for our beef noodle soup and bubble tea.",
    image: "https://images.unsplash.com/photo-1555126634-ae23594bab69?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 3,
    name: "Chen CPA & Associates",
    chineseName: "陳氏會計師事務所",
    category: "Legal & Finance (法律財務)",
    address: "411 N Central Ave, Phoenix, AZ 85004",
    phone: "(602) 555-0136",
    description: "Full-service accounting firm offering tax preparation, bookkeeping, and financial consulting for local businesses.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 4,
    name: "Arizona Chinese Language Academy",
    chineseName: "亞利桑那中文學校",
    category: "Education (教育學習)",
    address: "1405 E Warner Rd, Tempe, AZ 85284",
    phone: "(480) 555-0144",
    description: "Weekend and after-school Chinese language and cultural programs for K-12 students.",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
  },
  {
    id: 5,
    name: "ProFix Home Services",
    chineseName: "專業居家維修",
    category: "Services (居家維修)",
    address: "Mobile Service, Chandler, AZ",
    phone: "(480) 555-0175",
    description: "Licensed and bonded handymen available for plumbing, electrical, HVAC, and general home repairs.",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
  }
];

export const metadata = {
  title: 'Business Directory - Chinese Arizona',
};

export default function DirectoryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Business Directory</h1>
          <p className="text-slate-600">Browse trusted local businesses in Arizona.</p>
        </div>
        <Link href="/add-business" className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition duration-150 inline-flex items-center gap-2">
          <Store className="w-5 h-5" />
          Add Your Business
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="col-span-1 bg-white p-4 rounded-xl border border-slate-200">
          <h3 className="font-semibold mb-4 text-slate-800">Categories</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link href="#" className="hover:text-brand-500">Real Estate (房地產)</Link></li>
            <li><Link href="#" className="hover:text-brand-500">Dining (餐廳美食)</Link></li>
            <li><Link href="#" className="hover:text-brand-500">Legal & Finance (法律財務)</Link></li>
            <li><Link href="#" className="hover:text-brand-500">Education (教育學習)</Link></li>
            <li><Link href="#" className="hover:text-brand-500">Services (居家維修)</Link></li>
          </ul>
        </div>
        {/* Directory List */}
        <div className="col-span-3">
          <div className="space-y-6">
            {directoryListings.map((listing) => (
              <div key={listing.id} className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="md:w-48 h-32 md:h-auto relative flex-shrink-0">
                  <Image 
                    src={listing.image} 
                    alt={listing.name} 
                    fill 
                    className="object-cover rounded-lg"
                  />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{listing.name}</h2>
                      <p className="text-sm font-medium text-brand-600 mb-1">{listing.chineseName}</p>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-medium">{listing.category}</span>
                  </div>
                  <p className="text-slate-600 text-sm mb-4 leading-relaxed">{listing.description}</p>
                  <div className="flex flex-col sm:flex-row gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{listing.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{listing.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
