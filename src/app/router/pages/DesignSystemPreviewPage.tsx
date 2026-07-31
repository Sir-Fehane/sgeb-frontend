import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconInfoCircle,
  IconMinus,
  IconX,
} from '@tabler/icons-react'
import { useState } from 'react'

import {
  Alert,
  Badge,
  Button,
  Caption,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTitle,
  ErrorText,
  FormField,
  HelperText,
  Input,
  PageTitle,
  SectionHeading,
  Separator,
  Skeleton,
  Spinner,
  Text,
  Textarea,
} from '@/shared/components'
import { cn } from '@/shared/utils/cn'

/**
 * Development-only reference page demonstrating the design tokens and
 * foundation components built in this branch — NOT a business screen.
 * See docs/FrontendArchitecture.md for the real (still-pending) screens.
 */
export function DesignSystemPreviewPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  function simulateLoading() {
    setIsSubmitting(true)
    window.setTimeout(() => setIsSubmitting(false), 1500)
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="border-border bg-muted/40 border-b px-6 py-3 text-center">
        <Caption>Design System — Development Preview (not a production screen)</Caption>
      </div>

      <main className="mx-auto flex max-w-5xl flex-col gap-14 px-6 py-10 sm:px-8">
        <header className="flex flex-col gap-2">
          <PageTitle>SGEB frontend foundation is running</PageTitle>
          <Text className="max-w-2xl text-muted-foreground">
            This page demonstrates the tokens and reusable components from{' '}
            <code className="bg-muted rounded px-1 py-0.5">src/shared/components</code>.
            Business screens (login, dashboards, admin/capitán console, comensal
            experience) are not part of this foundation.
          </Text>
        </header>

        <section aria-labelledby="typography-heading" className="flex flex-col gap-3">
          <SectionHeading id="typography-heading">Typography</SectionHeading>
          <PageTitle>Page title — Display / H1</PageTitle>
          <SectionHeading>Section heading — H2</SectionHeading>
          <CardHeading>Card heading — H3</CardHeading>
          <Text>Body (16px) — content and descriptions across the system.</Text>
          <Text size="sm">Body, dense (14px) — for tighter layouts.</Text>
          <HelperText>Label / helper text (13px) — form hints and labels.</HelperText>
          <Caption>Caption (12px) — the smallest supporting copy.</Caption>
          <ErrorText>Error text — shown under an invalid field.</ErrorText>
        </section>

        <section aria-labelledby="colors-heading" className="flex flex-col gap-4">
          <SectionHeading id="colors-heading">Color tokens</SectionHeading>
          <Text size="sm" className="text-muted-foreground">
            Neutrals
          </Text>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ColorSwatch name="Background" hex="#FAFAF8" className="bg-background" />
            <ColorSwatch name="Muted" hex="#D3D1C7" className="bg-muted" />
            <ColorSwatch name="Border" hex="#E8E6E1" className="bg-border" />
            <ColorSwatch name="Foreground" hex="#2C2C2A" className="bg-foreground" />
          </div>
          <Text size="sm" className="text-muted-foreground">
            Official brand accents — the literal, unmodified colors from
            docs/branding/branding.pdf "Colores de acento y estados". Safe for non-text
            use: borders, icons, focus indicators, decorative accents. Three of the five
            don't reach WCAG AA (4.5:1) with normal-size white text — see the
            accessibility-derivative row below for what Button, Badge, and Alert actually
            use as a solid background.
          </Text>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <ColorSwatch
              name="Brand Primary"
              hex="#D85A30"
              note="Non-text use only — 3.70:1 with white text"
              className="bg-brand-primary"
            />
            <ColorSwatch
              name="Brand Success"
              hex="#1D9E75"
              note="Non-text use only — 3.24:1 with white text"
              className="bg-brand-success"
            />
            <ColorSwatch
              name="Brand Warning"
              hex="#BA7517"
              note="Non-text use only — 3.56:1 with white text"
              className="bg-brand-warning"
            />
            <ColorSwatch
              name="Brand Danger"
              hex="#A32D2D"
              note="6.76:1 — safe with white text too"
              className="bg-brand-danger"
            />
            <ColorSwatch
              name="Brand Info"
              hex="#185FA5"
              note="6.24:1 — safe with white text too"
              className="bg-brand-info"
            />
          </div>

          <Text size="sm" className="text-muted-foreground">
            Accessibility derivatives — implementation colors used as solid backgrounds
            under normal-size white text (Button, Badge, Alert solid fills). Danger/Info
            reuse the official brand hex directly, since it already clears 4.5:1.
          </Text>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <ColorSwatch
              name="Primary"
              hex="#C44D25"
              note="Derived from Brand Primary — 4.53:1"
              className="bg-primary"
            />
            <ColorSwatch
              name="Success"
              hex="#188260"
              note="Derived from Brand Success — 4.57:1"
              className="bg-success"
            />
            <ColorSwatch
              name="Warning"
              hex="#A16514"
              note="Derived from Brand Warning — 4.58:1"
              className="bg-warning"
            />
            <ColorSwatch
              name="Danger"
              hex="#A32D2D"
              note="= Brand Danger, used directly"
              className="bg-destructive"
            />
            <ColorSwatch
              name="Info"
              hex="#185FA5"
              note="= Brand Info, used directly"
              className="bg-info"
            />
          </div>
        </section>

        <section aria-labelledby="buttons-heading" className="flex flex-col gap-4">
          <SectionHeading id="buttons-heading">Buttons</SectionHeading>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small (36px)</Button>
            <Button size="md">Medium (40px)</Button>
            <Button size="lg">Large (44px, mobile touch target)</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Disabled</Button>
            <Button loading={isSubmitting} onClick={simulateLoading}>
              {isSubmitting ? 'Enviando…' : 'Click to simulate loading'}
            </Button>
            <Button icon={<IconCheck aria-hidden="true" />}>With icon</Button>
          </div>
        </section>

        <section aria-labelledby="forms-heading" className="flex flex-col gap-4">
          <SectionHeading id="forms-heading">Form controls</SectionHeading>
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField label="Nombre" description="Como aparecerá en tu perfil.">
              {(field) => <Input placeholder="María López" {...field} />}
            </FormField>
            <FormField label="Correo" required error="Ingresa un correo válido.">
              {(field) => (
                <Input type="email" placeholder="correo@ejemplo.com" invalid {...field} />
              )}
            </FormField>
            <FormField
              label="Notas"
              description="Campo de texto largo (Textarea)."
              className="sm:col-span-2"
            >
              {(field) => <Textarea placeholder="Escribe aquí…" {...field} />}
            </FormField>
            <FormField label="Campo deshabilitado">
              {(field) => <Input disabled placeholder="No editable" {...field} />}
            </FormField>
          </div>
        </section>

        <section aria-labelledby="cards-heading" className="flex flex-col gap-4">
          <SectionHeading id="cards-heading">Cards</SectionHeading>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Salón Diamante</CardTitle>
              <CardDescription>
                Example card — not a real venue or business screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Text size="sm">Capacidad para 18 mesas · Torreón, Coah.</Text>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm" variant="outline">
                Ver detalle
              </Button>
              <Button size="sm">Seleccionar</Button>
            </CardFooter>
          </Card>
        </section>

        <section aria-labelledby="badges-heading" className="flex flex-col gap-4">
          <SectionHeading id="badges-heading">Badges</SectionHeading>
          <div className="flex flex-wrap gap-3">
            <Badge tone="success" icon={<IconCheck aria-hidden="true" />}>
              Entregado
            </Badge>
            <Badge tone="warning" icon={<IconClock aria-hidden="true" />}>
              En preparación
            </Badge>
            <Badge tone="danger" icon={<IconX aria-hidden="true" />}>
              Cancelado
            </Badge>
            <Badge tone="info" icon={<IconInfoCircle aria-hidden="true" />}>
              Información
            </Badge>
            <Badge tone="neutral" icon={<IconMinus aria-hidden="true" />}>
              Neutral
            </Badge>
          </div>
        </section>

        <section aria-labelledby="alerts-heading" className="flex flex-col gap-4">
          <SectionHeading id="alerts-heading">Alerts</SectionHeading>
          <div className="flex flex-col gap-3">
            <Alert
              tone="success"
              icon={<IconCheck aria-hidden="true" />}
              title="Operación exitosa"
            >
              <Text size="sm">El registro se guardó correctamente.</Text>
            </Alert>
            <Alert
              tone="warning"
              icon={<IconClock aria-hidden="true" />}
              title="Revisión pendiente"
            >
              <Text size="sm">Hay elementos en espera de confirmación.</Text>
            </Alert>
            <Alert
              tone="danger"
              icon={<IconAlertCircle aria-hidden="true" />}
              title="No se pudo completar"
            >
              <Text size="sm">Ocurrió un problema. Intenta de nuevo.</Text>
            </Alert>
            <Alert
              tone="info"
              icon={<IconInfoCircle aria-hidden="true" />}
              title="Dato informativo"
            >
              <Text size="sm">Esta es información adicional para el usuario.</Text>
            </Alert>
            <Alert
              tone="neutral"
              icon={<IconMinus aria-hidden="true" />}
              title="Estado neutral"
            >
              <Text size="sm">Mensaje sin urgencia particular.</Text>
            </Alert>
          </div>
        </section>

        <section aria-labelledby="loading-heading" className="flex flex-col gap-4">
          <SectionHeading id="loading-heading">Loading states</SectionHeading>
          <div className="flex flex-wrap items-center gap-6">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
          <div className="flex max-w-sm flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </section>

        <section aria-labelledby="separator-heading" className="flex flex-col gap-4">
          <SectionHeading id="separator-heading">Separator</SectionHeading>
          <div className="flex flex-col gap-2">
            <Text size="sm">Above</Text>
            <Separator />
            <Text size="sm">Below</Text>
          </div>
          <div className="flex h-8 items-center gap-2">
            <Text size="sm">Left</Text>
            <Separator orientation="vertical" />
            <Text size="sm">Right</Text>
          </div>
        </section>

        <section aria-labelledby="mobile-heading" className="flex flex-col gap-4">
          <SectionHeading id="mobile-heading">
            Mobile viewport example (375px)
          </SectionHeading>
          <Text size="sm" className="max-w-prose text-muted-foreground">
            The comensal experience is mobile-first (docs/FrontendArchitecture.md §10.3).
            This frame constrains the same components to a 375px-wide viewport — it is a
            sizing reference, not a real comensal screen.
          </Text>
          <div className="border-border mx-auto w-[375px] max-w-full rounded-lg border p-4">
            <Card>
              <CardHeader>
                <CardTitle>Mesa 12</CardTitle>
                <CardDescription>Atendida por Juan P.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Badge tone="success" icon={<IconCheck aria-hidden="true" />}>
                  Activa
                </Badge>
                <Button className="w-full" size="lg">
                  Llamar al mesero
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}

interface ColorSwatchProps {
  name: string
  hex: string
  className: string
  /** For a swatch whose token is an accessibility derivative, not the literal brand hex. */
  note?: string
}

/**
 * The hex/name/note text always sits on the plain card background, never
 * on the colored swatch itself — several of these accents don't have
 * enough contrast for text at any reduced opacity, so no text is ever
 * rendered on top of the color block.
 */
function ColorSwatch({ name, hex, className, note }: ColorSwatchProps) {
  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <div className={cn('h-16', className)} />
      <div className="bg-card flex flex-col gap-0.5 p-2">
        <Text size="sm" className="font-medium">
          {name}
        </Text>
        <Caption className="font-mono">{hex}</Caption>
        {note ? <Caption>{note}</Caption> : null}
      </div>
    </div>
  )
}
