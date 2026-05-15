// The headline count + phase must stay in lock-step with the live events
// list. The pipeline snapshot is only polled and routinely reports 0
// before the server's open-batch row exists, so it must never drag the
// header below what the rows already show ("0 events but Queued" desync).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Motion renders to plain DOM here — we only assert text/structure, and
// happy-dom has no matchMedia for framer-motion's reduced-motion probe.
vi.mock("motion/react", async () => {
  const React = await import("react");
  const make = (Tag: string) =>
    React.forwardRef(function M({ children, ...rest }: any, ref: any) {
      const {
        initial,
        animate,
        exit,
        transition,
        whileHover,
        whileTap,
        layout,
        variants,
        ...dom
      } = rest;
      return React.createElement(Tag, { ref, ...dom }, children);
    });
  const motion = new Proxy(
    {},
    { get: (_t, key: string) => make(key) },
  ) as Record<string, unknown>;
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

vi.mock("../useIngestPipeline", () => ({
  ingestPipelineKey: (potId: string) => ["pot-ingest-pipeline", potId],
  useIngestPipeline: vi.fn(),
}));

import { IngestionPipeline } from "../IngestionPipeline";
import { useIngestPipeline } from "../useIngestPipeline";
import type { PotIngestPipeline } from "@/services/PotService";

const mockPipeline = (data: PotIngestPipeline | undefined) => {
  (useIngestPipeline as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    data,
  });
};

const snapshot = (over: Partial<PotIngestPipeline> = {}): PotIngestPipeline => ({
  pot_id: "p1",
  mode: "windowed",
  window_minutes: 5,
  min_batch_size: null,
  open_batch: null,
  queued_event_count: 0,
  ...over,
});

const defaultProps = {
  potId: "p1",
  queuedCount: 0,
  processingCount: 0,
  mutations: null,
  onForceFlush: () => {},
  flushing: false,
};

describe("IngestionPipeline ↔ list sync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the live list count when the snapshot still reports 0", () => {
    // The crux of the bug: list has 3 queued, snapshot lags at 0.
    mockPipeline(snapshot({ open_batch: null, queued_event_count: 0 }));
    render(<IngestionPipeline {...defaultProps} queuedCount={3} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    // Phase agrees with the count — the "Queued" step + flush CTA show,
    // and the section is not collapsed.
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText(/Process now/i)).toBeInTheDocument();
  });

  it("raises the count when the server has more than the loaded pages", () => {
    mockPipeline(snapshot({ queued_event_count: 7 }));
    render(<IngestionPipeline {...defaultProps} queuedCount={2} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("never drops below the live list when open_batch.event_count is 0", () => {
    mockPipeline(
      snapshot({
        open_batch: {
          batch_id: "b1",
          created_at: null,
          event_count: 0,
          window_deadline: null,
        },
      }),
    );
    render(<IngestionPipeline {...defaultProps} queuedCount={4} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("excludes the processing slice from the queued headline", () => {
    // queuedCount counts ACTIVE (queued+received+processing); the waiting
    // backlog shown when not in-flight is queued − processing.
    mockPipeline(snapshot());
    render(
      <IngestionPipeline
        {...defaultProps}
        queuedCount={5}
        processingCount={2}
      />,
    );
    // processingCount > 0 → "In flight" shows the processing number.
    expect(screen.getByText("In flight")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("collapses entirely when truly idle (nothing queued or processing)", () => {
    mockPipeline(snapshot());
    const { container } = render(<IngestionPipeline {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it("stays visible off the snapshot alone when the list shows nothing yet", () => {
    // Inverse lag: rows not loaded, but the server already has a backlog.
    mockPipeline(snapshot({ queued_event_count: 6 }));
    const { container } = render(<IngestionPipeline {...defaultProps} />);
    expect(container.firstChild).not.toBeNull();
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});
