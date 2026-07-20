import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Faalveilige scroll-reveal.
 *
 * Content is standaard ZICHTBAAR (opacity 1). Pas wanneer de trigger de viewport
 * binnenkomt, animeren we het element via `gsap.from` vanaf de opgegeven beginstaat
 * naar zijn natuurlijke eindstaat. Het cruciale verschil met een losse
 * `gsap.from(..., { scrollTrigger })`: die zet het element meteen op opacity 0 en
 * laat het permanent onzichtbaar staan als de trigger onverhoopt nooit (volledig)
 * vuurt — bv. doordat de pagina-hoogte verkeerd is gemeten terwijl de afbeeldingen
 * nog laadden, waardoor een stagger halverwege blijft steken.
 *
 * Met dit patroon geldt: zichtbaar tenzij geanimeerd. Vuurt de trigger niet, dan
 * blijft de content gewoon leesbaar in plaats van als leeg wit vlak. `clearProps`
 * verwijdert na afloop de inline opacity/transform, zodat er nooit een restje
 * `opacity: 0` blijft hangen.
 *
 * Roep dit binnen een `gsap.context()` aan, zodat de trigger bij unmount netjes
 * via `ctx.revert()` wordt opgeruimd.
 */
export function revealOnScroll(
  targets: gsap.TweenTarget,
  fromVars: gsap.TweenVars,
  options: { trigger: Element; start?: string },
): void {
  const { trigger, start = "top 85%" } = options;

  ScrollTrigger.create({
    trigger,
    start,
    once: true,
    onEnter: () => {
      gsap.from(targets, { ...fromVars, clearProps: "opacity,transform" });
    },
  });
}
