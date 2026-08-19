import { gsap } from 'gsap';

export interface ParallaxState {
  x: number;
  y: number;
}

export const animateHeroEntrance = (
  refs: {
    navbarRef: HTMLElement | null;
    headlineRef: HTMLElement | null;
    descriptionRef: HTMLElement | null;
    buttonsRef: HTMLElement | null;
    trustRef: HTMLElement | null;
    dashboardRef: HTMLElement | null;
    characterRef: HTMLElement | null;
    notificationsRef: HTMLElement | null;
    bottomRef: HTMLElement | null;
  },
  onComplete?: () => void
) => {
  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete
  });

  // 1. Navbar fade in
  if (refs.navbarRef) {
    tl.fromTo(
      refs.navbarRef,
      { opacity: 0, y: -15 },
      { opacity: 1, y: 0, duration: 0.6 }
    );
  }

  // 2. Headline line-by-line reveal
  if (refs.headlineRef) {
    const lines = refs.headlineRef.querySelectorAll('.headline-line');
    if (lines.length > 0) {
      tl.fromTo(
        lines,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.09 },
        '-=0.3'
      );
    } else {
      tl.fromTo(
        refs.headlineRef,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.3'
      );
    }
  }

  // 3. Description & Buttons & Trust
  if (refs.descriptionRef) {
    tl.fromTo(
      refs.descriptionRef,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6 },
      '-=0.5'
    );
  }

  if (refs.buttonsRef) {
    tl.fromTo(
      refs.buttonsRef,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6 },
      '-=0.4'
    );
  }

  if (refs.trustRef) {
    tl.fromTo(
      refs.trustRef,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6 },
      '-=0.4'
    );
  }

  // 4. Dashboard enters
  if (refs.dashboardRef) {
    tl.fromTo(
      refs.dashboardRef,
      { opacity: 0, y: 30, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: 'power2.out' },
      '-=0.7'
    );
  }

  // 5. Character rises gently into position
  if (refs.characterRef) {
    tl.fromTo(
      refs.characterRef,
      { opacity: 0, y: 40, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power2.out' },
      '-=0.8'
    );
  }

  // 6. Floating notifications appear sequentially
  if (refs.notificationsRef) {
    const cards = refs.notificationsRef.querySelectorAll('.notification-card');
    if (cards.length > 0) {
      tl.fromTo(
        cards,
        { opacity: 0, x: 20, y: 10 },
        { opacity: 1, x: 0, y: 0, duration: 0.7, stagger: 0.1, ease: 'back.out(1.2)' },
        '-=0.7'
      );
    }
  }

  // 7. Bottom line & scroll indicator
  if (refs.bottomRef) {
    tl.fromTo(
      refs.bottomRef,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.8 },
      '-=0.4'
    );
  }

  return tl;
};
