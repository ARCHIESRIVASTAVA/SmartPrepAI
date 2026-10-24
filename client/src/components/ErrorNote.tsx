import { CircleAlert } from "lucide-react";

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="error-note" role="alert">
      <CircleAlert size={16} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
