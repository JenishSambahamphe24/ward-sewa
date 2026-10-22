// Fixed to the viewport, so it spans the whole window instead of the centred content column.
export function BrandBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-24 -left-24 size-[32rem] rounded-full bg-primary/25 blur-3xl motion-safe:animate-drift" />
      <div className="absolute -right-32 -bottom-32 size-[36rem] rounded-full bg-accent/25 blur-3xl motion-safe:animate-drift [animation-delay:-6s]" />
      <div className="absolute top-1/3 left-1/2 size-[24rem] -translate-x-1/2 rounded-full bg-highlight/25 blur-3xl motion-safe:animate-drift [animation-delay:-12s]" />
    </div>
  );
}
