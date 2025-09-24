import * as React from "react"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface TagInputProps {
  value?: string[]
  onChange?: (tags: string[]) => void
  placeholder?: string
  className?: string
}

const TagInput = React.forwardRef<HTMLDivElement, TagInputProps>(
  ({ value = [], onChange, placeholder = "Digite e pressione Enter", className }, ref) => {
    const [inputValue, setInputValue] = React.useState("")

    const addTag = (tag: string) => {
      const trimmedTag = tag.trim()
      console.log('DEBUG TagInput addTag:', { tag, trimmedTag, currentValue: value });
      if (trimmedTag && !value.includes(trimmedTag)) {
        const newValue = [...value, trimmedTag];
        console.log('DEBUG TagInput calling onChange with:', newValue);
        onChange?.(newValue)
        setInputValue("")
      }
    }

    const removeTag = (indexToRemove: number) => {
      const newValue = value.filter((_, index) => index !== indexToRemove);
      console.log('DEBUG TagInput removeTag:', { indexToRemove, newValue });
      onChange?.(newValue)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        addTag(inputValue)
      } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
        removeTag(value.length - 1)
      }
    }

    return (
      <div
        ref={ref}
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
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
          />
        </div>
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addTag(inputValue)}
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