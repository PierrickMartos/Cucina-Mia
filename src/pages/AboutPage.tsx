import { useTranslation } from "react-i18next"
import { Heart } from "lucide-react"

export function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="px-6 py-8 max-w-xl mx-auto">
      <h1 className="font-headline text-3xl font-bold text-primary tracking-[-0.02em] mb-1">
        La nostra cucina
      </h1>
      <span className="font-body text-secondary text-[10px] uppercase tracking-[0.2em] block mb-8">
        {t("nav.about")}
      </span>

      <p className="text-base leading-relaxed text-foreground mb-6">
        {t("about.intro")}
      </p>

      <p className="text-base leading-relaxed text-foreground mb-10">
        {t("about.story")}
      </p>

      <p className="font-headline text-xl text-primary font-bold tracking-[-0.02em] mb-10">
        Benvenuti nella mia cucina, buon appetito.
      </p>

      <div className="border-t border-border pt-6 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5 flex-wrap">
          {t("about.thanks")}&nbsp;
          <a
            href="https://github.com/rouliane"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
          >
            <Heart className="h-3 w-3" />
            @rouliane
          </a>
        </p>
      </div>
    </div>
  )
}
