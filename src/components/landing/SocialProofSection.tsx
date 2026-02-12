"use client";

export default function SocialProofSection() {
  const marketplaces = [
    { name: "eBay", color: "from-red-500 to-yellow-500" },
    { name: "Poshmark", color: "from-purple-500 to-pink-500" },
    { name: "Mercari", color: "from-orange-500 to-red-500" },
  ];

  return (
    <section className="py-16 bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-6">
            Trusted by Top Resellers and Power Sellers
          </p>
        </div>

        {/* Marketplace Logos */}
        <div className="grid grid-cols-3 gap-8 items-center max-w-3xl mx-auto">
          {marketplaces.map((marketplace) => (
            <div
              key={marketplace.name}
              className="group flex items-center justify-center p-6 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all duration-300 hover:scale-105"
            >
              <div className="text-center">
                <div
                  className={`w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br ${marketplace.color} opacity-20 group-hover:opacity-30 transition-opacity`}
                ></div>
                <div
                  className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${marketplace.color}`}
                >
                  {marketplace.name}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              50K+
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Listings Posted
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              2,500+
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active Sellers
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              98%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Time Saved
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              4.9★
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              User Rating
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
