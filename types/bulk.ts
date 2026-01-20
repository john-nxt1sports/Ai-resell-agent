import { UploadedImage } from "./index";

export interface BulkListingItem {
  id: string;
  title: string;
  price: number;
  images: string[];
  tempImages?: UploadedImage[];
  status: "pending" | "ready" | "error";
  error?: string;
}
