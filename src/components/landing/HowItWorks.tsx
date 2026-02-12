"use client";

import Link from "next/link";
import { Upload, Sparkles, Rocket, CheckCircle } from "lucide-react";

export default function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Upload,
      title: "Upload Your Products",
      description:
        "Take photos or upload images of your items. Add them individually or in bulk for faster processing.",
      color: "from-blue-500 to-cyan-500",
      features: [
        "Bulk upload support",
        "Mobile-friendly capture",
        "Image optimization",
      ],
    },
    {
      number: "02",
      icon: Sparkles,
      title: "AI Optimizes Everything",
      description:
        "Our AI analyzes your items and generates SEO-optimized titles, compelling descriptions, and smart tags.",
      color: "from-purple-500 to-pink-500",
      features: [
        "Smart title generation",
        "Keyword optimization",
        "Price suggestions",
      ],
    },
    {
      number: "03",
      icon: Rocket,
      title: "Publish Everywhere",
      description:
        "Review and publish to eBay, Poshmark, and Mercari with one click. Track everything from your dashboard.",
      color: "from-orange-500 to-red-500",
      features: [
        "One-click publishing",
        "Multi-platform sync",
        "Real-time tracking",
      ],
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Three simple steps to transform your reselling workflow
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 opacity-20 -translate-y-1/2 -z-10"></div>

          <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                {/* Step Card */}
                <div className="relative h-full p-8 rounded-2xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 hover:border-transparent hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  {/* Gradient Border on Hover */}
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl`}
                  ></div>

                  {/* Step Number */}
                  <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 shadow-lg flex items-center justify-center">
                    <span className="text-2xl font-bold text-white dark:text-gray-900">
                      {step.number}
                    </span>
                  </div>

                  {/* Icon */}
                  <div
                    className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${step.color} shadow-lg mb-6 mt-8 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-3">
                    {step.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Arrow for Desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 -translate-y-1/2 z-10">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg`}
                    >
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-block p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-gray-200 dark:border-gray-800">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to automate your listings?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
              Join thousands of sellers saving hours every day
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Start Free Trial
              <Rocket className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
