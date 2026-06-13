import { Link, useLocation } from "wouter";
import { Activity, Brain, LayoutDashboard, Target, Zap } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/gesture", label: "Gesture", icon: Zap },
    { href: "/practice", label: "Practice", icon: Target },
    { href: "/translation", label: "Translation", icon: Activity },
    { href: "/ai", label: "Chat with AI", icon: Brain },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-lg z-50 flex items-center px-6 justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.8)] transition-shadow">
            <span className="text-white font-bold text-lg font-space leading-none">S</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-widest text-foreground font-space leading-tight">SIGN_AI</span>
            <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase leading-tight">Engine Hub</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location === link.href;
            const Icon = link.icon;
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
      </div>
    </header>
  );
}
