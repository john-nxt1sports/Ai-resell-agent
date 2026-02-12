"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layout,
  Upload,
  BarChart,
} from "lucide-react";

export default function ProductShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);

  const showcaseItems = [
    {
      title: "AI-Assisted Listing Flow",
      description: "Let AI generate perfect titles and descriptions in seconds",
      icon: Sparkles,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Centralized Dashboard",
      description: "Manage all your marketplaces from one beautiful interface",
      icon: Layout,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Bulk Uploader",
      description:
        "Upload dozens of products at once with smart AI enhancement",
      icon: Upload,
      gradient: "from-orange-500 to-red-500",
    },
    {
      title: "Analytics & Insights",
      description: "Track performance and optimize your pricing strategy",
      icon: BarChart,
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % showcaseItems.length);
  };

  const prevSlide = () => {
    setActiveSlide(
      (prev) => (prev - 1 + showcaseItems.length) % showcaseItems.length
    );
  };

  return (
    <section className="py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Experience the Platform
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            See how our intuitive interface makes listing automation effortless
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Main Showcase */}
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Screenshot Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center p-12">
              <div className="w-full h-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-300 dark:border-gray-700 shadow-2xl flex items-center justify-center">
                {/* Active Slide Content */}
                <div className="text-center px-8">
                  <div
                    className={`inline-flex p-6 rounded-2xl bg-gradient-to-br ${showcaseItems[activeSlide].gradient} shadow-xl mb-6`}
                  >
                    {(() => {
                      const Icon = showcaseItems[activeSlide].icon;
                      return <Icon className="w-12 h-12 text-white" />;
                    })()}
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {showcaseItems[activeSlide].title}
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto">
                    {showcaseItems[activeSlide].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Gradient Overlays */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-900 dark:to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-100 to-transparent dark:from-gray-800 dark:to-transparent pointer-events-none"></div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200 dark:border-gray-700"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border border-gray-200 dark:border-gray-700"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {showcaseItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeSlide
                    ? "w-8 bg-gradient-to-r from-blue-600 to-purple-600"
                    : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Feature Tags */}
        <div className="mt-16 flex flex-wrap justify-center gap-4">
          {showcaseItems.map((item, index) => (
            <button
              key={index}
              onClick={() => setActiveSlide(index)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                index === activeSlide
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-105`
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
