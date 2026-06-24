"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePrefersReducedMotion } from "@/components/marketing/usePrefersReducedMotion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scroll als fundament onder de GSAP ScrollTrigger-animaties van de
 * marketingpagina. Alleen actief op de marketing-laag (deze hook wordt enkel in
 * MarketingLanding gebruikt), zodat de app achter de login native blijft scrollen.
 * Bij prefers-reduced-motion valt de pagina terug op normaal scrollen.
 */
export function useLenisSmoothScroll(): void {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis();

    // ScrollTrigger laten meelopen met de virtuele scrollpositie van Lenis.
    lenis.on("scroll", ScrollTrigger.update);

    // Lenis aan de gsap-ticker hangen i.p.v. een eigen requestAnimationFrame-loop,
    // zodat scroll en ScrollTrigger op exact dezelfde frame draaien (geen jitter).
    const raf = (time: number) => {
      // gsap-ticker levert seconden, Lenis verwacht milliseconden.
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Pin/scrub-triggers opnieuw laten meten nu Lenis de scroll aanstuurt.
    ScrollTrigger.refresh();

    return () => {
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33); // gsap-default herstellen
      lenis.destroy();
      ScrollTrigger.refresh();
    };
  }, [reducedMotion]);
}
