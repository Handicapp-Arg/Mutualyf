import React from 'react';

import { cn } from '@/lib/utils';

interface NavDropdownProps {
  trigger: React.ReactNode;
  items: Array<{
    title: string;
    desc?: string;
    href: string;
    external?: boolean;
  }>;
  className?: string;
}

/**
 * Dropdown de navegación con glass morphism
 */
export function NavDropdown({ trigger, items, className }: NavDropdownProps) {
  return (
    <div className="group relative">
      {trigger}
      <div
        className={cn(
          'glass-morphism invisible absolute left-0 top-full mt-4 rounded-[2rem] p-4 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100',
          className
        )}
      >
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
            className="group/item block rounded-2xl p-3 transition-all hover:bg-corporate/5"
          >
            <div className="text-[10px] font-black uppercase text-slate-800">
              {item.title}
            </div>
            {item.desc && (
              <div className="text-[9px] font-bold text-slate-400">{item.desc}</div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
