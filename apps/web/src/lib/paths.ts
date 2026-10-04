export const paths = {
  home: "/",
  signIn: "/sign-in",
  dashboard: "/dashboard",
  flights: "/flights",
  deals: "/deals",
  explore: "/explore",
  checkout: (id: string) => `/checkout/${id}`,
  checkoutResult: (id: string) => `/checkout/${id}/result`,
  passengers: "/dashboard/passengers",
  bookings: "/dashboard/bookings",
  priceAlerts: "/dashboard/price-alerts",
  profile: "/dashboard/profile",
} as const;
