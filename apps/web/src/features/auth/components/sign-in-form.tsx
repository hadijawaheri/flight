"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CodeStep } from "./code-step";
import { MobileStep } from "./mobile-step";

export function SignInForm({ next }: { next: string | null }) {
  const [mobile, setMobile] = useState<string | null>(null);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>ورود یا ثبت‌نام</CardTitle>
        <CardDescription>برای ادامه، شماره موبایل خود را وارد کنید.</CardDescription>
      </CardHeader>
      <CardContent>
        {mobile ? (
          <CodeStep mobile={mobile} next={next} onBack={() => setMobile(null)} />
        ) : (
          <MobileStep onSent={setMobile} />
        )}
      </CardContent>
    </Card>
  );
}
