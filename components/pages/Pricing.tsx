"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Crown, TrendingUp } from "lucide-react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    icon: Sparkles,
    price: {
      monthly: 29,
      yearly: 290,
    },
    description: "Perfect for beginners starting their reselling journey",
    features: [
      "Up to 50 listings per month",
      "AI-generated descriptions",
      "3 marketplace integrations",
      "Basic analytics",
      "Email support",
      "Standard processing speed",
    ],
    color: "from-blue-500 to-cyan-500",
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    icon: Zap,
    price: {
      monthly: 79,
      yearly: 790,
    },
    description: "For serious resellers ready to scale their business",
    features: [
      "Unlimited listings",
      "Advanced AI descriptions & tags",
      "All marketplace integrations",
      "Advanced analytics & insights",
      "Priority support (24/7)",
      "Fast processing speed",
      "Bulk listing tools",
      "Auto-crossposting",
      "Price optimization AI",
    ],
    color: "from-primary-500 to-primary-600",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Crown,
    price: {
      monthly: 199,
      yearly: 1990,
    },
    description: "For power users and teams managing high volume",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom AI training",
      "API access",
      "White-label options",
      "Multi-user accounts",
      "Custom integrations",
      "Advanced automation",
      "Real-time inventory sync",
    ],
    color: "from-purple-500 to-pink-500",
    popular: false,
  },
];

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const handleSelectPlan = (planId: string) => {
    // TODO: Integrate with payment provider (Stripe, etc.)
    console.log(`Selected plan: ${planId} - ${billingCycle}`);
    alert(
      `You selected the ${planId} plan (${billingCycle}). Payment integration coming soon!`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10 pb-12">
      {/* Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium mb-4">
          <TrendingUp className="h-4 w-4" />
          Choose Your Plan
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-dark-900 dark:text-dark-50">
          Scale Your Reselling Business
        </h1>
        <p className="text-lg text-dark-600 dark:text-dark-400 max-w-2xl mx-auto">
          Choose the perfect plan for your needs. All plans include AI-powered
          listing automation to save you time and boost sales.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 py-4">
        <span
          className={`text-sm font-medium transition-colors ${
            billingCycle === "monthly"
              ? "text-dark-900 dark:text-dark-50"
              : "text-dark-500 dark:text-dark-500"
          }`}
        >
          Monthly
        </span>
        <button
          onClick={() =>
            setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")
          }
          className={`relative w-14 h-7 rounded-full transition-colors ${
            billingCycle === "yearly"
              ? "bg-primary-500"
              : "bg-dark-300 dark:bg-dark-700"
          }`}
          aria-label="Toggle billing cycle"
        >
          <span
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
              billingCycle === "yearly" ? "translate-x-7" : ""
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium transition-colors ${
            billingCycle === "yearly"
              ? "text-dark-900 dark:text-dark-50"
              : "text-dark-500 dark:text-dark-500"
          }`}
        >
          Yearly
        </span>
        {billingCycle === "yearly" && (
          <span className="ml-2 px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
            Save 17%
          </span>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 pt-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const price =
            billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly;
          const pricePerMonth =
            billingCycle === "yearly"
              ? Math.round(plan.price.yearly / 12)
              : price;

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-dark-900 rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl ${
                plan.popular
                  ? "border-primary-500 shadow-xl scale-105 lg:scale-110"
                  : "border-dark-200 dark:border-dark-800 hover:border-primary-300 dark:hover:border-primary-700"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold rounded-full shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-6">
                {/* Plan Header */}
                <div className="space-y-3">
                  <div
                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color}`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-dark-600 dark:text-dark-400">
                    {plan.description}
                  </p>
                </div>

                {/* Pricing */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-bold text-dark-900 dark:text-dark-50">
                      ${pricePerMonth}
                    </span>
                    <span className="text-dark-600 dark:text-dark-400">
                      /month
                    </span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-sm text-dark-500 dark:text-dark-500">
                      ${price} billed annually
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${
                    plan.popular
                      ? "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg hover:shadow-xl"
                      : "bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 text-dark-900 dark:text-dark-50"
                  }`}
                >
                  {plan.popular ? "Get Started" : "Choose Plan"}
                </button>

                {/* Features List */}
                <div className="space-y-3 pt-6 border-t border-dark-200 dark:border-dark-800">
                  <p className="text-sm font-semibold text-dark-700 dark:text-dark-300">
                    What's included:
                  </p>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mt-0.5`}
                        >
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm text-dark-700 dark:text-dark-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="pt-8 sm:pt-12 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-dark-900 dark:text-dark-50 mb-6 sm:mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <FAQItem
            question="Can I change plans later?"
            answer="Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle."
          />
          <FAQItem
            question="What payment methods do you accept?"
            answer="We accept all major credit cards (Visa, Mastercard, Amex) and PayPal. All payments are processed securely through Stripe."
          />
          <FAQItem
            question="Is there a free trial?"
            answer="Yes! All new users get a 14-day free trial with full access to Professional features. No credit card required to start."
          />
          <FAQItem
            question="Can I cancel anytime?"
            answer="Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your current billing period."
          />
          <FAQItem
            question="Do you offer refunds?"
            answer="We offer a 30-day money-back guarantee. If you're not satisfied within the first 30 days, we'll refund your payment in full."
          />
        </div>
      </div>

      {/* CTA Section */}
      <div className="pt-8 sm:pt-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 sm:p-12 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Ready to Automate Your Listings?
        </h2>
        <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
          Join thousands of resellers who are saving hours every week with
          AI-powered automation.
        </p>
        <button
          onClick={() => handleSelectPlan("professional")}
          className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-4 rounded-xl hover:bg-primary-50 transition-colors shadow-xl hover:shadow-2xl"
        >
          <Sparkles className="h-5 w-5" />
          Start Free Trial
        </button>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
      >
        <span className="font-semibold text-dark-900 dark:text-dark-50">
          {question}
        </span>
        <span
          className={`text-primary-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-dark-200 dark:border-dark-800 bg-dark-50 dark:bg-dark-800/50">
          <p className="text-dark-700 dark:text-dark-300">{answer}</p>
        </div>
      )}
    </div>
  );
}
