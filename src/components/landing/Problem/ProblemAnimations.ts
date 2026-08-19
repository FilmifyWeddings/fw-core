import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface ProblemAnimationRefs {
  sectionRef: HTMLElement | null;
  headlineRef: HTMLElement | null;
  characterRef: HTMLElement | null;
  cardsRef: (HTMLElement | null)[];
  decorationsRef: HTMLElement | null;
  summaryRef: HTMLElement | null;
}

export const animateProblemSection = (refs: ProblemAnimationRefs) => {
  if (!refs.sectionRef) return null;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: refs.sectionRef,
      start: 'top 75%',
      toggleActions: 'play none none none',
    },
    defaults: { ease: 'power3.out' },
  });

  // 1. Headline & Eyebrow
  if (refs.headlineRef) {
    tl.fromTo(
      refs.headlineRef,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8 }
    );
  }

  // 2. Character rises gently
  if (refs.characterRef) {
    tl.fromTo(
      refs.characterRef,
      { opacity: 0, y: 50, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power2.out' },
      '-=0.5'
    );
  }

  // 3. Floating Notification Cards stagger
  const validCards = refs.cardsRef.filter(Boolean) as HTMLElement[];
  if (validCards.length > 0) {
    tl.fromTo(
      validCards,
      { opacity: 0, y: 20, scale: 0.92 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.7,
        stagger: 0.08,
        ease: 'back.out(1.3)',
      },
      '-=0.6'
    );
  }

  // 4. Handwritten notes & decorations draw in
  if (refs.decorationsRef) {
    tl.fromTo(
      refs.decorationsRef,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.8 },
      '-=0.4'
    );
  }

  // 5. Bottom summary panel reveals
  if (refs.summaryRef) {
    tl.fromTo(
      refs.summaryRef,
      { opacity: 0, y: 35 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' },
      '-=0.4'
    );
  }

  return tl;
};
