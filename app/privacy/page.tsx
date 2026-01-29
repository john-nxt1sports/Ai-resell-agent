import { MainLayout } from "@/components/layout/MainLayout";
import { Shield, Lock, Eye, Server, Mail, FileText } from "lucide-react";

export default function PrivacyPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-4xl font-bold text-dark-900 dark:text-dark-50 mb-4">
            Privacy Policy
          </h1>
          <p className="text-dark-600 dark:text-dark-400">
            Last updated: January 29, 2026
          </p>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-500" />
              Introduction
            </h2>
            <p className="text-dark-600 dark:text-dark-400">
              ListingsAI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is
              committed to protecting your privacy. This Privacy Policy explains
              how we collect, use, and safeguard your information when you use
              our web application and Chrome extension.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-primary-500" />
              Information We Collect
            </h2>

            <h3 className="text-xl font-medium text-dark-800 dark:text-dark-200 mt-6 mb-3">
              Web Application
            </h3>
            <ul className="list-disc pl-6 text-dark-600 dark:text-dark-400 space-y-2">
              <li>
                <strong>Account Information:</strong> Email address and
                authentication data when you sign up
              </li>
              <li>
                <strong>Listing Data:</strong> Titles, descriptions, prices, and
                images you upload for your listings
              </li>
              <li>
                <strong>Usage Data:</strong> How you interact with our
                application to improve our service
              </li>
            </ul>

            <h3 className="text-xl font-medium text-dark-800 dark:text-dark-200 mt-6 mb-3">
              Chrome Extension
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
              <p className="text-green-800 dark:text-green-200 font-medium mb-2">
                🔒 Minimal Data Collection
              </p>
              <ul className="list-disc pl-6 text-green-700 dark:text-green-300 space-y-2">
                <li>
                  <strong>No marketplace passwords:</strong> We never ask for or
                  store your Poshmark, Mercari, or eBay passwords
                </li>
                <li>
                  <strong>Local processing only:</strong> All automation happens
                  in your browser, not on our servers
                </li>
                <li>
                  <strong>Job queue:</strong> Pending listing jobs are stored
                  locally in Chrome storage
                </li>
                <li>
                  <strong>Login status:</strong> We detect if you&apos;re logged
                  into marketplaces (not your credentials)
                </li>
              </ul>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <Server className="w-6 h-6 text-primary-500" />
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 text-dark-600 dark:text-dark-400 space-y-2">
              <li>To provide and maintain our service</li>
              <li>To automate listing creation on your behalf</li>
              <li>To improve and personalize your experience</li>
              <li>To communicate with you about updates and support</li>
              <li>To detect and prevent fraud or abuse</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-primary-500" />
              Data Security
            </h2>
            <p className="text-dark-600 dark:text-dark-400 mb-4">
              We implement industry-standard security measures to protect your
              data:
            </p>
            <ul className="list-disc pl-6 text-dark-600 dark:text-dark-400 space-y-2">
              <li>All data transmitted is encrypted using TLS/SSL</li>
              <li>Passwords are hashed using bcrypt before storage</li>
              <li>Database access is restricted and monitored</li>
              <li>Regular security audits and updates</li>
            </ul>
          </section>

          {/* Third-Party Services */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4">
              Third-Party Services
            </h2>
            <p className="text-dark-600 dark:text-dark-400 mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-dark-600 dark:text-dark-400 space-y-2">
              <li>
                <strong>Supabase:</strong> Database and authentication
              </li>
              <li>
                <strong>Vercel:</strong> Application hosting
              </li>
              <li>
                <strong>OpenAI:</strong> AI-powered listing optimization
                (listing text only, never images)
              </li>
            </ul>
            <p className="text-dark-600 dark:text-dark-400 mt-4">
              We do not sell your data to any third parties.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4">
              Your Rights
            </h2>
            <p className="text-dark-600 dark:text-dark-400 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-dark-600 dark:text-dark-400 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and associated data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          {/* Chrome Extension Specific */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4">
              Chrome Extension Permissions
            </h2>
            <p className="text-dark-600 dark:text-dark-400 mb-4">
              Our Chrome extension requires the following permissions:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-200 dark:border-dark-700">
                    <th className="py-3 px-4 text-dark-900 dark:text-dark-100">
                      Permission
                    </th>
                    <th className="py-3 px-4 text-dark-900 dark:text-dark-100">
                      Why We Need It
                    </th>
                  </tr>
                </thead>
                <tbody className="text-dark-600 dark:text-dark-400">
                  <tr className="border-b border-dark-100 dark:border-dark-800">
                    <td className="py-3 px-4 font-mono text-sm">storage</td>
                    <td className="py-3 px-4">
                      Store your preferences and job queue locally
                    </td>
                  </tr>
                  <tr className="border-b border-dark-100 dark:border-dark-800">
                    <td className="py-3 px-4 font-mono text-sm">tabs</td>
                    <td className="py-3 px-4">
                      Open marketplace tabs to create listings
                    </td>
                  </tr>
                  <tr className="border-b border-dark-100 dark:border-dark-800">
                    <td className="py-3 px-4 font-mono text-sm">activeTab</td>
                    <td className="py-3 px-4">
                      Interact with marketplace pages
                    </td>
                  </tr>
                  <tr className="border-b border-dark-100 dark:border-dark-800">
                    <td className="py-3 px-4 font-mono text-sm">scripting</td>
                    <td className="py-3 px-4">
                      Fill in listing forms automatically
                    </td>
                  </tr>
                  <tr className="border-b border-dark-100 dark:border-dark-800">
                    <td className="py-3 px-4 font-mono text-sm">
                      notifications
                    </td>
                    <td className="py-3 px-4">
                      Notify you when listings are created
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary-500" />
              Contact Us
            </h2>
            <p className="text-dark-600 dark:text-dark-400">
              If you have questions about this Privacy Policy or your data,
              contact us at:
            </p>
            <ul className="list-none mt-4 text-dark-600 dark:text-dark-400 space-y-2">
              <li>📧 Email: support@listingsai.com</li>
              <li>🌐 Website: https://listingsai.com/help</li>
            </ul>
          </section>

          {/* Updates */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-dark-900 dark:text-dark-50 mb-4">
              Changes to This Policy
            </h2>
            <p className="text-dark-600 dark:text-dark-400">
              We may update this Privacy Policy from time to time. We will
              notify you of significant changes by posting the new policy on
              this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
