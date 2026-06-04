export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-primary text-primary-foreground py-3 border-t shrink-0">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <p className="text-xs">
            This Performance Management System is developed by{' '}
            <span className="font-semibold">NSA</span>. All rights reserved © {currentYear}.
          </p>
        </div>
      </div>
    </footer>
  )
}
