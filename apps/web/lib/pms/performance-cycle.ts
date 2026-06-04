/**
 * Utility functions for calculating the current performance cycle/fiscal year
 * The fiscal year runs from April to March (e.g., 2025/26 = April 2025 - March 2026)
 */

/**
 * Get the current performance cycle in format "YYYY/YY"
 * @returns Current performance cycle (e.g., "2025/26")
 */
export function getCurrentPerformanceCycle(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  
  // Fiscal year runs Apr-Mar, so if we're in Jan-Mar, it's the previous fiscal year
  const fiscalYear = month >= 4 ? year : year - 1
  const nextYear = fiscalYear + 1
  
  return `${fiscalYear}/${nextYear.toString().slice(-2)}`
}

/**
 * Get the current performance cycle in long format "YYYY - YYYY"
 * @returns Current performance cycle (e.g., "2025 - 2026")
 */
export function getCurrentPerformanceCycleLong(): string {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  
  // Fiscal year runs Apr-Mar, so if we're in Jan-Mar, it's the previous fiscal year
  const fiscalYear = month >= 4 ? year : year - 1
  const nextYear = fiscalYear + 1
  
  return `${fiscalYear} - ${nextYear}`
}

/**
 * Get the full performance cycle description
 * @returns Performance cycle with label (e.g., "2025 - 2026 Performance Management Cycle")
 */
export function getPerformanceCycleDescription(): string {
  return `${getCurrentPerformanceCycleLong()} Performance Management Cycle`
}

/**
 * Get the fiscal year start date for the current cycle
 * @returns Date object for April 1st of the current fiscal year
 */
export function getCurrentFiscalYearStart(): Date {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  
  // Fiscal year runs Apr-Mar
  const fiscalYear = month >= 4 ? year : year - 1
  
  return new Date(fiscalYear, 3, 1) // April 1st (month is 0-indexed)
}

/**
 * Get the fiscal year end date for the current cycle
 * @returns Date object for March 31st of the next year
 */
export function getCurrentFiscalYearEnd(): Date {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  
  // Fiscal year runs Apr-Mar
  const fiscalYear = month >= 4 ? year : year - 1
  const nextYear = fiscalYear + 1
  
  return new Date(nextYear, 2, 31) // March 31st (month is 0-indexed)
}

/**
 * Get an array of upcoming performance cycles
 * @param count Number of cycles to return (default: 4)
 * @returns Array of performance cycles (e.g., ["2025/26", "2026/27", "2027/28", "2028/29"])
 */
export function getUpcomingPerformanceCycles(count: number = 4): string[] {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  
  const fiscalYear = month >= 4 ? year : year - 1
  
  const cycles: string[] = []
  for (let i = 0; i < count; i++) {
    const startYear = fiscalYear + i
    const endYear = startYear + 1
    cycles.push(`${startYear}/${endYear.toString().slice(-2)}`)
  }
  
  return cycles
}
