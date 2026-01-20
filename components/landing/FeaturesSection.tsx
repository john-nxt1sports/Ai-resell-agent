"use client";

import Link from "next/link";
import { Sparkles, Upload, BarChart3, Zap, Clock, Target } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: Sparkles,
      title: "AI Listing Automation",
      description:
        "Instantly generate optimized titles, descriptions, and tags powered by advanced AI that understands marketplace algorithms.",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: Upload,
      title: "Bulk Uploads",
      description:
        "Upload multiple listings at once with AI-powered enhancement. Save hours with intelligent batch processing.",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      icon: Zap,
      title: "Cross-Platform Sync",
      description:
        "Post to eBay, Mercari, and Poshmark automatically from a single dashboard. One click, three platforms.",
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      icon: BarChart3,
      title: "Smart Analytics",
      description:
        "Track performance and pricing trends in real-time. Make data-driven decisions to maximize your profits.",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      icon: Clock,
      title: "Time-Saving Automation",
      description:
        "Reduce listing time by 95%. Focus on sourcing and selling while we handle the tedious work.",
      color: "from-indigo-500 to-purple-500",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      icon: Target,
      title: "Optimized for Sales",
      description:
        "AI learns from top-performing listings to help you write descriptions that convert browsers into buyers.",
      color: "from-pink-500 to-rose-500",
      bgColor: "bg-pink-50 dark:bg-pink-950/30",
    },
  ];

  return (
    <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Everything You Need to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Scale Your Business
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Powerful features designed to help resellers save time, increase
            listings, and grow revenue.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group relative">
              {/* Card */}
              <div
                className={`h-full p-8 rounded-2xl ${feature.bgColor} border border-gray-200 dark:border-gray-800 hover:shadow-2xl hover:shadow-gray-300/50 dark:hover:shadow-gray-800/50 transition-all duration-500 hover:-translate-y-2`}
              >
                {/* Icon */}
                <div
                  className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Effect Border */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none`}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Join thousands of sellers who are already automating their workflows
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </section>
  );
}
