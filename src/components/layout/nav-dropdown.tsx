import React from 'react';

import { cn } from '@/lib/utils';

interface NavDropdownProps {
  trigger: React.ReactNode;
  items: Array<{
    title: string;
    desc?: string;
    href: string;
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
          'glass-morphism invisible absolute left-0 top-full mt-4 rounded-[2rem] p-4 shadow-2xl opacity-0 transition-all group-hover:visible group-hover:opacity-100',
          className
        )}
      >
        {items.map((item, index) => (
          <a
            key={index}
            href={item.href}
            className="group/item block rounded-2xl p-3 transition-all hover:bg-corporate/5"
          >
            <div className="text-[10px] font-black uppercase text-slate-800">
              {item.title}
            </div>
            {item.desc && (
              <div className="text-[9px] font-bold text-slate-400">
                {item.desc}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
