import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:7782";

export const SITE_NAME = "پرواز پلاس";

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} | خرید بلیت هواپیما با تحلیل قیمت`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "جست‌وجوی پرواز داخلی و خارجی، تحلیل هوشمند قیمت (الان بخرم یا صبر کنم؟) و دستیاری که قوانین بار، مدارک و استرداد را می‌داند.",
  openGraph: { locale: "fa_IR", type: "website", siteName: SITE_NAME },
};

export const privatePage: Metadata = { robots: { index: false, follow: false } };
