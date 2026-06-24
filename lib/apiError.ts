import { isAxiosError } from "axios";
import type { ApiResponse } from "@/types/api";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<ApiResponse<null>>(error)) {
    return error.response?.data?.error?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
