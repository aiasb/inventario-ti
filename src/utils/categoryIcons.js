import {
  Laptop, Monitor, Server, Printer, Network, Phone, Package, Box,
  Cpu, HardDrive, Wifi, Camera, Headphones, Keyboard, Mouse,
  Tablet, Watch, Tv, Smartphone, Router,
} from 'lucide-react'

export const ICON_MAP = {
  Laptop, Monitor, Server, Printer, Network, Phone, Package, Box,
  Cpu, HardDrive, Wifi, Camera, Headphones, Keyboard, Mouse,
  Tablet, Watch, Tv, Smartphone, Router,
}

export function resolveIcon(name) {
  return ICON_MAP[name] ?? Box
}
