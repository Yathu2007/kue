"use client";

import { useEffect, useRef } from "react";

export function CursorSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = spotlightRef.current;
    if (!element) return;

    const setPosition = (x: number, y: number) => {
      element.style.setProperty("--spot-x", `${x}px`);
      element.style.setProperty("--spot-y", `${y}px`);
    };

    setPosition(window.innerWidth / 2, window.innerHeight / 2);

    const handleMove = (event: MouseEvent) => {
      setPosition(event.clientX, event.clientY);
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div ref={spotlightRef} className="cursor-spotlight pointer-events-none absolute inset-0" />
  );
}
