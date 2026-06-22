import {
  Home,
  Sparkles,
  BedDouble,
  Truck,
  Bath,
  WashingMachine,
  Wrench,
  Building2,
  Church,
  Store,
  Building,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Home,
  Sparkles,
  BedDouble,
  Truck,
  Bath,
  WashingMachine,
  Wrench,
  Building2,
  Church,
  Store,
  Building,
};

/** Resolve a manifest icon name to a lucide component (falls back to Home). */
export function serviceIcon(name: string): LucideIcon {
  return ICONS[name] ?? Home;
}
