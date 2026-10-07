import {
  ApproachSpacer,
  AssistantSection,
  CloseSection,
  DealsSection,
  HeroSection,
  Journey,
  PassSpacer,
  PromisesSection,
} from "@/features/landing";
import { tehranToday } from "@/lib/format";

/** One flight: the airliner arrives over the hero and climbs away, then morning turns to night down the page. */
export default function HomePage() {
  return (
    <Journey>
      <HeroSection today={tehranToday()} />
      <ApproachSpacer />
      <PassSpacer id="s1" />
      <DealsSection />
      <PromisesSection />
      <PassSpacer id="s2" />
      <AssistantSection />
      <PassSpacer id="s3" />
      <CloseSection />
    </Journey>
  );
}
