import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "./constants";
import { getStatusLabel } from "./format";

type Props = {
  status: string;
  className?: string;
};

export function EventStatusBadge({ status, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] capitalize",
        STATUS_COLORS[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}
