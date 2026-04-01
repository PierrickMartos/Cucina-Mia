import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex items-center bg-surface-high rounded-full px-4 py-2 transition-all duration-300 focus-within:bg-card focus-within:ring-1 focus-within:ring-primary/20">
      <Search className="text-outline h-4 w-4 mr-3 shrink-0" />
      <Input
        type="search"
        placeholder="Cerca ricette..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full text-sm font-body placeholder:text-outline p-0 h-auto"
      />
    </div>
  )
}
