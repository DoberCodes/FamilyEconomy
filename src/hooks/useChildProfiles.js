import useHouseholdOnboardingData from './useHouseholdOnboardingData'

export default function useChildProfiles(options = {}) {
  const householdData = useHouseholdOnboardingData(options)

  return {
    ...householdData,
    children: householdData.childProfiles,
  }
}
