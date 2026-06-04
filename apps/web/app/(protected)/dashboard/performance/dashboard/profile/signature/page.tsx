'use client'

import { toast } from "@/hooks/use-toast";

import { useState, useEffect } from 'react'
import { useSession } from '@/lib/pms-auth-adapter'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Trash2, CheckCircle, User } from 'lucide-react'
import Image from 'next/image'

export default function SignaturePage() {
  const { data: session } = useSession()
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [imageZoom, setImageZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    fetchSignature()
    fetchProfilePicture()
  }, [])

  const fetchSignature = async () => {
    try {
      const res = await fetch('/dashboard/performance/api/user/signature')
      const data = await res.json()
      setSignatureUrl(data.signatureUrl)
    } catch (error) {
      console.error('Error fetching signature:', error)
    }
  }

  const fetchProfilePicture = async () => {
    try {
      const res = await fetch('/dashboard/performance/api/user/profile-picture')
      const data = await res.json()
      setProfilePicture(data.profilePicture)
    } catch (error) {
      console.error('Error fetching profile picture:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFileName(file.name)
      setPreviewError(false)
      
      // Check if it's a format that browsers can preview
      const previewableTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp']
      const isPreviewable = previewableTypes.includes(file.type.toLowerCase())
      
      if (isPreviewable) {
        // Show preview for supported formats
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        // HEIC and other unsupported formats - can't preview but can still upload
        setPreviewUrl(null)
        setPreviewError(true)
      }
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const fileInput = document.getElementById('signature-file') as HTMLInputElement
    const file = fileInput?.files?.[0]

    if (!file) {
      toast({ title: 'Please select a file', variant: 'destructive' })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('signature', file)

      const res = await fetch('/dashboard/performance/api/user/signature', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        setSignatureUrl(data.signatureUrl)
        setPreviewUrl(null)
        toast({ title: 'Signature uploaded successfully!' })
      } else {
        toast({ title: data.error || 'Failed to upload signature', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error uploading signature:', error)
      toast({ title: 'Failed to upload signature', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your signature?')) return

    try {
      const res = await fetch('/dashboard/performance/api/user/signature', {
        method: 'DELETE'
      })

      if (res.ok) {
        setSignatureUrl(null)
        toast({ title: 'Signature deleted successfully' })
      } else {
        toast({ title: 'Failed to delete signature', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting signature:', error)
      toast({ title: 'Failed to delete signature', variant: 'destructive' })
    }
  }

  const handleProfileFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePreviewUrl(reader.result as string)
        // Reset position and zoom when new image is selected
        setImagePosition({ x: 0, y: 0 })
        setImageZoom(1)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageZoom(parseFloat(e.target.value))
  }

  const handleProfileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const fileInput = document.getElementById('profile-picture-file') as HTMLInputElement
    const file = fileInput?.files?.[0]

    if (!file) {
      toast({ title: 'Please select a file', variant: 'destructive' })
      return
    }

    setUploadingProfile(true)
    try {
      // Create a canvas to crop the image based on position and zoom
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new window.Image()
      
      img.onload = async () => {
        // Set canvas size to desired output (square)
        const size = 400
        canvas.width = size
        canvas.height = size
        
        if (ctx) {
          // Fill with white background
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, size, size)
          
          // Create circular clipping path
          ctx.save()
          ctx.beginPath()
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          
          // Calculate dimensions to fit image in circle
          const minDimension = Math.min(img.width, img.height)
          const scale = (size / minDimension) * imageZoom
          
          const scaledWidth = img.width * scale
          const scaledHeight = img.height * scale
          
          // Calculate center position
          const centerX = size / 2
          const centerY = size / 2
          
          // Apply position offset (scale from preview to canvas)
          // Preview is 192px (w-48), canvas is 400px
          const scaleRatio = size / 192
          const offsetX = imagePosition.x * scaleRatio
          const offsetY = imagePosition.y * scaleRatio
          
          // Draw image centered with offset
          ctx.drawImage(
            img,
            centerX - scaledWidth / 2 + offsetX,
            centerY - scaledHeight / 2 + offsetY,
            scaledWidth,
            scaledHeight
          )
          
          ctx.restore()
        }
        
        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: 'Failed to process image', variant: 'destructive' })
            setUploadingProfile(false)
            return
          }
          
          const formData = new FormData()
          formData.append('profilePicture', blob, 'profile.png')

          const res = await fetch('/dashboard/performance/api/user/profile-picture', {
            method: 'POST',
            body: formData
          })

          const data = await res.json()

          if (res.ok) {
            setProfilePicture(data.profilePicture)
            setProfilePreviewUrl(null)
            setImagePosition({ x: 0, y: 0 })
            setImageZoom(1)
            toast({ title: 'Profile picture uploaded successfully!' })
            window.location.reload()
          } else {
            toast({ title: data.error || 'Failed to upload profile picture', variant: 'destructive' })
          }
          setUploadingProfile(false)
        }, 'image/png')
      }
      
      img.src = profilePreviewUrl || ''
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      toast({ title: 'Failed to upload profile picture', variant: 'destructive' })
      setUploadingProfile(false)
    }
  }

  const handleProfileDelete = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?')) return

    try {
      const res = await fetch('/dashboard/performance/api/user/profile-picture', {
        method: 'DELETE'
      })

      if (res.ok) {
        setProfilePicture(null)
        toast({ title: 'Profile picture deleted successfully' })
        window.location.reload()
      } else {
        toast({ title: 'Failed to delete profile picture', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error)
      toast({ title: 'Failed to delete profile picture', variant: 'destructive' })
    }
  }

  return (
    <div className="w-full px-6 py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight mb-6">Profile Settings</h1>
      
      {/* Profile Picture Section */}
      <Card className="p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Profile Picture</h2>
          <p className="text-gray-600 text-sm">
            Upload your profile picture to personalize your account.
          </p>
        </div>

        {profilePicture ? (
          <div className="space-y-4">
            <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Profile Picture Active</span>
              </div>
              <div className="bg-white p-4 rounded border inline-block">
                <div className="relative w-37.5 h-37.5">
                  <Image
                    src={profilePicture}
                    alt="Your profile picture"
                    fill
                    className="object-cover rounded-full"
                    sizes="150px"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={handleProfileDelete}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Profile Picture
            </Button>
          </div>
        ) : (
          <form onSubmit={handleProfileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Profile Picture
              </label>
              <input
                id="profile-picture-file"
                name="profile-picture"
                type="file"
                accept="image/*"
                onChange={handleProfileFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: PNG, JPG, GIF. Max size: 5MB. Square images work best.
              </p>
            </div>

            {profilePreviewUrl && (
              <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                <p className="text-sm font-medium">Adjust Position & Zoom:</p>
                
                {/* Preview Container */}
                <div className="flex flex-col items-center gap-4">
                  <div 
                    className="relative w-48 h-48 bg-white rounded-full border-2 border-gray-300 overflow-hidden cursor-move"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img
                      src={profilePreviewUrl}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageZoom})`,
                        transformOrigin: 'center',
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}
                      draggable={false}
                    />
                  </div>
                  
                  {/* Zoom Control */}
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Zoom</span>
                      <span className="font-medium">{Math.round(imageZoom * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={imageZoom}
                      onChange={handleZoomChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Reset Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImagePosition({ x: 0, y: 0 })
                      setImageZoom(1)
                    }}
                  >
                    Reset Position
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500 text-center">
                  Drag the image to reposition • Use the slider to zoom
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={uploadingProfile}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploadingProfile ? 'Uploading...' : 'Upload Profile Picture'}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-2">Tips for a good profile picture:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Use a clear, recent photo of yourself</li>
            <li>Face the camera directly with good lighting</li>
            <li>Square images (1:1 ratio) work best</li>
            <li>Professional attire recommended</li>
            <li>Avoid group photos or busy backgrounds</li>
          </ul>
        </div>
      </Card>

      {/* Digital Signature Section */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Digital Signature</h2>
          <p className="text-gray-600 text-sm">
            Upload your signature to digitally sign performance agreements and other official documents.
          </p>
        </div>

        {signatureUrl ? (
          <div className="space-y-4">
            <div className="border-2 border-green-500 rounded-lg p-4 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">Signature Active</span>
              </div>
              <div className="bg-white p-4 rounded border inline-block">
                <Image
                  src={signatureUrl}
                  alt="Your signature"
                  width={300}
                  height={100}
                  style={{ height: 'auto', maxHeight: '6rem' }}
                  className="object-contain"
                />
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={handleDelete}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Signature
            </Button>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Signature Image
              </label>
              <input
                id="signature-file"
                name="signature"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: PNG, JPG, GIF, HEIC. Max size: 20MB. Transparent background recommended.
              </p>
            </div>

            {(previewUrl || previewError) && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="text-sm font-medium mb-2">Preview:</p>
                {previewUrl ? (
                  <div className="bg-white p-4 rounded border inline-block">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ maxHeight: '6rem', height: 'auto', width: 'auto' }}
                      className="object-contain"
                    />
                  </div>
                ) : previewError && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-sm">
                    <p className="font-medium text-yellow-800">📁 {selectedFileName}</p>
                    <p className="text-yellow-700 mt-1">
                      Preview not available for this file format (HEIC/HEIF). 
                      The file will be converted when uploaded.
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={uploading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Signature'}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t">
          <h3 className="font-semibold mb-2">Tips for a good signature:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Sign on white paper with a black pen</li>
            <li>Take a clear photo or scan your signature</li>
            <li>Crop the image to show only the signature</li>
            <li>Use transparent background (PNG) for best results</li>
            <li>Ensure the signature is clear and legible</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
