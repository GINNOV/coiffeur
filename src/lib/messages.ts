import { copy } from "@/lib/copy";

export function messageForCode(code: string): string {
  switch (code) {
    case "occupied":
      return copy.occupied;
    case "closed":
      return copy.closed;
    case "empty":
      return copy.emptyVisit;
    case "stale":
      return copy.stale;
    case "phone_taken":
      return copy.phoneTaken;
    default:
      return copy.offline;
  }
}
