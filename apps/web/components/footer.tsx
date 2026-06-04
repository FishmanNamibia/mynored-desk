import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-[#7f1d1d] to-[#b91c1c] text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">NORED Desk</h3>
            <p className="text-gray-300 text-sm">
              Internal workplace and performance workspace for NORED teams.
            </p>
          </div>
          
          <div>
            <h4 className="text-md font-medium mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/my-tasks" className="text-gray-300 hover:text-white transition-colors">
                  My Tasks
                </Link>
              </li>
              <li>
                <Link href="/dashboard/performance" className="text-gray-300 hover:text-white transition-colors">
                  Performance
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-medium mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/help" className="text-gray-300 hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-gray-300 hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-md font-medium mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/security" className="text-gray-300 hover:text-white transition-colors">
                  Security Notice
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-6 pt-6 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} NORED. All rights reserved.</p>
          <p className="mt-1">Internal System - Authorized Personnel Only</p>
        </div>
      </div>
    </footer>
  )
}
