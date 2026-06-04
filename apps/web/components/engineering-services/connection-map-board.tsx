import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConnectionMapBoardProps {
  layers: Array<{
    title: string;
    description: string;
  }>;
  pins: Array<{
    id: string;
    label: string;
    count: number;
    color: string;
    x: string;
    y: string;
  }>;
}

export function ConnectionMapBoard({ layers, pins }: ConnectionMapBoardProps) {
  return (
    <Card className="overflow-hidden border-red-100">
      <CardHeader className="border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-rose-50">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>GIS tracking and connection map board</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Plot the same locality, network, and close-out fields already appearing in the MV and
              LV workbooks so status checks can happen visually as well as in the register.
            </p>
          </div>
          <Badge className="w-fit bg-red-600 text-white hover:bg-red-600">GIS-ready design</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-red-100 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.12),transparent_36%),linear-gradient(180deg,#fff,#fff5f5)] p-4">
          <div className="relative h-[320px] overflow-hidden rounded-xl border border-red-100 bg-white">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d="M8 74 C26 58, 31 62, 48 49 S77 28, 95 18"
                fill="none"
                stroke="#fecaca"
                strokeWidth="2.6"
              />
              <path
                d="M13 12 C25 18, 38 35, 49 46 S74 73, 90 84"
                fill="none"
                stroke="#fca5a5"
                strokeWidth="2"
              />
              <path
                d="M30 9 C36 22, 51 31, 66 39 S82 58, 92 77"
                fill="none"
                stroke="#f87171"
                strokeWidth="1.8"
                strokeDasharray="4 2"
              />
              <circle cx="21" cy="35" r="2.2" fill="#b91c1c" opacity="0.18" />
              <circle cx="58" cy="46" r="3" fill="#dc2626" opacity="0.14" />
              <circle cx="78" cy="66" r="2.6" fill="#ef4444" opacity="0.16" />
            </svg>

            {pins.map((pin) => (
              <div
                key={pin.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: pin.x, top: pin.y }}
              >
                <div className="relative flex flex-col items-center gap-1">
                  <div
                    className="flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-xs font-bold text-white shadow-lg"
                    style={{ backgroundColor: pin.color }}
                  >
                    {pin.count}
                  </div>
                  <div className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm">
                    {pin.label}
                  </div>
                </div>
              </div>
            ))}

            <div className="absolute bottom-3 left-3 rounded-lg border border-red-100 bg-white/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
              Example view: status clusters by locality, network point, and completion gap
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">Map layers to support</h3>
            <div className="mt-3 space-y-2">
              {layers.map((layer) => (
                <div key={layer.title} className="rounded-xl border border-red-100 bg-white p-3">
                  <p className="text-sm font-medium text-foreground">{layer.title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {layer.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-foreground">How GIS helps operations</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {pins.map((pin) => (
                <div
                  key={pin.label}
                  className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: pin.color }}
                    />
                    <span className="text-xs font-medium text-foreground">{pin.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{pin.count} sample records</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
