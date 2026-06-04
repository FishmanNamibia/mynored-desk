"use client";

import { useAuth } from "@/lib/auth-context";
import {
  useUserPreferences,
  accentColors,
  wallpapers,
} from "@/lib/user-preferences";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, CheckCircle, Plus } from "lucide-react";
import Image from "next/image";
import { colors } from "@/app/ui-standards";
import { toast } from "@/hooks/use-toast";

export default function DashboardSettingsPage() {
  const { user } = useAuth();
  const { preferences, updatePreferences, resetPreferences } =
    useUserPreferences();

  // Signature state
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Profile picture state
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null,
  );
  const [profilePictureUploading, setProfilePictureUploading] = useState(false);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(
    null,
  );
  const [profilePreviewError, setProfilePreviewError] = useState(false);
  const [selectedProfileFileName, setSelectedProfileFileName] = useState<
    string | null
  >(null);
  const [showProfileUpload, setShowProfileUpload] = useState(false);

  useEffect(() => {
    fetchSignature();
    fetchProfilePicture();
  }, [user]);

  const fetchProfilePicture = async () => {
    try {
      const res = await fetch(
        "/dashboard/performance/api/user/profile-picture",
      );
      if (res.ok) {
        const data = await res.json();
        if (data.profilePictureUrl) {
          setProfilePictureUrl(data.profilePictureUrl);
          return;
        }
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
    }
    // Fallback to auth context
    setProfilePictureUrl((user as any)?.profilePictureUrl || null);
  };

  const fetchSignature = async () => {
    try {
      const res = await fetch("/dashboard/performance/api/user/signature");
      const data = await res.json();
      setSignatureUrl(data.signatureUrl);
    } catch (error) {
      console.error("Error fetching signature:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setPreviewError(false);

      // Check if it's a format that browsers can preview
      const previewableTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "image/bmp",
      ];
      const isPreviewable = previewableTypes.includes(file.type.toLowerCase());

      if (isPreviewable) {
        // Show preview for supported formats
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // HEIC and other unsupported formats - can't preview but can still upload
        setPreviewUrl(null);
        setPreviewError(true);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById(
      "signature-file",
    ) as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("signature", file);

      const res = await fetch("/dashboard/performance/api/user/signature", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSignatureUrl(data.signatureUrl);
        setPreviewUrl(null);
        toast({ title: "Signature uploaded successfully!" });
      } else {
        toast({
          title: data.error || "Failed to upload signature",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading signature:", error);
      toast({ title: "Failed to upload signature", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your signature?")) return;

    try {
      const res = await fetch("/dashboard/performance/api/user/signature", {
        method: "DELETE",
      });

      if (res.ok) {
        setSignatureUrl(null);
        toast({ title: "Signature deleted successfully" });
      } else {
        toast({ title: "Failed to delete signature", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting signature:", error);
      toast({ title: "Failed to delete signature", variant: "destructive" });
    }
  };

  const handleProfileFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedProfileFileName(file.name);
      setProfilePreviewError(false);

      // Check if it's a format that browsers can preview
      const previewableTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "image/bmp",
      ];
      const isPreviewable = previewableTypes.includes(file.type.toLowerCase());

      if (isPreviewable) {
        // Show preview for supported formats
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfilePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // HEIC and other unsupported formats - can't preview but can still upload
        setProfilePreviewUrl(null);
        setProfilePreviewError(true);
      }
    }
  };

  const handleProfileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = document.getElementById(
      "profile-picture-file",
    ) as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }

    setProfilePictureUploading(true);
    try {
      const formData = new FormData();
      formData.append("profilePicture", file);

      const res = await fetch(
        "/dashboard/performance/api/user/profile-picture",
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await res.json();

      if (res.ok) {
        // Update local state immediately
        setProfilePictureUrl(data.profilePictureUrl);
        setProfilePreviewUrl(null);
        setShowProfileUpload(false);
        // Reset form
        fileInput.value = "";
        setSelectedProfileFileName(null);
        toast({ title: "Profile picture updated successfully!" });
        // Reload to refresh auth context and header
        window.location.reload();
      } else {
        toast({
          title: data.error || "Failed to upload profile picture",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast({
        title: "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setProfilePictureUploading(false);
    }
  };

  const handleProfileDelete = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?"))
      return;

    try {
      const res = await fetch(
        "/dashboard/performance/api/user/profile-picture",
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        setProfilePictureUrl(null);
        toast({ title: "Profile picture removed successfully" });
        // Reload the page to ensure the image is removed from display
        window.location.reload();
      } else {
        toast({
          title: "Failed to remove profile picture",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      toast({
        title: "Failed to remove profile picture",
        variant: "destructive",
      });
    }
  };

  const resolvedDisplayName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    preferences.displayName ||
    "";

  const email = user?.email || preferences.email || "";
  const roleLabel = user?.roles?.[0] || "Standard access";
  const department = user?.department || "Administration";
  const division = user?.division || "Not set";
  const jobTitle = (user as any)?.jobTitle || "Staff Member";

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              Profile Settings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
              Manage your account details, security, and workspace preferences
              for My Desk.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Changes save automatically
            </span>
            <a
              href="/dashboard/settings/widgets/create"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Widgets
            </a>
            <a
              href="/dashboard/settings/widgets"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Manage Widgets
            </a>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              onClick={resetPreferences}
            >
              Reset defaults
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Export profile
            </button>
          </div>
        </div>

        {/* First Row: Profile, Security, Workspace - Equal Heights */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Column 1: Profile Card */}
          <div className="flex flex-col">
            <div className="widget-card p-4 space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-md bg-accent-orange text-white flex items-center justify-center text-base font-semibold shrink-0 overflow-hidden">
                  {profilePictureUrl ? (
                    <Image
                      src={profilePictureUrl}
                      alt="Profile picture"
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    resolvedDisplayName
                      .split(" ")
                      .filter(Boolean)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                  )}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {resolvedDisplayName}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {email || "No email on record"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {jobTitle}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-border/60 grid grid-cols-1 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department</span>
                  <span className="text-foreground font-medium">
                    {department}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="text-foreground font-medium">
                    {roleLabel}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileUpload(!showProfileUpload)}
                  className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  {profilePictureUrl ? "Replace Photo" : "Upload Photo"}
                </button>
                {profilePictureUrl && (
                  <button
                    type="button"
                    onClick={handleProfileDelete}
                    className="px-3 py-1.5 rounded-md border border-red-300 bg-red-50 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Profile Picture Upload Form */}
              {showProfileUpload && (
                <div className="pt-3 border-t border-border/60">
                  <form onSubmit={handleProfileUpload} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium mb-2 text-foreground">
                        Upload Profile Picture
                      </label>
                      <input
                        id="profile-picture-file"
                        name="profilePicture"
                        type="file"
                        accept="image/*"
                        onChange={handleProfileFileSelect}
                        className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:text-white hover:file:opacity-90"
                      />
                      <style>{`
                        #profile-picture-file::file-selector-button {
                          background-color: ${colors.navyLightest};
                        }
                      `}</style>
                      <p className="text-xs text-muted-foreground mt-1">
                        Accepted formats: PNG, JPG, GIF, HEIC. Max size: 10MB.
                        Square images work best.
                      </p>
                    </div>

                    {(profilePreviewUrl || profilePreviewError) && (
                      <div className="border rounded-lg p-2 bg-muted/30">
                        <p className="text-xs font-medium mb-2">Preview:</p>
                        {profilePreviewUrl ? (
                          <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-md overflow-hidden border-2 border-border">
                              <img
                                src={profilePreviewUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          profilePreviewError && (
                            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs">
                              <p className="font-medium text-yellow-800">
                                📁 {selectedProfileFileName}
                              </p>
                              <p className="text-yellow-700 mt-1">
                                Preview not available for this file format
                                (HEIC/HEIF). The file will be converted when
                                uploaded.
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={profilePictureUploading}
                        className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {profilePictureUploading
                          ? "Uploading..."
                          : "Upload Picture"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileUpload(false);
                          setProfilePreviewUrl(null);
                          setProfilePreviewError(false);
                          setSelectedProfileFileName(null);
                        }}
                        className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-foreground hover:bg-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Security Card */}
          <div className="flex flex-col">
            <div className="widget-card p-4 space-y-3 flex-1">
              <h2 className="text-sm font-semibold text-foreground">
                Security & access
              </h2>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">
                      Multi-factor auth
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Enforced by Entra ID
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">
                      Session timeout
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Token rotation
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    15 min
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">
                      Last sign-in
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Audit compliance
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {user?.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString()
                      : "Today"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Workspace Preferences */}
          <div className="flex flex-col">
            <div className="widget-card p-4 space-y-3 flex-1">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Workspace preferences
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Changes save automatically
                </p>
              </div>
              <div className="grid gap-2 text-xs">
                <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-foreground">Collapse sidebar</span>
                  <input
                    type="checkbox"
                    checked={preferences.sidebarCollapsed}
                    onChange={(event) =>
                      updatePreferences({
                        sidebarCollapsed: event.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-foreground">Show quick links</span>
                  <input
                    type="checkbox"
                    checked={preferences.showQuickLinks}
                    onChange={(event) =>
                      updatePreferences({
                        showQuickLinks: event.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 accent-primary"
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-foreground">Show news widget</span>
                  <input
                    type="checkbox"
                    checked={preferences.showNewsWidget}
                    onChange={(event) =>
                      updatePreferences({
                        showNewsWidget: event.target.checked,
                      })
                    }
                    className="h-3.5 w-3.5 accent-primary"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row: Digital Signature & Branding */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Digital Signature */}
          <div className="flex flex-col">
            <div className="widget-card p-4 space-y-4 flex-1">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Digital Signature
                </h2>
                <p className="text-xs text-muted-foreground">
                  Upload your signature to digitally sign performance agreements
                  and other official documents.
                </p>
              </div>

              {signatureUrl ? (
                <div className="space-y-4">
                  <div className="border-2 border-green-500 rounded-lg p-3 bg-green-50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-900 text-xs">
                        Signature Active
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded border inline-block">
                      <Image
                        src={signatureUrl}
                        alt="Your signature"
                        width={250}
                        height={80}
                        style={{ height: "auto", maxHeight: "4rem" }}
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="gap-2 text-xs"
                    size="sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Signature
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium mb-2">
                      Upload Signature Image
                    </label>
                    <input
                      id="signature-file"
                      name="signature"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:text-white hover:file:opacity-90"
                    />
                    <style>{`
                    #signature-file::file-selector-button {
                      background-color: ${colors.navyLightest};
                    }
                  `}</style>
                    <p className="text-xs text-gray-500 mt-1">
                      Accepted formats: PNG, JPG, GIF, HEIC. Max size: 20MB.
                      Transparent background recommended.
                    </p>
                  </div>

                  {(previewUrl || previewError) && (
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <p className="text-xs font-medium mb-2">Preview:</p>
                      {previewUrl ? (
                        <div className="bg-white p-3 rounded border inline-block">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            style={{
                              maxHeight: "4rem",
                              height: "auto",
                              width: "auto",
                            }}
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        previewError && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs">
                            <p className="font-medium text-yellow-800">
                              📁 {selectedFileName}
                            </p>
                            <p className="text-yellow-700 mt-1">
                              Preview not available for this file format
                              (HEIC/HEIF). The file will be converted when
                              uploaded.
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={uploading}
                    className="gap-2 text-xs"
                    size="sm"
                  >
                    <Upload className="w-3 h-3" />
                    {uploading ? "Uploading..." : "Upload Signature"}
                  </Button>
                </form>
              )}

              <div className="mt-4 pt-4 border-t border-border/60">
                <h3 className="font-semibold mb-2 text-xs">
                  Tips for a good signature:
                </h3>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Sign on white paper with a black pen</li>
                  <li>Take a clear photo or scan your signature</li>
                  <li>Crop the image to show only the signature</li>
                  <li>Use transparent background (PNG) for best results</li>
                  <li>Ensure the signature is clear and legible</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Branding & Personalization */}
          <div className="flex flex-col">
            <div className="widget-card p-4 space-y-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Branding & personalization
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Changes save automatically
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Reset all preferences to defaults?")) {
                      resetPreferences();
                      window.location.reload();
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="space-y-1">
                  <span className="text-muted-foreground">Theme</span>
                  <select
                    value={preferences.theme}
                    onChange={(event) =>
                      updatePreferences({
                        theme: event.target.value as
                          | "light"
                          | "dark"
                          | "system",
                      })
                    }
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-muted-foreground">Layout</span>
                  <select
                    value={preferences.dashboardLayout}
                    onChange={(event) =>
                      updatePreferences({
                        dashboardLayout: event.target.value as "grid" | "list",
                      })
                    }
                    className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                  </select>
                </label>
              </div>

              {/* Accent Color */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-xs text-muted-foreground">
                    Accent color
                  </div>
                  <div className="text-xs text-muted-foreground italic">
                    Saved as CSS variable for future use
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(accentColors).map(([key, color]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updatePreferences({ accentColor: key })}
                      className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                        preferences.accentColor === key
                          ? "ring-2 ring-offset-2 shadow-md"
                          : "border-border hover:border-border/80 hover:shadow-sm"
                      }`}
                      style={
                        preferences.accentColor === key
                          ? {
                              borderColor: color.hex,
                              backgroundColor: `${color.hex}15`,
                            }
                          : {}
                      }
                    >
                      <span
                        className="h-4 w-4 rounded-full shrink-0 ring-1 ring-black/10"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-foreground font-semibold">
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dashboard Workspace Background */}
              <div>
                <div className="text-xs text-muted-foreground mb-2.5">
                  Dashboard Workspace Background
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(wallpapers).map(([key, wallpaper]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updatePreferences({ wallpaper: key })}
                      className={`rounded-lg border-2 p-2.5 text-left transition-all ${
                        preferences.wallpaper === key
                          ? "border-primary ring-2 ring-primary/30 ring-offset-2 shadow-lg"
                          : "border-border hover:border-primary/50 hover:shadow-md"
                      }`}
                    >
                      <div
                        className="h-16 rounded-md mb-2 border border-border/50"
                        style={{
                          background:
                            wallpaper.preview ||
                            "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
                        }}
                      />
                      <div
                        className={`text-xs font-medium ${
                          preferences.wallpaper === key
                            ? "text-primary font-semibold"
                            : "text-foreground"
                        }`}
                      >
                        {wallpaper.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
