import { v4 as uuid } from "uuid";

const NavbarDefaultRoutes = [
  {
    id: uuid(),
    menuitem: "Explorer",
    link: "/",
  },
  {
    id: uuid(),
    menuitem: "Analytics",
    link: "/analytics",
  },
  {
    id: uuid(),
    menuitem: "Wallet",
    link: "/wallet",
  },
];

export default NavbarDefaultRoutes;
