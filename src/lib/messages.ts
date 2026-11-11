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
    case "like_long":
      return copy.likeLong;
    case "like_many":
      return copy.likeMany;
    case "photo_big":
      return copy.photoBig;
    case "photo_type":
      return copy.photoType;
    default:
      return copy.offline;
  }
}
