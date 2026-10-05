"use client";

import { parseFlightId } from "@flysmart/contracts";
import { MessageCircleQuestionIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { paths } from "@/lib/paths";

import { useAssistantChat } from "../use-assistant-chat";
import { ChatPanel } from "./chat-panel";

const FLIGHT_PATH = /^\/flights\/([A-Z0-9]+)$/;
const BOOKING_PATH = /^\/dashboard\/bookings\/([a-f0-9]{24})$/;

/** The page the traveller is on becomes the conversation's context, so "how much is the refund?" needs no ids. */
function contextFor(pathname: string) {
  const flight = FLIGHT_PATH.exec(pathname)?.[1];
  if (flight && parseFlightId(flight)) return { flightId: flight };
  const booking = BOOKING_PATH.exec(pathname)?.[1];
  if (booking) return { bookingId: booking };
  return undefined;
}

export function AssistantWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Lives here, not in the panel: closing the sheet or changing page keeps the conversation.
  const chat = useAssistantChat(contextFor(pathname));

  // The full page already is the assistant; a second entry point there would only be noise.
  if (pathname === paths.assistant) return null;

  return (
    <div className="print:hidden">
      <Button
        type="button"
        size="lg"
        className="fixed start-4 bottom-4 z-40 h-12 rounded-full px-5 shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="باز کردن دستیار پرواز"
      >
        <MessageCircleQuestionIcon data-icon="inline-start" />
        دستیار پرواز
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="end" className="gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>دستیار پرواز</SheetTitle>
            <SheetDescription>قوانین بار، مدارک، استرداد و فرودگاه‌ها را می‌داند.</SheetDescription>
          </SheetHeader>
          <ChatPanel chat={chat} className="flex-1" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
