import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonRow() {
  return (
    <tr className="pb-2 mb-2">
      {}
      {Array(3) 
        .fill(null)
        .map(() => (
          <td key={Math.random()}>
            <Skeleton className="w-full h-6 bg-neutral-400 m-2"/>
          </td>
        ))}
    </tr>
  );
}

export { Skeleton, SkeletonRow }
