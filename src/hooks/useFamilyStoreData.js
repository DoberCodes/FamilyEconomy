import { getFamilyStoreData } from '../services/familyEconomyService'
import useFamilyResource from './useFamilyResource'

export default function useFamilyStoreData(options = {}) {
  const resource = useFamilyResource(getFamilyStoreData, {
    ...options,
    defaultErrorMessage: 'Could not load reward store.',
  })
  const { data } = resource

  return {
    ...resource,
    rewards: data?.rewards || [],
    requests: data?.requests || [],
  }
}
