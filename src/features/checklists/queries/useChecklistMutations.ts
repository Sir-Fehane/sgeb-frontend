import { useMutation, useQueryClient } from '@tanstack/react-query'

import { checklistsQueryKeys } from '@/features/checklists/queries/checklistsQueryKeys'
import {
  createChecklist,
  deactivateChecklist,
  updateChecklist,
} from '@/features/checklists/services/checklistsApi'
import type {
  CreateChecklistInput,
  UpdateChecklistInput,
} from '@/features/checklists/types/checklists'
import { montageQueryKeys } from '@/features/events/montage/queries/montageQueryKeys'

/** Every mutation also invalidates `montageQueryKeys.checklistTemplates()` — the Montage screen's own `montaje`-filtered template cache — so a captain who just created/edited/deactivated a `montaje` template sees it reflected there without a manual refresh. Harmless no-op invalidation when the edited template is `servicio`/`cierre`. */
function invalidateChecklistCaches(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: checklistsQueryKeys.list() })
  void queryClient.invalidateQueries({ queryKey: montageQueryKeys.checklistTemplates() })
}

export function useCreateChecklistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateChecklistInput) => createChecklist(input),
    onSuccess: () => invalidateChecklistCaches(queryClient),
  })
}

export function useUpdateChecklistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      idChecklist,
      input,
    }: {
      idChecklist: number
      input: UpdateChecklistInput
    }) => updateChecklist(idChecklist, input),
    onSuccess: () => invalidateChecklistCaches(queryClient),
  })
}

export function useDeactivateChecklistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (idChecklist: number) => deactivateChecklist(idChecklist),
    onSuccess: () => invalidateChecklistCaches(queryClient),
  })
}
