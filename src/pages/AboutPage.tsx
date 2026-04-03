import { useTranslation } from "react-i18next"
import { Heart } from "lucide-react"

const BASE = import.meta.env.BASE_URL

export function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="pb-12">
      {/* Hero image — full width, tall, with overlay */}
      <div className="relative overflow-hidden h-[60vh] sm:h-[70vh]">
        <img
          src={`${BASE}images/nonna.jpg`}
          alt="Mains de nonna pétrir la pâte"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-background" />
        {/* Title over image */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
          <h1 className="font-headline text-4xl sm:text-5xl font-bold text-white tracking-[-0.03em] leading-tight drop-shadow-lg">
            La nostra cucina
          </h1>
          <span className="font-body text-white/70 text-[10px] uppercase tracking-[0.25em] block mt-2">
            {t("nav.about")}
          </span>
        </div>
      </div>

      {/* Content card that overlaps the image bottom */}
      <div className="relative -mt-4 mx-4 bg-background rounded-[1.5rem] px-6 pt-8 pb-8 shadow-lg">
        <p className="text-base leading-relaxed text-foreground mb-5">
          {t("about.intro")}
        </p>

        <p className="text-base leading-relaxed text-foreground mb-8">
          {t("about.story")}
        </p>

        <p className="font-headline text-xl text-primary font-bold tracking-[-0.02em] mb-8 border-l-2 border-primary pl-4 italic">
          Benvenuti nella mia cucina, buon appetito.
        </p>

        <div className="border-t border-border pt-5 flex items-start gap-3">
          <div className="text-sm text-muted-foreground">
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
            <p className="text-[10px] text-muted-foreground/50 mt-3">
              Photo by{" "}
              <a
                href="https://pixabay.com/users/9497625-9497625/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                9497625
              </a>{" "}
              from{" "}
              <a
                href="https://pixabay.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Pixabay
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
