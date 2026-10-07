import Link from "next/link";

import { Button } from "@/components/ui/button";
import { paths } from "@/lib/paths";

import { JourneyColumn, JourneyPanel } from "./journey-panel";

const STARTER_QUESTIONS = [
  "پاوربانک در پرواز مجاز است؟",
  "اگر پرواز کنسل شود چه حقی دارم؟",
  "برای پرواز خارجی چه مدارکی لازم است؟",
] as const;

export function AssistantSection() {
  return (
    <section aria-labelledby="ask-title" className="reveal py-6">
      <JourneyColumn>
        <JourneyPanel className="flex flex-col gap-6">
          <div className="flex max-w-2xl flex-col gap-2">
            <h2 id="ask-title" className="text-2xl font-extrabold text-balance md:text-3xl">
              هر سؤالی درباره‌ی پرواز دارید بپرسید
            </h2>
            <p className="text-muted-foreground md:text-lg">
              جواب از پایگاه قوانین می‌آید، منبعش کنارش است و هر چه را ایرلاین تعیین می‌کند یا زود
              عوض می‌شود جدا می‌گوییم.
            </p>
          </div>
          <ul className="flex flex-wrap gap-3" role="list">
            {STARTER_QUESTIONS.map((question) => (
              <li key={question}>
                <Link
                  href={`${paths.assistant}?q=${encodeURIComponent(question)}`}
                  className="bg-secondary text-secondary-foreground hover:bg-accent focus-visible:ring-ring/50 inline-flex rounded-full px-5 py-3 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-3 md:text-base"
                >
                  {question}
                </Link>
              </li>
            ))}
          </ul>
          <div>
            <Button asChild variant="outline">
              <Link href={paths.rules}>مرور همه‌ی قوانین پرواز</Link>
            </Button>
          </div>
        </JourneyPanel>
      </JourneyColumn>
    </section>
  );
}
