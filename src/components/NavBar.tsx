import Link from 'next/link';
import { BookOpenCheck, SplitSquareHorizontal } from 'lucide-react';

export function NavBar() {
  return (
    <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <BookOpenCheck className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold tracking-tight text-lg">
          APT <span className="text-muted-foreground font-normal">| Tutor</span>
        </span>
      </div>

      <nav className="flex items-center gap-6 text-sm font-medium">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SplitSquareHorizontal className="w-4 h-4" />
          Practice
        </Link>
        <Link
          href="/review"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpenCheck className="w-4 h-4" />
          Review Bank
        </Link>
      </nav>
    </header>
  );
}
