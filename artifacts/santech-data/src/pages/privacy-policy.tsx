export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">1. Introduction</h2>
          <p className="text-gray-600 leading-relaxed">
            SanTech Data ("we", "us", or "our") operates the SanTech Data website and mobile application at santechdata.com.ng. This Privacy Policy explains how we collect, use, and protect your personal information when you use our Virtual Top-Up (VTU) services.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-1 leading-relaxed">
            <li><strong>Account information:</strong> Full name, email address, phone number, and password when you register.</li>
            <li><strong>Transaction data:</strong> Records of data, airtime, electricity, cable TV, and exam token purchases.</li>
            <li><strong>Wallet information:</strong> Wallet balance and funding history.</li>
            <li><strong>Device information:</strong> Browser type, IP address, and device identifiers for security purposes.</li>
            <li><strong>BVN/NIN:</strong> Collected only for virtual account creation via our payment partners; we do not store raw BVN/NIN data.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-1 leading-relaxed">
            <li>To process and deliver VTU services you purchase.</li>
            <li>To manage your wallet and payment transactions.</li>
            <li>To send transaction confirmations and service notifications.</li>
            <li>To provide customer support.</li>
            <li>To detect and prevent fraud.</li>
            <li>To improve our services.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">4. Information Sharing</h2>
          <p className="text-gray-600 leading-relaxed">
            We do not sell your personal data. We share information only with:
          </p>
          <ul className="list-disc pl-5 text-gray-600 space-y-1 mt-2 leading-relaxed">
            <li><strong>VTU providers</strong> (KYB Data) to deliver services you purchase.</li>
            <li><strong>Payment processors</strong> (Paystack, Flutterwave) to process wallet funding.</li>
            <li><strong>Law enforcement</strong> when required by Nigerian law.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">5. Data Security</h2>
          <p className="text-gray-600 leading-relaxed">
            We use industry-standard encryption and security practices to protect your data. Passwords are hashed and never stored in plain text. All data transmissions are encrypted via HTTPS.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">6. Data Retention</h2>
          <p className="text-gray-600 leading-relaxed">
            We retain your account and transaction data for as long as your account is active and as required by Nigerian financial regulations. You may request account deletion by contacting support.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">7. Your Rights</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-1 leading-relaxed">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Opt out of marketing communications.</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">8. Cookies</h2>
          <p className="text-gray-600 leading-relaxed">
            We use local storage and session tokens to keep you logged in. We do not use third-party advertising cookies.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">9. Children's Privacy</h2>
          <p className="text-gray-600 leading-relaxed">
            Our services are not directed to anyone under the age of 18. We do not knowingly collect personal data from minors.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">10. Contact Us</h2>
          <p className="text-gray-600 leading-relaxed">
            For any privacy-related questions or requests, contact us at:<br />
            <strong>Email:</strong> support@santechdata.com.ng<br />
            <strong>Phone:</strong> 09026329296<br />
            <strong>Website:</strong> santechdata.com.ng
          </p>
        </section>
      </div>
    </div>
  );
}
