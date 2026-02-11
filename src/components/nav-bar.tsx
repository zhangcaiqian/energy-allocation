"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSeedling, faPenToSquare, faChartLine, faGear } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const navItems: { href: string; label: string; icon: IconDefinition }[] = [
  { href: "/", label: "花园", icon: faSeedling },
  { href: "/check-in", label: "记录", icon: faPenToSquare },
  { href: "/trends", label: "趋势", icon: faChartLine },
  { href: "/settings", label: "设置", icon: faGear },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-[#e8e5e0] safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all",
                isActive
                  ? "text-[#6b9b7a]"
                  : "text-[#b5b0a8] hover:text-[#7a7a7a]"
              )}
            >
              <FontAwesomeIcon icon={item.icon} className="text-lg" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
