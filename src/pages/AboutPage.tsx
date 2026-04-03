import { useTranslation } from "react-i18next"
import { Heart } from "lucide-react"

const BASE = import.meta.env.BASE_URL

export function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="pb-12">
      {/* Full-width hero */}
      <div className="relative overflow-hidden h-[55vh] sm:h-[65vh]">
        <img
          src={`${BASE}images/nonna.jpg`}
          alt="Nonna making pasta"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Gradient: dark top-left for text legibility, fades to cream at bottom */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

        {/* Hero title */}
        <div className="absolute bottom-12 left-6 sm:left-10">
          <p className="text-white/60 text-[10px] uppercase tracking-[0.25em] font-body mb-2">
            {t("nav.about")}
          </p>
          <h1 className="font-headline font-bold leading-[1.05] drop-shadow-lg">
            <span className="block text-4xl sm:text-6xl text-white">
              {t("about.heroTitle")}
            </span>
            <span className="block text-4xl sm:text-6xl text-amber-200 italic">
              {t("about.heroTitleItalic")}
            </span>
          </h1>
        </div>
      </div>

      {/* Story section */}
      <div className="px-6 sm:px-10 pt-10 pb-4">
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 items-start max-w-3xl mx-auto">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <h2 className="font-headline text-2xl sm:text-3xl font-bold text-primary tracking-[-0.02em] mb-5">
              {t("about.heirloomTitle")}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-foreground/80 mb-4">
              {t("about.intro")}
            </p>
            <p className="text-sm sm:text-base leading-relaxed text-foreground/80">
              {t("about.story")}
            </p>
          </div>

          {/* Right: image */}
          <div className="w-full sm:w-64 shrink-0">
            <img
              src={`${BASE}images/about-side.jpg`}
              alt="Fresh basil"
              className="w-full rounded-2xl shadow-ambient object-cover aspect-[4/3] sm:aspect-auto sm:h-64"
            />
          </div>
        </div>
      </div>

      {/* Closing quote */}
      <div className="px-6 sm:px-10 py-8 max-w-3xl mx-auto">
        <p className="font-headline text-xl sm:text-2xl text-primary font-bold tracking-[-0.02em] italic border-l-2 border-primary/40 pl-5">
          Benvenuti nella mia cucina, buon appetito.
        </p>
      </div>

      {/* Footer credits */}
      <div className="px-6 sm:px-10 max-w-3xl mx-auto pt-6 flex flex-col gap-3">
        <div className="bg-surface-high rounded-2xl p-5">
          <p className="text-sm text-foreground font-medium mb-1">
            {t("about.thanks")}{" "}
            <a
              href="https://github.com/rouliane"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
            >
              <Heart className="h-3.5 w-3.5" />
              @rouliane
            </a>
          </p>
          <p className="text-sm text-muted-foreground">{t("about.thanksDetail")}</p>
        </div>
        <p className="text-[10px] text-muted-foreground/40">
          Photos by{" "}
          <a href="https://pixabay.com/users/stocksnap-894430/" target="_blank" rel="noopener noreferrer" className="underline">StockSnap</a>
          {" "}&{" "}
          <a href="https://pixabay.com/users/tookapic-1386461/" target="_blank" rel="noopener noreferrer" className="underline">tookapic</a>
          {" "}from{" "}
          <a href="https://pixabay.com/" target="_blank" rel="noopener noreferrer" className="underline">Pixabay</a>
        </p>
      </div>
    </div>
  )
}
