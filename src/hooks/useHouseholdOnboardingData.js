import { getHouseholdOnboardingData } from '../services/familyEconomyService'
import useFamilyResource from './useFamilyResource'

const EMPTY_ARRAY = Object.freeze([])

export default function useHouseholdOnboardingData(options = {}) {
  const resource = useFamilyResource(getHouseholdOnboardingData, {
    defaultErrorMessage: 'Could not load household setup data.',
    ...options,
  })
  const { data } = resource

  return {
    ...resource,
    familyExists: Boolean(data?.familyExists),
    family: data?.family || null,
    childProfiles: data?.childProfiles || EMPTY_ARRAY,
    jobs: data?.jobs || EMPTY_ARRAY,
    rewards: data?.rewards || EMPTY_ARRAY,
  }
}
