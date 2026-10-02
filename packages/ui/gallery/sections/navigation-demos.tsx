import { useState, type MouseEvent } from 'react';
import {
  ConsoleNav,
  SideNav,
  type BackOfficeDestination,
  type ConsoleDestination,
  type NavLinkProps,
} from '../../src';

/** A plain link that switches the current item in place, standing in for an app's router. */
function demoLink<K extends string>(go: (key: K) => void) {
  return function renderLink({ destination, ...props }: NavLinkProps<K>) {
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      go(destination);
    };
    return <a href={`#${destination}`} onClick={onClick} {...props} />;
  };
}

export function SideNavDemo() {
  const [current, setCurrent] = useState<BackOfficeDestination>('inventory');
  return (
    <SideNav
      current={current}
      counts={{ alerts: 5, inventory: 5 }}
      renderLink={demoLink<BackOfficeDestination>(setCurrent)}
    />
  );
}

export function ConsoleNavDemo() {
  const [current, setCurrent] = useState<ConsoleDestination>('shops');
  return (
    <ConsoleNav
      current={current}
      counts={{ tickets: 4, datarequests: 1 }}
      renderLink={demoLink<ConsoleDestination>(setCurrent)}
    />
  );
}
