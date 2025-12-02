import * as React from "react"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface TagInputHandle {
  commitPending: () => void
  getPendingValue: () => string
  clear: () => void
}

export interface TagInputProps {
  value?: string[]
  onChange?: (tags: string[]) => void
  placeholder?: string
  className?: string
}

const TagInput = React.forwardRef<TagInputHandle, TagInputProps>(
  ({ value = [], onChange, placeholder = "Digite separado por vírgula", className }, ref) => {
    const [inputValue, setInputValue] = React.useState("")

    const addTags = (input: string) => {
      // Aceita vírgula, ponto-e-vírgula ou Enter como separadores
      const tags = input.split(/[,;]+/).map(t => t.trim()).filter(Boolean)
      const newTags = tags.filter(tag => !value.includes(tag))
      
      if (newTags.length > 0) {
        onChange?.([...value, ...newTags])
      }
      setInputValue("")
    }

    const addTag = (tag: string) => {
      const trimmedTag = tag.trim()
      if (trimmedTag && !value.includes(trimmedTag)) {
        onChange?.([...value, trimmedTag])
        setInputValue("")
      }
    }

    const removeTag = (indexToRemove: number) => {
      const newValue = value.filter((_, index) => index !== indexToRemove);
      onChange?.(newValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault()
        addTags(inputValue)
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        removeTag(value.length - 1)
      }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pastedText = e.clipboardData.getData('text')
      addTags(pastedText)
    }

    React.useImperativeHandle(ref, () => ({
      commitPending: () => {
        if (inputValue.trim()) {
          addTags(inputValue)
        }
      },
      getPendingValue: () => inputValue,
      clear: () => setInputValue("")
    }), [inputValue, addTags])

    return (
      <div
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          className
        )}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {value.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-primary/10 text-primary border-primary/20"
            >
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-1 h-auto p-0 text-primary hover:bg-primary/20"
                onClick={() => removeTag(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => {
              if (inputValue.trim()) {
                addTags(inputValue)
              }
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
          />
        </div>
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addTags(inputValue)}
            className="ml-2 h-auto p-1"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }
)

TagInput.displayName = "TagInput"

export { TagInput }