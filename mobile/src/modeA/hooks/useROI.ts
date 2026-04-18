import { useMutation } from '@tanstack/react-query';

import { api } from '@/shared/api';
import type { ROIRequest, ROIResult } from '@/shared/types';

export function useROI() {
  return useMutation<ROIResult, Error, ROIRequest>({
    mutationFn: (req) => api.roi(req),
  });
}
