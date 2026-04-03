import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useTranslation()
  return (
    <div className="relative flex items-center bg-surface-high rounded-full px-4 py-2.5 transition-all duration-300 focus-within:bg-surface-lowest focus-within:shadow-[inset_0_0_0_1px_rgba(192,90,62,0.2)]">
      <Search className="text-outline h-4 w-4 mr-3 shrink-0" />
      <Input
        type="search"
        placeholder={t("recipes.searchPlaceholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search recipes"
        className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none w-full text-base md:text-sm font-body placeholder:text-outline p-0 h-auto"
      />
    </div>
  )
}
