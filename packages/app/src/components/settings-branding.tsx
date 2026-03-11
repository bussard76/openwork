import { Component, createSignal, Show, type JSX } from "solid-js"
import { useSettings } from "@/context/settings"

export const SettingsBranding: Component = () => {
  const settings = useSettings()

  const [logoPreviewError, setLogoPreviewError] = createSignal(false)

  const logoUrl = () => settings.branding.logoUrl()
  const companyName = () => settings.branding.companyName()
  const accentColor = () => settings.branding.accentColor()

  return (
    <div class="flex flex-col gap-6 p-6">
      <div>
        <h2 class="text-16-medium text-text-strong mb-1">Branding</h2>
        <p class="text-13-regular text-text-weak">
          Personalisiere das Erscheinungsbild von OpenWork mit deinem Firmenlogo und deinen Farben.
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="text-14-medium text-text-strong pb-2">Firmenidentität</h3>
        <div class="bg-surface-raised-base px-4 rounded-lg">
          <BrandingRow title="Firmenname" description="Wird oben in der Seitenleiste angezeigt">
            <input
              type="text"
              value={companyName()}
              placeholder="Meine Firma GmbH"
              onInput={(e) => settings.branding.setCompanyName(e.currentTarget.value)}
              class="h-8 px-3 rounded-md bg-surface-base text-14-regular text-text-strong border border-border-base focus:outline-none focus:border-accent-base placeholder:text-text-weak min-w-[200px]"
            />
          </BrandingRow>

          <BrandingRow
            title="Logo-URL"
            description="URL zu einem Bild (PNG, SVG, JPG) — wird neben dem Firmennamen angezeigt"
          >
            <input
              type="text"
              value={logoUrl()}
              placeholder="https://example.com/logo.png"
              onInput={(e) => {
                setLogoPreviewError(false)
                settings.branding.setLogoUrl(e.currentTarget.value)
              }}
              class="h-8 px-3 rounded-md bg-surface-base text-14-regular text-text-strong border border-border-base focus:outline-none focus:border-accent-base placeholder:text-text-weak min-w-[200px]"
            />
          </BrandingRow>

          <Show when={logoUrl() && !logoPreviewError()}>
            <div class="py-3 border-b border-border-weak-base last:border-none">
              <div class="flex flex-col gap-1">
                <span class="text-13-medium text-text-weak">Vorschau</span>
                <div class="flex items-center gap-3 p-3 bg-background-stronger rounded-lg w-fit">
                  <img
                    src={logoUrl()}
                    alt="Logo"
                    class="h-8 w-auto object-contain"
                    onError={() => setLogoPreviewError(true)}
                  />
                  <Show when={companyName()}>
                    <span class="text-14-medium text-text-strong">{companyName()}</span>
                  </Show>
                </div>
              </div>
            </div>
          </Show>

          <Show when={logoPreviewError()}>
            <div class="py-3 border-b border-border-weak-base last:border-none">
              <span class="text-13-regular text-text-danger">Logo konnte nicht geladen werden. Bitte URL prüfen.</span>
            </div>
          </Show>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="text-14-medium text-text-strong pb-2">Farben</h3>
        <div class="bg-surface-raised-base px-4 rounded-lg">
          <BrandingRow
            title="Akzentfarbe"
            description="Überschreibt die primäre Akzentfarbe der App (CSS-Hex, z.B. #3b82f6)"
          >
            <div class="flex items-center gap-2">
              <input
                type="color"
                value={accentColor() || "#6366f1"}
                onInput={(e) => settings.branding.setAccentColor(e.currentTarget.value)}
                class="h-8 w-10 rounded cursor-pointer border border-border-base bg-transparent p-0.5"
              />
              <input
                type="text"
                value={accentColor()}
                placeholder="#6366f1"
                onInput={(e) => settings.branding.setAccentColor(e.currentTarget.value)}
                class="h-8 px-3 rounded-md bg-surface-base text-14-regular text-text-strong border border-border-base focus:outline-none focus:border-accent-base placeholder:text-text-weak w-28 font-mono"
              />
              <Show when={accentColor()}>
                <button
                  onClick={() => settings.branding.setAccentColor("")}
                  class="text-12-regular text-text-weak hover:text-text-base transition-colors"
                >
                  Zurücksetzen
                </button>
              </Show>
            </div>
          </BrandingRow>
        </div>
      </div>
    </div>
  )
}

const BrandingRow = (props: { title: string; description: string; children: JSX.Element }) => (
  <div class="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border-weak-base last:border-none">
    <div class="flex flex-col gap-0.5 min-w-0">
      <span class="text-14-medium text-text-strong">{props.title}</span>
      <span class="text-12-regular text-text-weak">{props.description}</span>
    </div>
    <div class="flex-shrink-0">{props.children}</div>
  </div>
)
