export function getCurrentFinancialYear(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1 // 0-indexed

  // NSA financial year runs April to March
  if (month >= 4) {
    return `FY ${year}/${year + 1}`
  } else {
    return ` ${year - 1}/${year}`
  }
}

export function getFinancialYearStartDate(): Date {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  if (month >= 4) {
    return new Date(year, 3, 1) // April 1st of current year
  } else {
    return new Date(year - 1, 3, 1) // April 1st of previous year
  }
}

export function getFinancialYearEndDate(): Date {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  if (month >= 4) {
    return new Date(year + 1, 2, 31) // March 31st of next year
  } else {
    return new Date(year, 2, 31) // March 31st of current year
  }
}

export function getDaysLeftInFinancialYear(): number {
  const today = new Date()
  const endDate = getFinancialYearEndDate()
  const diffTime = endDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
