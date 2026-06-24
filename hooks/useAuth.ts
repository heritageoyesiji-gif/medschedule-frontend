import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/axios";
import { setAuthToken } from "@/lib/authToken";
import type {
  ApiResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  InviteTokenInfo,
  LoginRequest,
  LoginResponse,
  MagicLinkRequest,
  MagicLinkResponse,
  MagicLinkVerifyRequest,
  QrLoginVerifyRequest,
  QrTokenResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SignupRequest,
  SignupResponse,
  User,
  UserRole,
} from "@/types/api";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function getRoleRedirectPath(role: UserRole): string {
  if (role === "superadmin") return "/super";
  return role === "admin" ? "/admin" : "/dashboard";
}

async function fetchMe(): Promise<User | null> {
  try {
    const { data } = await api.get<ApiResponse<User>>("/auth/me");
    if (!data.success || !data.data) {
      return null;
    }
    return data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) {
      return null;
    }
    throw error;
  }
}

export function useAuth() {
  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    retry: false,
  });

  return {
    user: query.data ?? null,
    role: query.data?.role ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>(
        "/auth/login",
        credentials,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Login failed");
      }
      return data.data;
    },
    onSuccess: (result) => {
      applyLoginResult(queryClient, result);
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SignupRequest) => {
      const { data } = await api.post<ApiResponse<SignupResponse>>(
        "/auth/signup",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Signup failed");
      }
      return data.data;
    },
    onSuccess: (result) => {
      setAuthToken(result.token);
      void queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

function applyLoginResult(
  queryClient: ReturnType<typeof useQueryClient>,
  result: LoginResponse,
) {
  setAuthToken(result.token);
  queryClient.setQueryData(authKeys.me, result.user);
}

export function useRequestMagicLink() {
  return useMutation({
    mutationFn: async (payload: MagicLinkRequest) => {
      const { data } = await api.post<ApiResponse<MagicLinkResponse>>(
        "/auth/magic-link",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Failed to send magic link");
      }
      return data.data;
    },
  });
}

export function useVerifyMagicLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MagicLinkVerifyRequest) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>(
        "/auth/magic-link/verify",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Magic link verification failed");
      }
      return data.data;
    },
    onSuccess: (result) => {
      applyLoginResult(queryClient, result);
    },
  });
}

async function fetchQrToken(): Promise<QrTokenResponse> {
  const { data } = await api.get<ApiResponse<QrTokenResponse>>("/auth/qr-token");
  if (!data.success || !data.data) {
    throw new Error(data.error?.message ?? "Failed to generate QR code");
  }
  return data.data;
}

export function useQrToken(enabled: boolean) {
  return useQuery({
    queryKey: ["auth", "qr-token"] as const,
    queryFn: fetchQrToken,
    enabled,
    staleTime: 4 * 60 * 1000,
    refetchInterval: 4 * 60 * 1000,
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordRequest) => {
      const { data } = await api.post<ApiResponse<ForgotPasswordResponse>>(
        "/auth/forgot-password",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Request failed");
      }
      return data.data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: ResetPasswordRequest) => {
      const { data } = await api.post<ApiResponse<ResetPasswordResponse>>(
        "/auth/reset-password",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "Reset failed");
      }
      return data.data;
    },
  });
}

export function useInviteInfo(token: string | null) {
  return useQuery({
    queryKey: ["auth", "invite", token] as const,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<InviteTokenInfo>>(`/auth/invite/${token}`);
      if (!data.success || !data.data) throw new Error("Invalid invite link");
      return data.data;
    },
    enabled: Boolean(token),
    retry: false,
  });
}

export function useVerifyQrLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: QrLoginVerifyRequest) => {
      const { data } = await api.post<ApiResponse<LoginResponse>>(
        "/auth/qr-login/verify",
        payload,
      );
      if (!data.success || !data.data) {
        throw new Error(data.error?.message ?? "QR login verification failed");
      }
      return data.data;
    },
    onSuccess: (result) => {
      applyLoginResult(queryClient, result);
    },
  });
}
