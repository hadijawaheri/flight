import { SearchForm } from "@/features/search";

import { JourneyColumn, JourneyPanel } from "./journey-panel";

/**
 * The first screen of the flight. The upper sky is left open for the airliner, which starts as a speck
 * there and grows as the page scrolls; the headline and the search sit at the bottom so the primary
 * action is in the first viewport on every device.
 */
export function HeroSection({ today }: { today: string }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="flex min-h-[calc(100svh-4.25rem)] flex-col justify-end pt-24 pb-8 md:pb-12"
    >
      <JourneyColumn className="flex flex-col gap-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h1
            id="hero-title"
            className="text-4xl leading-[1.3] font-black tracking-tight text-balance md:text-6xl md:leading-[1.25]"
          >
            قیمت را بفهمید، بعد بلیت بخرید
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-pretty md:text-xl md:leading-9">
            برای هر پرواز می‌گوییم الان بخرید یا صبر کنید، و دستیار پرواز پلاس قوانین بار، مدارک و
            استرداد را برایتان روشن می‌کند.
          </p>
        </div>
        <JourneyPanel id="search" className="scroll-mt-20 p-4 md:p-6">
          <SearchForm today={today} />
        </JourneyPanel>
      </JourneyColumn>
    </section>
  );
}
