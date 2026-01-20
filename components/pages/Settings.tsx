"use client";

import { useState, useEffect } from "react";
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Link as LinkIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updatePassword, deleteAccount } from "@/lib/auth";
import { ManagePlanModal } from "@/components/ui/ManagePlanModal";
import { DeleteAccountModal } from "@/components/ui/DeleteAccountModal";
import { ExtensionMarketplaceConnections } from "@/components/settings/ExtensionMarketplaceConnections";
import { useRouter } from "next/navigation";

export function Settings() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    listings: true,
  });

  const [showManagePlanModal, setShowManagePlanModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUser(user);
        setEmail(user.email || "");

        // Fetch profile data
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || "");
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const supabase = createClient();

      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      setProfileSuccess("Profile updated successfully!");
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (error: any) {
      setProfileError(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess("");

    // Validation
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("Please fill in all password fields");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      await updatePassword(passwordData.newPassword);
      setPasswordSuccess("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordSection(false);
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (error: any) {
      setPasswordError(error.message || "Failed to update password");
    }
  }

  async function handleDeleteAccount() {
    const { error } = await deleteAccount();

    if (error) {
      throw new Error(error.message || "Failed to delete account");
    }

    // Redirect to home page after successful deletion
    router.push("/");
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          Settings
        </h1>
        <p className="text-dark-600 dark:text-dark-400">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Profile
          </h2>
        </div>

        {profileSuccess && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {profileError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-4 py-2 rounded-lg border border-dark-300 dark:border-dark-700 bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-dark-500 dark:text-dark-500">
              Email cannot be changed
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Password Settings */}
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Password
          </h2>
        </div>

        {!showPasswordSection ? (
          <button
            onClick={() => setShowPasswordSection(true)}
            className="px-6 py-2 bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 text-dark-900 dark:text-dark-50 font-medium rounded-lg transition-colors"
          >
            Change Password
          </button>
        ) : (
          <div className="space-y-4">
            {passwordSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
                {passwordSuccess}
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {passwordError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      new: !showPasswords.new,
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-700 dark:hover:text-dark-300"
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-700 dark:text-dark-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-dark-300 dark:border-dark-700 bg-white dark:bg-dark-800 text-dark-900 dark:text-dark-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      confirm: !showPasswords.confirm,
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-700 dark:hover:text-dark-300"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowPasswordSection(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  setPasswordError("");
                }}
                className="px-6 py-2 bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 text-dark-900 dark:text-dark-50 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                Update Password
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Notifications
          </h2>
        </div>

        <div className="space-y-4">
          <SettingToggle
            label="Email Notifications"
            description="Receive email updates about your listings"
            checked={notifications.email}
            onChange={(checked) =>
              setNotifications({ ...notifications, email: checked })
            }
          />
          <SettingToggle
            label="Push Notifications"
            description="Get push notifications on your device"
            checked={notifications.push}
            onChange={(checked) =>
              setNotifications({ ...notifications, push: checked })
            }
          />
          <SettingToggle
            label="Listing Updates"
            description="Notify when listings are posted or sold"
            checked={notifications.listings}
            onChange={(checked) =>
              setNotifications({ ...notifications, listings: checked })
            }
          />
        </div>
      </div>

      {/* Marketplace Accounts */}
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <LinkIcon className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Automated Marketplace Posting
          </h2>
        </div>

        <ExtensionMarketplaceConnections />
      </div>

      {/* Billing */}
      <div className="bg-white dark:bg-dark-900 rounded-xl border border-dark-200 dark:border-dark-800 p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="h-5 w-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50">
            Billing
          </h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-dark-50 dark:bg-dark-800 rounded-lg">
          <div>
            <p className="font-medium text-dark-900 dark:text-dark-50">
              Professional Plan
            </p>
            <p className="text-sm text-dark-600 dark:text-dark-400">
              $79/month • Renews on Jan 1, 2026
            </p>
          </div>
          <button
            onClick={() => setShowManagePlanModal(true)}
            className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          >
            Manage
          </button>
        </div>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="bg-white dark:bg-dark-900 rounded-xl border-2 border-red-200 dark:border-red-900 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Danger Zone
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-dark-900 dark:text-dark-50 mb-2">
              Delete Account
            </h3>
            <p className="text-sm text-dark-600 dark:text-dark-400 mb-4">
              Permanently delete your account and all associated data. This
              action cannot be undone.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteAccountModal(true)}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Manage Plan Modal */}
      <ManagePlanModal
        isOpen={showManagePlanModal}
        onClose={() => setShowManagePlanModal(false)}
        currentPlan="professional"
        currentBillingCycle="monthly"
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-dark-900 dark:text-dark-50">{label}</p>
        <p className="text-sm text-dark-600 dark:text-dark-400">
          {description}
        </p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary-500" : "bg-dark-300 dark:bg-dark-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function AccountCard({
  name,
  connected,
}: {
  name: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-dark-200 dark:border-dark-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
          <span className="text-sm font-semibold text-dark-600 dark:text-dark-400">
            {name[0]}
          </span>
        </div>
        <div>
          <p className="font-medium text-dark-900 dark:text-dark-50">{name}</p>
          <p className="text-sm text-dark-600 dark:text-dark-400">
            {connected ? "Connected" : "Not connected"}
          </p>
        </div>
      </div>
      <button
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
          connected
            ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            : "text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
        }`}
      >
        {connected ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
}
