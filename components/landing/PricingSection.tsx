"use client";

import { Check, Sparkles, Zap, Crown } from "lucide-react";
import Link from "next/link";

export default function PricingSection() {
  const plans = [
    {
      name: "Starter",
      icon: Sparkles,
      price: "29",
      period: "month",
      description: "Perfect for getting started with automation",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient:
        "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30",
      features: [
        "100 listings per month",
        "AI title & description generation",
        "Post to 2 marketplaces",
        "Basic analytics dashboard",
        "Email support",
        "Mobile app access",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      icon: Zap,
      price: "59",
      period: "month",
      description: "For serious resellers scaling their business",
      gradient: "from-purple-500 to-pink-500",
      bgGradient:
        "from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30",
      features: [
        "500 listings per month",
        "Advanced AI optimization",
        "Post to all 3 marketplaces",
        "Advanced analytics & insights",
        "Priority support",
        "Bulk upload (50+ items)",
        "Price optimization AI",
        "Scheduled posting",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      icon: Crown,
      price: "149",
      period: "month",
      description: "For power sellers and teams",
      gradient: "from-orange-500 to-red-500",
      bgGradient:
        "from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30",
      features: [
        "Unlimited listings",
        "Premium AI with custom training",
        "All marketplace integrations",
        "Real-time analytics & reports",
        "24/7 dedicated support",
        "Unlimited bulk uploads",
        "Team collaboration tools",
        "API access",
        "Custom integrations",
        "White-label option",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Choose the perfect plan for your reselling business. All plans
            include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                  <div
                    className={`px-4 py-1 rounded-full bg-gradient-to-r ${plan.gradient} text-white text-sm font-semibold shadow-lg`}
                  >
                    Most Popular
                  </div>
                </div>
              )}

              {/* Card */}
              <div
                className={`h-full p-8 rounded-2xl bg-gradient-to-br ${
                  plan.bgGradient
                } border-2 ${
                  plan.popular
                    ? "border-purple-500 dark:border-purple-400 shadow-2xl shadow-purple-500/20"
                    : "border-gray-200 dark:border-gray-800"
                } hover:shadow-2xl transition-all duration-500 hover:-translate-y-2`}
              >
                {/* Icon */}
                <div
                  className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${plan.gradient} shadow-lg mb-6`}
                >
                  <plan.icon className="w-8 h-8 text-white" />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      /{plan.period}
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <Link
                  href={
                    plan.cta === "Contact Sales" ? "/contact" : "/auth/signup"
                  }
                  className={`block w-full py-3 px-6 text-center font-semibold rounded-xl transition-all duration-300 hover:scale-105 mb-8 ${
                    plan.popular
                      ? `text-white bg-gradient-to-r ${plan.gradient} shadow-lg hover:shadow-xl`
                      : "text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Teaser */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-gray-200 dark:border-gray-800">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Questions about pricing?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              All plans include a 14-day free trial with full access to
              features. No credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                View FAQ
              </button>
              <button className="px-6 py-3 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-300 hover:scale-105">
                Contact Sales
              </button>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span>14-day free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span>30-day money back guarantee</span>
          </div>
        </div>
      </div>
    </section>
  );
}
