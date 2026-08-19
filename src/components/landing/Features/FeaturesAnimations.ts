import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface FeaturesAnimationRefs {
  sectionRef: HTMLElement | null;
  headingRef: HTMLElement | null;
  cardsRowRef: HTMLElement | null;
  panelRef: HTMLElement | null;
}

export const animateFeaturesSection = (refs: FeaturesAnimationRefs) => {
  if (!refs.sectionRef) return null;

  const masterCtx = gsap.context(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: refs.sectionRef,
        start: 'top 75%',
        toggleActions: 'play none none none',
      },
      defaults: { ease: 'power3.out' },
    });

    if (refs.headingRef) {
      tl.fromTo(
        refs.headingRef,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7 }
      );
    }

    if (refs.cardsRowRef) {
      tl.fromTo(
        refs.cardsRowRef.children,
        { opacity: 0, y: 35 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 },
        '-=0.3'
      );
    }

    if (refs.panelRef) {
      tl.fromTo(
        refs.panelRef,
        { opacity: 0, y: 40, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power2.out' },
        '-=0.4'
      );
    }
  }, refs.sectionRef);

  return masterCtx;
};
