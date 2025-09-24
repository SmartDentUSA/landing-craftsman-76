import * as React from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxProps {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  allowCreate?: boolean
  createText?: string
  className?: string
}

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Selecione uma opção...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhuma opção encontrada.",
  allowCreate = true,
  createText = "Criar",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options
    return options.filter(option =>
      option.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [options, searchValue])

  const isExistingOption = options.includes(value)
  const canCreateNew = allowCreate && searchValue && !options.includes(searchValue)

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setSearchValue("")
  }

  const handleCreateNew = () => {
    if (canCreateNew) {
      onValueChange(searchValue)
      setOpen(false)
      setSearchValue("")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && !isExistingOption && (
              <span className="text-xs text-muted-foreground">(nova)</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground">{emptyText}</p>
                {canCreateNew && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8"
                    onClick={handleCreateNew}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {createText} "{searchValue}"
                  </Button>
                )}
              </div>
            </CommandEmpty>
            
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {canCreateNew && filteredOptions.length > 0 && (
              <>
                <hr className="my-1" />
                <CommandGroup>
                  <CommandItem onSelect={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    {createText} "{searchValue}"
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}