import { v4 as uuid } from "uuid";

const NavbarDefaultRoutes = [
  {
    id: uuid(),
    menuitem: "Chains",
    link: "#",
    children: [
      {
        id: uuid(),
        header: true,
        header_text: "Chains",
      },
      {
        id: uuid(),
        menuitem: "Create a Chain",
        link: "/create-chain",
      },
      {
        id: uuid(),
        header: true,
      },
      {
        id: uuid(),
        header: true,
        header_text: "Find a Chain",
      },
      {
        id: uuid(),
        menuitem: "All",
        link: "/chain-finder/all-chains",
      },
      {
        id: uuid(),
        menuitem: "Startups and Business",
        link: "/chain-finder/startups-and-business",
      },
      {
        id: uuid(),
        menuitem: "Social Causes",
        link: "/chain-finder/social-causes",
      },
      {
        id: uuid(),
        menuitem: "Emergencies",
        link: "/chain-finder/emergencies",
      },
      {
        id: uuid(),
        menuitem: "Medical",
        link: "/chain-finder/medical",
      },
      {
        id: uuid(),
        menuitem: "Film and Arts",
        link: "/chain-finder/film-and-arts",
      },
      {
        id: uuid(),
        menuitem: "Spiritual",
        link: "/chain-finder/spiritual",
      },
      {
        id: uuid(),
        menuitem: "Events",
        link: "/chain-finder/events",
      },
      {
        id: uuid(),
        menuitem: "Legal",
        link: "/chain-finder/legal",
      },
      {
        id: uuid(),
        menuitem: "Political",
        link: "/chain-finder/political",
      },
      {
        id: uuid(),
        menuitem: "Other",
        link: "/chain-finder/other",
      },
    ],
  },
  {
    id: uuid(),
    menuitem: "Help",
    children: [
      {
        id: uuid(),
        header: true,
        header_text: "Help",
      },
      {
        id: uuid(),
        menuitem: "FAQ",
        link: "/help/frequently-asked-questions",
      },
      {
        id: uuid(),
        menuitem: "Contact Us",
        link: "/help/contact-us",
      },
    ],
  },
];

export default NavbarDefaultRoutes;
