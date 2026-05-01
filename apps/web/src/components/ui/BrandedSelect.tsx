'use client'

import { useEffect, useId, useRef, useState } from 'react'

interface BrandedSelectOption {
  label: string
  value: string
}

interface BrandedSelectProps {
  defaultValue: string
  name: string
  options: BrandedSelectOption[]
}

export function BrandedSelect({ defaultValue, name, options }: BrandedSelectProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <div className="auth-select" data-name={name} ref={rootRef}>
      <input name={name} type="hidden" value={selectedOption.value} />
      <button
        aria-controls={id}
        aria-expanded={isOpen}
        className="auth-select__button"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>{selectedOption.label}</span>
        <i aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="auth-select__menu" id={id} role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === selectedOption.value}
              className="auth-select__option"
              data-selected={option.value === selectedOption.value}
              key={option.value}
              onClick={() => {
                setValue(option.value)
                setIsOpen(false)
              }}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
