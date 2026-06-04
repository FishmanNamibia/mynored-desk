'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type Option = {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search..."
          className="mb-2"
        />
        {selected.length > 0 && (
          <button
            type="button"
            className="w-full mb-2 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md transition"
            onClick={() => onChange([])}
          >
            Clear All ({selected.length})
          </button>
        )}
        <div className="space-y-1 max-h-44 overflow-y-auto">
          {filteredOptions.length === 0 && (
            <p className="text-sm text-muted-foreground">No options found.</p>
          )}
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition',
                selected.includes(option.value)
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/70'
              )}
              onClick={() => handleSelect(option.value)}
            >
              <span>{option.label}</span>
              <Check
                className={cn(
                  'h-4 w-4 transition-opacity',
                  selected.includes(option.value) ? 'opacity-100' : 'opacity-0'
                )}
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

