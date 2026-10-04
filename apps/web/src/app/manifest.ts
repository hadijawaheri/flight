import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "اسکلت پروژه",
    short_name: "اسکلت",
    lang: "fa",
    dir: "rtl",
    start_url: "/",
    display: "standalone",
  };
}
