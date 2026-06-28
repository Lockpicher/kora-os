import * as React from "react"
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Bookmark,
  Sliders,
  Truck,
  ShoppingCart,
  Webhook,
  BriefcaseBusiness,
} from "lucide-react"

export type NavItem = {
  name: string
  href: string
  icon: React.ElementType
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const navigationGroups: NavGroup[] = [
  {
    label: "GENERAL",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ]
  },
  {
    label: "OPERACIONES",
    items: [
      { name: "Work", href: "/work", icon: BriefcaseBusiness },
    ]
  },
  {
    label: "CATÁLOGO",
    items: [
      { name: "Productos", href: "/products", icon: Package },
      { name: "Categorías", href: "/categories", icon: FolderTree },
      { name: "Marcas", href: "/brands", icon: Bookmark },
      { name: "Atributos", href: "/attributes", icon: Sliders },
    ]
  },
  {
    label: "ABASTECIMIENTO",
    items: [
      { name: "Proveedores", href: "/suppliers", icon: Truck },
      { name: "Compras", href: "/purchase-orders", icon: ShoppingCart },
    ]
  },
  {
    label: "INTEGRACIONES",
    items: [
      { name: "Integraciones", href: "/integrations", icon: Webhook },
    ]
  }
]
