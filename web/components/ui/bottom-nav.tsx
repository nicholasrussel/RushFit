"use client";

import { useState } from "react";
import Link from "next/link";

const ITEMS = [
  { key: "beranda", label: "Beranda", href: "/dashboard", icon: "⌂" },
  { key: "riwayat", label: "Riwayat", href: "/riwayat", icon: "☰" },
  { key: "progres", label: "Progres", href: "/progres", icon: "↗" },
  { key: "profil", label: "Profil", href: "/profil", icon: "◎" },
] as const;

export type NavKey = (typeof ITEMS)[number]["key"];

/** Navigasi bawah. Halaman yang memakainya perlu padding bawah (pb-24). */
export function BottomNav({ active }: { active: NavKey }) {
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card">
      <div className="mx-auto flex w-full max-w-md">
        {ITEMS.map((item) => {
          const current = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                current ? "text-accent" : "text-muted hover:text-ink"
              }`}
            >
              <span aria-hidden="true" className="text-xl leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Tombol mengambang (+) untuk mencatat latihan; duduk di atas BottomNav. */
export function FabLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-10">
      <div className="mx-auto flex w-full max-w-md justify-end px-4">
        <Link
          href={href}
          aria-label={label}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl leading-none text-white shadow-lg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          +
        </Link>
      </div>
    </div>
  );
}

type FabMenuItem = { label: string; href: string; icon?: string };

/**
 * FAB dengan menu dua pilihan: Diary dan Latihan langsung.
 * Tap sekali buka menu; tap item untuk navigasi; tap di luar untuk tutup.
 */
export function FabMenu({ items }: { items: FabMenuItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30">
        <div className="mx-auto flex w-full max-w-md flex-col items-end gap-2 px-4">
          {open && (
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-2xl border border-line bg-card px-4 py-2.5 shadow-md text-sm font-medium text-ink hover:bg-card/80"
                >
                  {item.icon && <span aria-hidden="true">{item.icon}</span>}
                  {item.label}
                </Link>
              ))}
            </div>
          )}
          <button
            aria-label={open ? "Tutup menu" : "Buka menu tambah"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-3xl leading-none text-white shadow-lg transition-transform hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            style={{ transform: open ? "rotate(45deg)" : "none" }}
          >
            +
          </button>
        </div>
      </div>
    </>
  );
}
