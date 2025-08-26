import * as React from "react"
import { Check, X, Loader2, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"
import { useURLValidation } from "@/hooks/useURLValidation"

interface URLInputProps extends React.ComponentProps<"input"> {
  validationKey: string
}

const URLInput = React.forwardRef<HTMLInputElement, URLInputProps>(
  ({ className, validationKey, onChange, ...props }, ref) => {
    const { validateURL, getValidationStatus } = useURLValidation()
    const validation = getValidationStatus(validationKey)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      validateURL(validationKey, value)
      onChange?.(e)
    }

    const getStatusIcon = () => {
      switch (validation.status) {
        case 'valid':
          return <Check className="h-4 w-4 text-green-600" />
        case 'invalid':
          return <X className="h-4 w-4 text-red-600" />
        case 'validating':
          return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
        case 'empty':
        default:
          return <Link2 className="h-4 w-4 text-muted-foreground" />
      }
    }

    const getBorderColor = () => {
      switch (validation.status) {
        case 'valid':
          return 'border-green-500 focus-visible:ring-green-500'
        case 'invalid':
          return 'border-red-500 focus-visible:ring-red-500'
        case 'validating':
          return 'border-yellow-500 focus-visible:ring-yellow-500'
        default:
          return ''
      }
    }

    const icon = getStatusIcon()

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          onChange={handleChange}
          className={cn(
            "pr-10",
            getBorderColor(),
            className
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validation.status !== 'empty' && validation.message ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    {icon}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">{validation.message}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            icon
          )}
        </div>
      </div>
    )
  }
)

URLInput.displayName = "URLInput"

export { URLInput }