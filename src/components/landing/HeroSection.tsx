"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-600/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-lg animate-fade-in-down">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            AI-Powered Listing Automation
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200">
            Automate Your Listings.
          </span>
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            Grow Your Reselling Business.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in-up delay-200">
          AI-powered platform to post, optimize, and manage your listings across{" "}
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            eBay
          </span>
          ,{" "}
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            Poshmark
          </span>
          , and{" "}
          <span className="font-semibold text-orange-600 dark:text-orange-400">
            Mercari
          </span>{" "}
          — all in one place.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up delay-300">
          <Link
            href="/auth/signup"
            className="group relative inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/50 dark:hover:shadow-blue-400/30 transition-all duration-300 hover:scale-105"
          >
            <Zap className="w-5 h-5" />
            Start 14-Day Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            onClick={() =>
              document
                .getElementById("features")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 hover:border-blue-500 dark:hover:border-blue-400"
          >
            See How It Works
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <div className="relative max-w-5xl mx-auto animate-fade-in-up delay-500">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 mx-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center px-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    app.listingsai.io
                  </span>
                </div>
              </div>
            </div>

            {/* Dashboard Preview Placeholder */}
            <div className="aspect-video bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-blue-900/20 dark:to-purple-900/20 flex items-center justify-center p-8">
              <div className="w-full h-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6">
                <div className="space-y-4">
                  {/* Mock Dashboard Elements */}
                  <div className="flex gap-4">
                    <div className="flex-1 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="text-3xl font-bold">2,847</div>
                        <div className="text-sm opacity-90">
                          Active Listings
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-lg flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="text-3xl font-bold">156</div>
                        <div className="text-sm opacity-90">
                          Today&apos;s Posts
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500 rounded-2xl shadow-xl opacity-20 blur-xl animate-float"></div>
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500 rounded-2xl shadow-xl opacity-20 blur-xl animate-float delay-500"></div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-20 text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up delay-700">
          No credit card required • 14-day free trial • Cancel anytime
        </div>
      </div>
    </section>
  );
}
