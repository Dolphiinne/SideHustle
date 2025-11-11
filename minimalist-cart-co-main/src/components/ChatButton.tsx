import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ChatWindow } from "./ChatWindow";

export const ChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
    </>
  );
};
