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

export const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Work", href: "/work", icon: BriefcaseBusiness },
  { name: "Productos", href: "/products", icon: Package },
  { name: "Categorías", href: "/categories", icon: FolderTree },
  { name: "Marcas", href: "/brands", icon: Bookmark },
  { name: "Atributos", href: "/attributes", icon: Sliders },
  { name: "Proveedores", href: "/suppliers", icon: Truck },
  { name: "Compras", href: "/purchase-orders", icon: ShoppingCart },
  { name: "Integraciones", href: "/integrations", icon: Webhook },
]
