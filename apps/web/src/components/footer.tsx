export function Footer({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-muted-foreground text-center">
        &copy; {new Date().getFullYear()} HowlBoard by MrDemonWolf, Inc.
      </p>
      <div className="flex justify-center gap-2 mt-0.5">
        <a href="/legal/terms" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Terms</a>
        <span className="text-[10px] text-muted-foreground">&middot;</span>
        <a href="/legal/privacy" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">Privacy</a>
      </div>
    </div>
  );
}
