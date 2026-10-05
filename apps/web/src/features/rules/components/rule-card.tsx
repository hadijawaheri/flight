import { RULE_CATEGORY_LABELS, type RuleEntryDto } from "@flysmart/contracts";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { paths } from "@/lib/paths";

import { ReliabilityBadge } from "./reliability-badge";

export function RuleCard({ rule }: { rule: RuleEntryDto }) {
  return (
    <Card className="p-0">
      <Link
        href={paths.rule(rule.id)}
        className="hover:bg-muted/50 focus-visible:ring-ring/50 flex h-full flex-col gap-2 rounded-xl p-4 outline-none focus-visible:ring-3"
      >
        <span className="text-muted-foreground text-xs">{RULE_CATEGORY_LABELS[rule.category]}</span>
        <h3 className="text-base font-bold">{rule.title}</h3>
        <p className="text-muted-foreground line-clamp-3 text-sm">{rule.summary}</p>
        <ReliabilityBadge reliability={rule.reliability} className="mt-auto w-fit" />
      </Link>
    </Card>
  );
}
