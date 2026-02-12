"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Check, Sparkles, Zap, Crown, AlertCircle } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  icon: React.ElementType;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: string[];
  color: string;
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    icon: Sparkles,
    price: {
      monthly: 29,
      yearly: 290,
    },
    description: "Perfect for beginners",
    features: [
      "Up to 50 listings per month",
      "AI-generated descriptions",
      "3 marketplace integrations",
      "Basic analytics",
      "Email support",
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
    description: "For serious resellers",
    features: [
      "Unlimited listings",
      "Advanced AI descriptions & tags",
      "All marketplace integrations",
      "Advanced analytics & insights",
      "Priority support (24/7)",
      "Bulk listing tools",
      "Auto-crossposting",
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
    description: "For power users and teams",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "Custom AI training",
      "API access",
      "White-label options",
      "Multi-user accounts",
      "Custom integrations",
    ],
    color: "from-purple-500 to-pink-500",
    popular: false,
  },
];

interface ManagePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  currentBillingCycle?: "monthly" | "yearly";
}

export function ManagePlanModal({
  isOpen,
  onClose,
  currentPlan = "professional",
  currentBillingCycle = "monthly",
}: ManagePlanModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    currentBillingCycle,
  );
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleChangePlan = (planId: string) => {
    setSelectedPlan(planId);
    setShowConfirmation(true);
  };

  const handleConfirmChange = () => {
    // TODO: Integrate with payment provider (Stripe, etc.)
    console.log(`Changing to plan: ${selectedPlan} - ${billingCycle}`);
    alert(
      `Plan change requested! You'll be switched to ${selectedPlan} (${billingCycle}). Payment integration coming soon.`,
    );
    setShowConfirmation(false);
    onClose();
  };

  const handleCancelPlan = () => {
    if (
      confirm(
        "Are you sure you want to cancel your subscription? You'll lose access to all premium features.",
      )
    ) {
      // TODO: Implement cancellation logic
      console.log("Plan cancelled");
      alert(
        "Your subscription has been scheduled for cancellation. You'll retain access until the end of your billing period.",
      );
      onClose();
    }
  };

  const currentPlanData = PLANS.find((p) => p.id === currentPlan);
  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Your Plan"
      maxWidth="2xl"
    >
      <div className="p-6 space-y-6">
        {/* Current Plan Info */}
        <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
              {currentPlanData && (
                <currentPlanData.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-dark-900 dark:text-dark-50">
                Current Plan: {currentPlanData?.name}
              </h3>
              <p className="text-sm text-dark-600 dark:text-dark-400 mt-1">
                ${currentPlanData?.price[billingCycle]}/
                {billingCycle === "monthly" ? "mo" : "yr"} • Renews on Jan 1,
                2026
              </p>
            </div>
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span
            className={`text-sm font-medium ${
              billingCycle === "monthly"
                ? "text-dark-900 dark:text-dark-50"
                : "text-dark-500 dark:text-dark-400"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() =>
              setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")
            }
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              billingCycle === "yearly"
                ? "bg-primary-500"
                : "bg-dark-300 dark:bg-dark-700"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                billingCycle === "yearly" ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${
              billingCycle === "yearly"
                ? "text-dark-900 dark:text-dark-50"
                : "text-dark-500 dark:text-dark-400"
            }`}
          >
            Yearly
            <span className="ml-1 text-xs text-primary-600 dark:text-primary-400">
              (Save 17%)
            </span>
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlan;
            const isSelected = plan.id === selectedPlan;

            return (
              <div
                key={plan.id}
                className={`relative p-5 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/10"
                    : isSelected
                      ? "border-primary-400 bg-primary-50/30 dark:bg-primary-900/5"
                      : "border-dark-200 dark:border-dark-800 hover:border-primary-300 dark:hover:border-primary-700"
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                      CURRENT
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div
                    className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${plan.color}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-dark-900 dark:text-dark-50">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-dark-600 dark:text-dark-400 mt-1">
                      {plan.description}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-dark-900 dark:text-dark-50">
                        ${plan.price[billingCycle]}
                      </span>
                      <span className="text-dark-600 dark:text-dark-400">
                        /{billingCycle === "monthly" ? "mo" : "yr"}
                      </span>
                    </div>
                    {billingCycle === "yearly" && (
                      <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                        ${Math.round(plan.price.yearly / 12)}/month billed
                        annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.slice(0, 5).map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-dark-700 dark:text-dark-300"
                      >
                        <Check className="h-4 w-4 text-primary-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleChangePlan(plan.id)}
                    disabled={isCurrent}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all ${
                      isCurrent
                        ? "bg-dark-100 dark:bg-dark-800 text-dark-400 dark:text-dark-500 cursor-not-allowed"
                        : "bg-gradient-to-r " +
                          plan.color +
                          " text-white hover:shadow-lg hover:scale-105"
                    }`}
                  >
                    {isCurrent ? "Current Plan" : "Switch to " + plan.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirmation Dialog */}
        {showConfirmation && selectedPlanData && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-dark-900 dark:text-dark-50 mb-2">
                  Confirm Plan Change
                </h4>
                <p className="text-sm text-dark-700 dark:text-dark-300 mb-4">
                  You&apos;re about to switch to the{" "}
                  <strong>{selectedPlanData.name}</strong> plan ($
                  {selectedPlanData.price[billingCycle]}/
                  {billingCycle === "monthly" ? "month" : "year"}).
                  {selectedPlanData.price[billingCycle] >
                  (currentPlanData?.price[billingCycle] || 0)
                    ? " You&apos;ll be charged the prorated difference immediately."
                    : " You&apos;ll receive a prorated credit on your next invoice."}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmChange}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Confirm Change
                  </button>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-2 bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 text-dark-900 dark:text-dark-50 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Subscription */}
        <div className="pt-4 border-t border-dark-200 dark:border-dark-800">
          <button
            onClick={handleCancelPlan}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
          >
            Cancel Subscription
          </button>
        </div>
      </div>
    </Modal>
  );
}
