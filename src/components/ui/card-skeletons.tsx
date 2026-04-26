import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const CourseCardSkeleton = () => (
  <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50">
    <Skeleton className="h-48 w-full rounded-none" />
    <div className="p-6 space-y-4">
      <Skeleton className="h-5 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  </div>
);

export const SpecialistCardSkeleton = () => (
  <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border/50 p-6">
    <div className="flex flex-col items-center text-center space-y-4">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-24" />
      <div className="w-full space-y-2 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5 mx-auto" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg mt-2" />
    </div>
  </div>
);

interface GridProps {
  count?: number;
  className?: string;
}

export const CourseSkeletonGrid = ({ count = 6, className }: GridProps) => (
  <div
    className={cn(
      'grid md:grid-cols-2 lg:grid-cols-3 gap-6',
      className
    )}
  >
    {Array.from({ length: count }).map((_, i) => (
      <CourseCardSkeleton key={i} />
    ))}
  </div>
);

export const SpecialistSkeletonGrid = ({ count = 8, className }: GridProps) => (
  <div
    className={cn(
      'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
      className
    )}
  >
    {Array.from({ length: count }).map((_, i) => (
      <SpecialistCardSkeleton key={i} />
    ))}
  </div>
);
