'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/footer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Department {
  id: string
  name: string
}

interface Division {
  id: string
  name: string
  departmentId: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STAFF',
    departmentId: '',
    divisionId: '',
  })
  const [departments, setDepartments] = useState<Department[]>([])
  const [divisions, setDivisions] = useState<Division[]>([])
  const [filteredDivisions, setFilteredDivisions] = useState<Division[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch departments and divisions
    Promise.all([
      fetch('/dashboard/performance/api/departments').then(res => res.json()),
      fetch('/dashboard/performance/api/divisions').then(res => res.json()),
    ]).then(([depts, divs]) => {
      setDepartments(depts)
      setDivisions(divs)
    }).catch(err => {
      console.error('Failed to fetch departments/divisions:', err)
    })
  }, [])

  useEffect(() => {
    // Filter divisions by selected department
    if (formData.departmentId) {
      setFilteredDivisions(divisions.filter(d => d.departmentId === formData.departmentId))
    } else {
      setFilteredDivisions(divisions)
    }
  }, [formData.departmentId, divisions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created and is pending approval by an administrator.
            You will be notified once your account is approved.
          </p>
          <Link href="/auth/signin">
            <Button className="w-full bg-[#1e4d8b] hover:bg-[#163a6b]">
              Return to Sign In
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-[#7f1010] via-[#c62828] to-[#ef4444] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center">
              <Image
                src="/nored-logo.svg"
                alt="NORED Logo"
                width={48}
                height={48}
                className="w-auto h-auto object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">NORED</h1>
              <p className="text-red-100 text-sm">Electricity For Development</p>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold mb-4 leading-tight">
            Join Our<br />Strategy Tracking System
          </h2>
          <p className="text-red-100 text-lg mb-8">
            Register to collaborate on strategic goals and monitor progress across the organization.
          </p>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex justify-center mb-8">
              <div className="w-20 h-20 flex items-center justify-center">
                <Image
                  src="/nored-logo.svg"
                  alt="NORED Logo"
                  width={80}
                  height={80}
                  className="w-auto h-auto object-contain"
                  priority
                />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-600">Register for access to the Strategy Tracking System</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d8b] focus:border-transparent transition"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d8b] focus:border-transparent transition"
                  placeholder="john@nsa.org.na"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d8b] focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e4d8b] focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                  Role *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => {
                    setFormData({...formData, role: value, departmentId: '', divisionId: ''})
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="EXECUTIVE">Executive</SelectItem>
                    <SelectItem value="ADMINISTRATIVE_ASSISTANT">Administrative Assistant</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Select your position in the organization</p>
              </div>

              {/* Show Department field for Executives */}
              {['EXECUTIVE', 'DEPUTY_SG'].includes(formData.role) && (
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                    Department *
                  </Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(value) => {
                      setFormData({...formData, departmentId: value})
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Show Department and Division fields for Staff/Manager/Admin Assistant */}
              {['STAFF', 'MANAGER', 'ADMINISTRATIVE_ASSISTANT'].includes(formData.role) && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-sm font-medium text-gray-700">
                      Department *
                    </Label>
                    <Select
                      value={formData.departmentId}
                      onValueChange={(value) => {
                        setFormData({...formData, departmentId: value, divisionId: ''})
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select your department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="division" className="text-sm font-medium text-gray-700">
                      Division *
                    </Label>
                    <Select
                      value={formData.divisionId}
                      onValueChange={(value) => setFormData({...formData, divisionId: value})}
                      disabled={!formData.departmentId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={formData.departmentId ? "Select your division" : "Select department first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredDivisions.map((div) => (
                          <SelectItem key={div.id} value={div.id}>
                            {div.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#1e4d8b] hover:bg-[#163a6b] text-white py-3 rounded-lg font-medium transition-colors" 
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-[#1e4d8b] hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
