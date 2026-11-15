"use client";

import { Eye, Maximize2, MoveHorizontal, Pause, Play } from "lucide-react";
import dynamic from "next/dynamic";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { CursorSettings } from "@/components/cursor/cursor-settings";
import { StageView } from "@/components/three/stage";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Body, Caption, Title } from "@/components/ui/type";
import { cx } from "@/lib/cx";
import { FINISHES } from "@/lib/preferences";
import { panningVideo, photoUrl } from "./procedural";

const NoisePlane = dynamic(() => import("./noise-plane"), { ssr: false });

/**
 * The cursor playground (DESIGN.md §6.1): every state on light, dark, mid-gray, a photo and
 * a video; the native zones; the visibility tiles the e2e tests screenshot; an empty area
 * for hotspot accuracy; and the top-layer cases, a sheet and a popover.
 */
export function CursorLab() {
  const photo = usePhoto();
  return (
    <>
      <Controls />
      <Part title="Every state, on five backgrounds">
        <Playground photo={photo} />
      </Part>
      <Part title="Native zones keep the system cursor">
        <NativeZones />
      </Part>
      <Part title="Visibility">
        <Visibility photo={photo} />
      </Part>
      <Part title="Accuracy">
        <div data-testid="cursor-accuracy" className="h-64 rounded-card-l border border-dashed border-hairline" />
      </Part>
    </>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <Caption as="h3" className="font-semibold">
        {title}
      </Caption>
      {children}
    </div>
  );
}

// ─── Imagery ─────────────────────────────────────────────────────────────────

function usePhoto(): string {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    let made = "";
    void photoUrl().then((next) => {
      made = next;
      if (alive) setUrl(next);
      else URL.revokeObjectURL(next);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, []);
  return url;
}

function Photo({ url, className }: { url: string; className?: string }) {
  if (!url) return <div className={cx("bg-card", className)} />;
  // A generated blob URL: next/image has nothing to optimize.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={cx("object-cover", className)} />;
}

function Video({ className, controls, label }: { className?: string; controls?: boolean; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const video = ref.current;
    const source = panningVideo();
    if (!video || !source) return;
    video.srcObject = source.stream;
    void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
      source.stop();
    };
  }, []);

  return (
    <>
      <video
        ref={ref}
        className={cx("object-cover", className)}
        muted
        playsInline
        autoPlay
        controls={controls}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      />
      {controls ? null : (
        <Button
          variant="secondary"
          className="absolute right-4 bottom-4"
          aria-label={playing ? "Pause the video" : "Play the video"}
          onClick={() => {
            const video = ref.current;
            if (!video) return;
            if (video.paused) void video.play();
            else video.pause();
            setPlaying(video.paused === false);
          }}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </Button>
      )}
    </>
  );
}

// ─── Controls ────────────────────────────────────────────────────────────────

function Controls() {
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-cursor-busy", busy);
    return () => root.removeAttribute("data-cursor-busy");
  }, [busy]);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <CursorSettings />
      <div className="flex flex-col">
        <Switch label="Show the navigating ring" checked={busy} onCheckedChange={setBusy} />
        <div className="flex flex-wrap gap-3 pt-4">
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Open a sheet
          </Button>
          <Button variant="secondary" popoverTarget="cursor-popover">
            Open a popover
          </Button>
          <Button variant="link" href="/dev/content">
            Go to another page
          </Button>
        </div>
      </div>
      <div
        id="cursor-popover"
        popover="auto"
        data-testid="cursor-popover"
        className="m-auto max-w-measure rounded-card-l border-0 p-8 text-fg material-glass"
      >
        <Title as="p">A popover</Title>
        <Body tone="fg-2" className="mt-2">
          It sits in the top layer, and the cursor re-stacks itself above it. Click outside or press Esc to close.
        </Body>
      </div>
      <Sheet open={sheet} onOpenChange={setSheet} title="A sheet" description="A modal dialog in the top layer. The cursor stays above it.">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setSheet(false)}>Done</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

// ─── Every state on five backgrounds ─────────────────────────────────────────

interface PanelSpec {
  id: string;
  name: string;
  /** Mid-gray only passes contrast for large text and filled buttons. */
  simple?: boolean;
}

const PANELS: PanelSpec[] = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "gray", name: "Mid-gray", simple: true },
  { id: "photo", name: "Photo" },
  { id: "video", name: "Video" },
];

function Playground({ photo }: { photo: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {PANELS.map((panel) => (
        <Panel key={panel.id} spec={panel} photo={photo} />
      ))}
    </div>
  );
}

function Panel({ spec, photo }: { spec: PanelSpec; photo: string }) {
  const surface = spec.id === "light" || spec.id === "dark" ? spec.id : undefined;
  const tone = spec.id === "gray" ? "light" : spec.id === "photo" || spec.id === "video" ? "dark" : undefined;
  const style: CSSProperties | undefined = spec.id === "gray" ? { backgroundColor: "var(--kitchen-mid-gray)" } : undefined;
  return (
    <div
      data-testid={`playground-${spec.id}`}
      data-surface={surface}
      data-tone={tone}
      style={style}
      className={cx(
        "relative isolate flex flex-col gap-6 overflow-hidden rounded-card-l p-6 text-fg",
        spec.id === "light" && "border border-hairline",
      )}
    >
      {spec.id === "photo" ? <Photo url={photo} className="absolute inset-0 -z-10 size-full" /> : null}
      {spec.id === "video" ? <Video className="absolute inset-0 -z-10 size-full" /> : null}
      <Title as="h3">{spec.name}</Title>
      <div className="flex flex-wrap gap-3">
        <Button>Primary</Button>
        {spec.simple ? null : <Button variant="secondary">Secondary</Button>}
        {spec.simple ? null : (
          <Button variant="link" href="#cursor">
            A link
          </Button>
        )}
        <Button disabled>Disabled</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Tile cursor="open" icon={<Maximize2 aria-hidden="true" />} />
        <Tile cursor="play" icon={<Play aria-hidden="true" />} />
        <Tile cursor="view" icon={<Eye aria-hidden="true" />} />
      </div>
      <div
        data-cursor="drag"
        className="flex min-h-target items-center justify-center rounded-pill border border-current"
      >
        <MoveHorizontal aria-hidden="true" />
      </div>
    </div>
  );
}

function Tile({ cursor, icon }: { cursor: string; icon: ReactNode }) {
  return (
    <div data-cursor={cursor} className="flex aspect-square items-center justify-center rounded-card-s border border-current">
      {icon}
    </div>
  );
}

// ─── Native zones ────────────────────────────────────────────────────────────

const field = "min-h-target w-full rounded-control border border-hairline bg-bg px-4 text-body text-fg";

function NativeZones() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <label className="flex flex-col gap-2">
        <Caption as="span">A text field</Caption>
        <input type="text" data-testid="native-input" className={field} defaultValue="The system I-beam" />
      </label>
      <label className="flex flex-col gap-2">
        <Caption as="span">A text area</Caption>
        <textarea rows={2} className={cx(field, "py-2")} defaultValue="Typing keeps the native cursor." />
      </label>
      <label className="flex flex-col gap-2">
        <Caption as="span">A menu</Caption>
        <select data-testid="native-select" className={field} defaultValue="contrail">
          {FINISHES.map((finish) => (
            <option key={finish.id} value={finish.id}>
              {finish.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-2">
        <Caption as="span">An embedded page</Caption>
        <iframe
          data-testid="native-iframe"
          title="An embedded page"
          srcDoc='<!doctype html><html lang="en"><title>An embedded page</title><p>An embedded page keeps the system cursor.</p></html>'
          className="aspect-wide w-full rounded-card-s border border-hairline bg-bg"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Caption as="span">Video controls</Caption>
        <div className="relative aspect-wide overflow-hidden rounded-card-s">
          <Video controls label="A video with native controls" className="absolute inset-0 size-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Visibility tiles ────────────────────────────────────────────────────────

interface TileSpec {
  id: string;
  name: string;
  style?: CSSProperties;
}

const TILES: TileSpec[] = [
  { id: "white", name: "White", style: { backgroundColor: "var(--neutral-light-bg)" } },
  { id: "black", name: "Black", style: { backgroundColor: "var(--neutral-dark-bg)" } },
  { id: "gray", name: "Mid-gray", style: { backgroundColor: "var(--kitchen-mid-gray)" } },
  ...FINISHES.flatMap(({ id, name }) =>
    (["light", "dark"] as const).map((tone) => ({
      id: `${id}-${tone}`,
      name: `${name}, on ${tone}`,
      style: { backgroundColor: `var(--finish-${id}-on-${tone})` },
    })),
  ),
];

function Visibility({ photo }: { photo: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
      {TILES.map((tile) => (
        <Swatch key={tile.id} name={tile.name}>
          <div data-testid={`visibility-${tile.id}`} className="aspect-wide rounded-card-s" style={tile.style} />
        </Swatch>
      ))}
      <Swatch name="A photo">
        <div data-testid="visibility-photo" className="relative aspect-wide overflow-hidden rounded-card-s">
          <Photo url={photo} className="absolute inset-0 size-full" />
        </div>
      </Swatch>
      <Swatch name="WebGL">
        <StageView
          scene={NoisePlane}
          ink="light"
          label="A plane of WebGL noise"
          poster={<div className="size-full rounded-card-s bg-card" />}
          className="aspect-wide rounded-card-s"
        />
      </Swatch>
      <Swatch name="The Island">
        <div className="flex aspect-wide items-center justify-center">
          <div data-testid="visibility-island" data-tone="dark" className="h-target w-full rounded-pill bg-bg" />
        </div>
      </Swatch>
    </div>
  );
}

function Swatch({ name, children }: { name: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-2">
      {children}
      <figcaption>
        <Caption as="span">{name}</Caption>
      </figcaption>
    </figure>
  );
}
