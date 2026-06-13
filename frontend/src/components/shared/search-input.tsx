import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = React.ComponentProps<typeof Input> & {
  icon?: React.ReactNode;
};

export function SearchInput({ className, icon, ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </div>
      <Input className={cn(icon && "pl-9", className)} {...props} />
    </div>
  );
}
