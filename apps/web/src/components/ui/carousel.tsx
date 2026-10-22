import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Children, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn.ts';
import { Button } from './button.tsx';

interface CarouselProps {
  label: string;
  previousLabel: string;
  nextLabel: string;
  children: ReactNode;
}

// CSS scroll-snap does the sliding; the ref only drives the buttons and reads the position.
export function Carousel({ label, previousLabel, nextLabel, children }: CarouselProps) {
  const track = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children);
  const [active, setActive] = useState(0);

  const goTo = (index: number) => {
    const target = track.current?.children[index];
    if (target instanceof HTMLElement) {
      track.current?.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
    }
  };
  const onScroll = () => {
    const el = track.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <section aria-roledescription="carousel" aria-label={label} className="flex flex-col gap-3">
      <div
        ref={track}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none]"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            aria-roledescription="slide"
            className="w-full shrink-0 snap-start sm:w-[calc(50%-0.5rem)]"
          >
            {slide}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}`}
              aria-current={i === active}
              onClick={() => goTo(i)}
              className={cn('h-2 rounded-full transition-all', {
                'w-6 bg-primary': i === active,
                'w-2 bg-border hover:bg-highlight': i !== active,
              })}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={previousLabel}
            onClick={() => goTo(Math.max(active - 1, 0))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={nextLabel}
            onClick={() => goTo(Math.min(active + 1, slides.length - 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </section>
  );
}
