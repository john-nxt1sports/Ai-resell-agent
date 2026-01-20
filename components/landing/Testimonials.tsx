"use client";

import { Star, Quote } from "lucide-react";

export default function Testimonials() {
  const testimonials = [
    {
      name: "Sarah Mitchell",
      role: "Full-Time Poshmark Seller",
      avatar: "SM",
      rating: 5,
      text: "This tool cut my listing time in half! I went from spending 3 hours a day on listings to just 30 minutes. The AI descriptions are incredible and my sales have actually increased.",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      name: "Marcus Johnson",
      role: "eBay Power Seller",
      avatar: "MJ",
      rating: 5,
      text: "As someone managing 500+ active listings, this platform is a game-changer. The bulk upload feature alone saves me 10+ hours every week. Worth every penny.",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      name: "Jennifer Lee",
      role: "Multi-Platform Reseller",
      avatar: "JL",
      rating: 5,
      text: "Finally, one place to manage all my marketplaces! The AI suggestions are spot-on and I love the analytics dashboard. My revenue is up 40% since switching.",
      gradient: "from-orange-500 to-red-500",
    },
  ];

  return (
    <section className="py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Loved by Resellers
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            See what our community of power sellers has to say
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="group relative">
              {/* Card */}
              <div className="h-full p-8 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-2xl hover:shadow-gray-300/50 dark:hover:shadow-gray-800/50 transition-all duration-500 hover:-translate-y-2">
                {/* Quote Icon */}
                <div
                  className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${testimonial.gradient} mb-6`}
                >
                  <Quote className="w-6 h-6 text-white" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 italic">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-bold shadow-lg`}
                  >
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {testimonial.role}
                    </div>
                  </div>
                </div>

                {/* Hover Gradient */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${testimonial.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none`}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white dark:border-gray-900"></div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white dark:border-gray-900"></div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 border-2 border-white dark:border-gray-900"></div>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Join 2,500+ happy sellers
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
