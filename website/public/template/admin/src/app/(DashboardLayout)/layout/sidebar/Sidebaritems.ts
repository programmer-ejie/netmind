import { uniqueId } from 'lodash'

export interface ChildItem {
  id?: number | string
  name?: string
  icon?: any
  children?: ChildItem[]
  item?: any
  url?: any
  color?: string
  disabled?: boolean
  subtitle?: string
  badge?: boolean
  badgeType?: string
  isPro?: boolean
}

export interface MenuItem {
  heading?: string
  name?: string
  icon?: any
  id?: number
  to?: string
  items?: MenuItem[]
  children?: ChildItem[]
  url?: any
  disabled?: boolean
  subtitle?: string
  badgeType?: string
  badge?: boolean
  isPro?: boolean
}

const SidebarContent: MenuItem[] = [
  {
    heading: 'Dashboards',
    children: [
      {
        name: "Dashboard",
        icon: "solar:widget-add-line-duotone",
        id: uniqueId(),
        url: "/",
        isPro: false
      },
      {
        name: "Dashboard1",
        icon: "solar:widget-add-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Dashboard2",
        icon: "solar:chart-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Dashboard3",
        icon: "solar:screencast-2-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: 'Front Pages',
        id: uniqueId(),
        icon: 'solar:home-angle-linear',
        url: '#',
        children: [
          {
            name: "Homepage",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "About Us",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Blog",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Blog Details",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Contact Us",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Portfolio",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Pricing",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
        ],
      },
    ],
  },
  {
    heading: 'AI',
    children: [
      {
        name: 'Ai Table Builder',
        icon: 'solar:server-linear',
        id: uniqueId(),
        url: '#!',
        isPro: false,

      },
      {
        name: 'Ai Form Builder',
        icon: 'solar:document-add-linear',
        id: uniqueId(),
        url: '#!',
        isPro: false,

      },
      {
        id: uniqueId(),
        name: 'Ai Chart Builder',
        icon: 'solar:pie-chart-2-linear',
        url: '#!',
        isPro: false,

      },
    ],
  },
  {
    heading: 'Utilities',
    children: [
      {
        name: 'Typography',
        icon: 'solar:text-circle-outline',
        id: uniqueId(),
        url: '/utilities/typography',
      },
      {
        name: 'Table',
        icon: 'solar:server-linear',
        id: uniqueId(),
        url: '/utilities/table',
      },
      {
        name: 'Form',
        icon: 'solar:document-add-linear',
        id: uniqueId(),
        url: '/utilities/form',
      },
      {
        name: "Shadow",
        icon: "solar:airbuds-case-charge-outline",
        id: uniqueId(),
        url: "/utilities/shadow",
      },
      {
        id: uniqueId(),
        name: 'User Profile',
        icon: 'solar:user-circle-linear',
        url: '/user-profile',
        isPro: false,
      },
    ],
  },
  {
    heading: 'Apps',
    children: [
      {
        id: uniqueId(),
        name: 'Notes',
        icon: 'solar:notes-linear',
        url: '/apps/notes',
        isPro: false,
      },
      {
        id: uniqueId(),
        name: 'Tickets',
        icon: 'solar:ticker-star-linear',
        url: '/apps/tickets',
        isPro: false,
      },
      {
        id: uniqueId(),
        name: 'Contacts',
        icon: "solar:phone-line-duotone",
        url: '#!',
        isPro: true,
      },
      {
        name: "Ecommerce",
        id: uniqueId(),
        icon: "solar:cart-3-line-duotone",
        children: [
          {
            id: uniqueId(),
            name: "Shop",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Details",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "List",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Checkout",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Add Product",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Edit Product",
            url:"#!",
            isPro: true
          },
        ],
      },
      {
        name: "Blogs",
        id: uniqueId(),
        icon: "solar:widget-add-line-duotone",
        children: [
          {
            id: uniqueId(),
            name: "Blog Post",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Blog Detail",
            url:"#!",
            isPro: true
          },
        ],
      },
      {
        name: "User Profile",
        id: uniqueId(),
        icon: "solar:shield-user-outline",
        children: [
          {
            id: uniqueId(),
            name: "Profile",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Followers",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Friends",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Gallery",
            url:"#!",
            isPro: true
          },
        ],
      },

      {
        name: "Invoice",
        id: uniqueId(),
        icon: "solar:bill-check-outline",
        children: [
          {
            id: uniqueId(),
            name: "List",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Details",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Create",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Edit",
            url:"#!",
            isPro: true
          },
        ],
      },
      {
        id: uniqueId(),
        name: "Chats",
        icon: "solar:chat-round-line-line-duotone",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Calendar",
        icon: "solar:calendar-mark-line-duotone",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Email",
        icon: "solar:letter-linear",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Kanban",
        icon: "solar:notebook-linear",
        url:"#!",
        isPro: true
      },
    ],
  },

  {
    heading: "Pages",
    children: [
      {
        name: "Pages",
        id: uniqueId(),
        icon: "solar:cloud-file-linear",
        children: [
          {
            name: "Account Setting",
            icon: "solar:settings-minimalistic-line-duotone",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "FAQ",
            icon: "solar:question-circle-line-duotone",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Pricing",
            icon: "solar:dollar-minimalistic-linear",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Landingpage",
            icon: "solar:bill-list-line-duotone",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Roll Base Access",
            icon: "solar:accessibility-broken",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
        ]
      },
    ],
  },


  {
    isPro: true,
    heading: "Widgets",
    children: [
      {
        id: uniqueId(),
        name: "Cards",
        icon: "solar:cardholder-line-duotone",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Banners",
        icon: "solar:align-vertical-spacing-line-duotone",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Charts",
        icon: "solar:chart-square-line-duotone",
        url:"#!",
        isPro: true
      },
    ],
  },

  {
    isPro: true,
    heading: "UI",
    children: [
      {
        name: "Ui Elements",
        id: uniqueId(),
        icon: "solar:widget-6-outline",
        children: [
          {
            id: uniqueId(),
            name: "Accordian",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Badge",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Button",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Dropdowns",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Modals",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Tab",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Tooltip",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Alert",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Progressbar",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Pagination",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Breadcrumbs",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Drawer",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Lists",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Carousel",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Spinner",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Avatar",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Banner",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Button Group",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Card",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Datepicker",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Footer",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "KBD",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Mega Menu",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Navbar",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Popover",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Rating",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Sidebar",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Tables",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Timeline",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Toast",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Typography",
            url:"#!",
            isPro: true
          },
        ],
      },
    ],
  },
  {
    isPro: true,
    heading: "Headless Ui",
    children: [
      {
        name: "Ui Elements",
        id: uniqueId(),
        icon: "solar:text-underline-cross-broken",
        children: [
          {
            name: "Dropdown",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Disclosure",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Dialog",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Popover",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Tabs",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Transition",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
        ],
      },
      {
        name: "Form Elements",
        id: uniqueId(),
        icon: "solar:align-vertical-spacing-line-duotone",
        children: [
          {
            id: uniqueId(),
            name: "Buttons",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Checkbox",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Combobox",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Fieldset",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Input",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Listbox",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Radio Group",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Select",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Switch",
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Textarea",
            url:"#!",
            isPro: true
          },
        ],
      },
    ],
  },

  {
    isPro: true,
    heading: "Tables",
    children: [
      {
        name: "Basic Tables",
        icon: "solar:tablet-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Striped Rows Table",
        icon: "solar:tablet-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Hover Table",
        icon: "solar:tablet-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Checkbox Table",
        icon: "solar:tablet-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
    ],
  },

  {
    isPro: true,
    heading: "React Tables",

    children: [
      {
        name: "React Tables",
        id: uniqueId(),
        icon: "solar:round-transfer-vertical-broken",
        children: [
          {
            id: uniqueId(),
            name: "Basic",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Dense",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Sorting",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Filtering",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Pagination",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Row Selection",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Column Visibility",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Editable",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Sticky",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Drag & Drop",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Empty",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
          {
            id: uniqueId(),
            name: "Expanding",
            icon: 'solar:round-transfer-vertical-broken',
            url:"#!",
            isPro: true
          },
        ]
      },
    ],
  },

  {
    isPro: true,
    heading: "Charts",
    children: [
      {
        name: "Line Chart",
        icon: "solar:chart-square-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Area Chart",
        icon: "solar:graph-new-broken",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Gradient Chart",
        icon: "solar:round-graph-outline",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Candlestick",
        icon: "solar:chandelier-outline",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Column",
        icon: "solar:chart-2-bold-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Doughnut & Pie",
        icon: "solar:pie-chart-2-linear",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
      {
        name: "Radialbar & Radar",
        icon: "solar:graph-line-duotone",
        id: uniqueId(),
        url:"#!",
        isPro: true
      },
    ],
  },

  {
    isPro: true,
    heading: "Forms",
    children: [
      {
        id: uniqueId(),
        name: "Forms Elements",
        icon: "solar:text-selection-line-duotone",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Forms Layouts",
        icon: "solar:document-text-outline",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Forms Horizontal",
        icon: "solar:slider-horizontal-line-duotone",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Forms Vertical",
        icon: "solar:slider-vertical-line-duotone",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Forms Custom",
        icon: "solar:document-text-outline",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Form Validation",
        icon: "solar:bill-check-linear",
        url:"#!",
        isPro: true
      },
    ],
  },
  {
    isPro: true,
    heading: "Auth",
    children: [
      {
        name: "Login",
        icon: "solar:login-2-linear",
        id: uniqueId(),
        url: "/auth/login",
        isPro: false
      },
      {
        name: "Register",
        icon: "solar:shield-user-outline",
        id: uniqueId(),
        url: "/auth/register",
        isPro: false
      },
      {
        name: "Auth Pages",
        id: uniqueId(),
        icon: "solar:user-plus-rounded-line-duotone",
        children: [
          {
            name: "Error",
            icon: "solar:bug-minimalistic-line-duotone",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Side Login",
            icon: "solar:login-3-line-duotone",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Boxed Login",
            icon: "solar:login-3-line-duotone",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Side Register",
            icon: "solar:user-plus-rounded-line-duotone",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Boxed Register",
            icon: "solar:user-plus-rounded-line-duotone",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Side Forgot Pwd",
            icon: "solar:password-outline",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Boxed Forgot Pwd",
            icon: "solar:password-outline",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Side Two Steps",
            icon: "solar:password-outline",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Boxed Two Steps",
            icon: "solar:password-outline",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
          {
            name: "Maintenance",
            icon: "solar:settings-outline",
            id: uniqueId(),
            url:"#!",
            isPro: true
          },
        ]
      },
    ],
  },
  {
    isPro: true,
    heading: "Icons",
    children: [
      {
        id: uniqueId(),
        name: "Solar Icons",
        icon: "solar:sticker-smile-circle-outline",
        url:"#!",
        isPro: true
      },
      {
        id: uniqueId(),
        name: "Tabler Icons",
        icon: "solar:sticker-smile-circle-outline",
        url:"#!",
        isPro: true
      },
    ],
  },
  {
    isPro: true,
    heading: "Extra",
    children: [
      {
        name: "Icons",
        icon: "solar:smile-circle-outline",
        id: uniqueId(),
        url: "/icons/solar",
        isPro: false
      },
      {
        name: "Sample Page",
        icon: "solar:notes-minimalistic-outline",
        id: uniqueId(),
        url: "/sample-page",
        isPro: false
      },
    ],
  },
]

export default SidebarContent
