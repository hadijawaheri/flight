import { paths } from "@/lib/paths";

export const NAV_ITEMS = [
  { href: paths.flights, label: "جست‌وجوی پرواز" },
  { href: paths.deals, label: "پیشنهاد ویژه" },
  { href: paths.explore, label: "کجا بروم؟" },
  { href: paths.rules, label: "قوانین پرواز" },
  { href: paths.assistant, label: "دستیار" },
] as const;
