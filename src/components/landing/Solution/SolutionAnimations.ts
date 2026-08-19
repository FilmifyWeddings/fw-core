import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface SolutionAnimationRefs {
  sectionRef: HTMLElement | null;
  chaosSceneRef: HTMLElement | null;
  solutionContentRef: HTMLElement | null;
  solutionCharacterRef: HTMLElement | null;
  solutionDashboardRef: HTMLElement | null;
  driftingPaper1Ref?: HTMLElement | null;
  driftingPaper2Ref?: HTMLElement | null;
}

export const animateSolutionSection = (refs: SolutionAnimationRefs) => {
  if (!refs.sectionRef) return null;

  const masterCtx = gsap.context(() => {
    // 1. Entrance timeline for scene elements
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: refs.sectionRef,
        start: 'top 75%',
        toggleActions: 'play none none none',
      },
      defaults: { ease: 'power3.out' },
    });

    if (refs.chaosSceneRef) {
      tl.fromTo(
        refs.chaosSceneRef,
        { opacity: 0, y: 35 },
        { opacity: 1, y: 0, duration: 0.9 }
      );
    }

    if (refs.solutionContentRef) {
      tl.fromTo(
        refs.solutionContentRef,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.3'
      );
    }

    if (refs.solutionDashboardRef) {
      tl.fromTo(
        refs.solutionDashboardRef,
        { opacity: 0, y: 35, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power2.out' },
        '-=0.6'
      );
    }

    if (refs.solutionCharacterRef) {
      tl.fromTo(
        refs.solutionCharacterRef,
        { opacity: 0, y: 40, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power2.out' },
        '-=0.7'
      );
    }

    // 2. Interactive Scroll Flutter for Floating Papers (Scroll down = float down, scroll up = float up)
    if (refs.driftingPaper1Ref) {
      gsap.fromTo(
        refs.driftingPaper1Ref,
        { y: -30, x: -10, rotate: -8 },
        {
          y: 130,
          x: 25,
          rotate: 28,
          ease: 'none',
          scrollTrigger: {
            trigger: refs.sectionRef,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        }
      );
    }

    if (refs.driftingPaper2Ref) {
      gsap.fromTo(
        refs.driftingPaper2Ref,
        { y: -20, x: 10, rotate: 14 },
        {
          y: 150,
          x: -30,
          rotate: -24,
          ease: 'none',
          scrollTrigger: {
            trigger: refs.sectionRef,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        }
      );
    }
  }, refs.sectionRef);

  return masterCtx;
};
