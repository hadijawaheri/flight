"use client";

import { Card } from "@/components/ui/card";

import { useAssistantChat } from "../use-assistant-chat";
import { ChatPanel } from "./chat-panel";

interface AssistantPageViewProps {
  initialQuestion?: string;
  bookingId?: string;
}

export function AssistantPageView({ initialQuestion, bookingId }: AssistantPageViewProps) {
  const chat = useAssistantChat(bookingId ? { bookingId } : undefined);

  return (
    <Card className="h-[calc(100dvh-14rem)] min-h-[28rem] gap-0 overflow-hidden p-0">
      <ChatPanel chat={chat} {...(initialQuestion ? { initialQuestion } : {})} className="h-full" />
    </Card>
  );
}
