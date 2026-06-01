import { getFamilyDashboard } from '../services/familyEconomyService'
import useFamilyResource from './useFamilyResource'

export default function useFamilyDashboard(options = {}) {
  const resource = useFamilyResource(getFamilyDashboard, {
    ...options,
    defaultErrorMessage: 'Could not load family dashboard.',
  })
  const { data } = resource

  return {
    ...resource,
    jobs: data?.jobs || [],
    goals: data?.goals || [],
    dashboard: data?.dashboard || null,
  }
}
