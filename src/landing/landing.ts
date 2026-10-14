import { heroFrames } from "./demos";
import { createMock } from "./mock";
import { bootChrome } from "./chrome";
import { mountShots } from "./shots";

const { reduced } = bootChrome();
mountShots();

// ── Hero: the one animated demo, a looping film; paused while off screen ──
const heroSlot = document.querySelector<HTMLElement>("[data-hero]");
if (heroSlot) {
  const mock = createMock(heroSlot, { animate: !reduced });
  const frames = heroFrames();
  if (reduced) {
    mock.render(frames[frames.length - 1].state);
  } else {
    let i = 0;
    let timer = 0;
    let playing = false;
    const tick = () => {
      mock.render(frames[i].state);
      timer = window.setTimeout(() => {
        i = (i + 1) % frames.length;
        if (playing) tick();
      }, frames[i].hold);
    };
    const play = () => {
      if (playing) return;
      playing = true;
      tick();
    };
    const pause = () => {
      playing = false;
      window.clearTimeout(timer);
    };
    mock.render(frames[0].state);
    new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause()), { threshold: 0.2 }).observe(heroSlot);
  }
}
