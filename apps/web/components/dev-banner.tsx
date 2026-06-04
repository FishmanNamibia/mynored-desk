"use client";

export function DevBanner() {
  if (process.env.NEXT_PUBLIC_APP_ENV !== "dev") return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-400 py-1 text-xs font-bold text-amber-900 shadow-md">
        <span>⚠</span>
        <span>DEV ENVIRONMENT — Changes here may be overwritten. Not for production use.</span>
        <span>⚠</span>
      </div>
      <div className="h-7" />
    </>
  );
}
