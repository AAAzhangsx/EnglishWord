import { useQuery } from '@tanstack/react-query';
import { api, ApiError, type StudyState } from './api';

/** 当前登录用户；未登录（401）返回 null，不作为错误处理。 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return (await api.me()).user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 30_000,
  });
}

/** 当前背诵会话；没有会话时后端返回 404，这里显式区分出来。 */
export function useStudyState() {
  const query = useQuery({
    queryKey: ['study'],
    queryFn: api.study,
    staleTime: 0,
    retry: false,
  });
  const noSession = query.error instanceof ApiError && query.error.status === 404;
  return {
    ...query,
    state: query.data as StudyState | undefined,
    noSession,
  };
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
