import { cn } from "@/lib/utils";

interface PageLoaderProps {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

const sizeMap = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

export const PageLoader = ({
  className,
  label = "جارٍ التحميل...",
  size = "md",
  fullScreen = false,
}: PageLoaderProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6",
        fullScreen ? "min-h-screen w-full" : "py-16 w-full",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn("relative", sizeMap[size])}>
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        {/* Middle ring */}
        <div className="absolute inset-1 rounded-full border-2 border-primary/30" />
        {/* Spinning gradient ring */}
        <div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-primary/60 animate-spin"
          style={{ animationDuration: "1s" }}
        />
        {/* Inner reverse-spinning ring */}
        <div
          className="absolute inset-2 rounded-full border-2 border-transparent border-b-primary/70 animate-spin"
          style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
        />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      {label && (
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

export default PageLoader;
