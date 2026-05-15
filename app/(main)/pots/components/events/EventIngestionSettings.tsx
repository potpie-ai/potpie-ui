"use client";

// Per-pot ingestion config dialog. Triggered from the events screen header
// cog. Owner-only on the server; the dialog is shown to everyone but the
// save button surfaces a friendly error if forbidden.

import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  useIngestionConfig,
  useUpdateIngestionConfig,
} from "./useIngestionConfig";

type Props = {
  potId: string;
};

export function EventIngestionSettings({ potId }: Props) {
  const { data: config, isLoading } = useIngestionConfig(potId);
  const update = useUpdateIngestionConfig(potId);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"immediate" | "windowed">("windowed");
  const [windowMinutes, setWindowMinutes] = useState<number>(5);

  // Re-seed local state from server every time the dialog opens.
  useEffect(() => {
    if (!open || !config) return;
    setMode(config.mode);
    setWindowMinutes(config.window_minutes);
  }, [open, config]);

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        mode,
        window_minutes: windowMinutes,
        min_batch_size: null,
      });
      toast.success("Ingestion settings saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          aria-label="Ingestion settings"
          title="Ingestion settings"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ingestion settings</DialogTitle>
          <DialogDescription>
            Choose how events are batched before the agent processes them.
            You can force the open batch to run at any time using the
            “Queued” button on the list.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Mode</label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as "immediate" | "windowed")}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="windowed">
                    Windowed — collect events into batches
                  </SelectItem>
                  <SelectItem value="immediate">
                    Immediate — run the agent on every event
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {mode === "windowed"
                  ? "Events accumulate for the configured window, then run as one batch. Lower agent cost and fewer LLM calls on busy pots."
                  : "The agent runs as soon as each event is admitted. Lowest latency, highest cost on busy pots."}
              </p>
            </div>

            {mode === "windowed" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="window-minutes">
                  Window
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="window-minutes"
                    type="number"
                    min={1}
                    max={1440}
                    value={windowMinutes}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setWindowMinutes(Number.isFinite(v) ? v : 5);
                    }}
                    className="h-8 w-24 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    minutes (1–1440)
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="text-xs"
            disabled={
              update.isPending ||
              isLoading ||
              (mode === "windowed" && (windowMinutes < 1 || windowMinutes > 1440))
            }
            onClick={() => void handleSave()}
          >
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
