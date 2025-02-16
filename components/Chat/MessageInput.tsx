import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChangeEvent, FormEvent } from "react";

interface MessageInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
}

export default function MessageInput({
  input,
  handleInputChange,
  onSubmit,
  disabled,
}: MessageInputProps) {
  return (
    <form onSubmit={onSubmit} className="flex space-x-2">
      <Input
        value={input}
        onChange={handleInputChange}
        placeholder="Type your message..."
        className="flex-grow"
      />
      <Button type="submit" disabled={disabled}>
        Send
      </Button>
    </form>
  );
}
