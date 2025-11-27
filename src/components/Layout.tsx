import React from "react";
import { clsx } from "clsx";

export function Layout({ 
  children,
  style 
}: { 
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}) {
  return (
    <div className="min-h-dvh text-white">
      <main 
        className={clsx("mx-auto max-w-7xl px-4 py-8 space-y-8")}
        style={style}
      > 
        {children}
      </main>
    </div>
  );
}
