import { useCallback } from 'react'

import {
  getFamilyEconomyQueryErrorMessage,
  useApproveSavingsGoalCompletionMutation,
  useClearChildSessionCodeMutation,
  useCreateChildProfileMutation,
  useCreateFeedbackEntryMutation,
  useCreateGoalMutation,
  useCreateHouseholdMutation,
  useCreateJobMutation,
  useCreateRewardMutation,
  useDeleteChildProfileMutation,
  useDismissAllRewardNotificationsMutation,
  useDismissRewardNotificationMutation,
  useFulfillRewardRequestMutation,
  useGetHouseholdOnboardingDataQuery,
  useGetParentCommandCenterDataQuery,
  useMarkJobAsMissedMutation,
  useResolveRewardRequestAsPoolMutation,
  useReviewJobCheckRequestMutation,
  useReviewRewardRequestMutation,
  useReviewSavingsGoalRequestMutation,
  useSetChildAllowSessionCodeMutation,
  useSetChildSessionSecurityMutation,
  useSetFamilyAnnouncementMutation,
  useUpdateChildProfileMutation,
  useUpdateJobMutation,
  useUpdateRewardMutation,
} from '../store/familyEconomyApi'

export default function useParentCommandCenterData({
  familyId,
  userId,
  userRole,
  userEmail,
  isParent,
  parentControlsUnlocked,
}) {
  const [approveSavingsGoalCompletionMutation] = useApproveSavingsGoalCompletionMutation()
  const [clearChildSessionCodeMutation] = useClearChildSessionCodeMutation()
  const [createChildProfileMutation] = useCreateChildProfileMutation()
  const [createFeedbackEntryMutation] = useCreateFeedbackEntryMutation()
  const [createGoalMutation] = useCreateGoalMutation()
  const [createHouseholdMutation] = useCreateHouseholdMutation()
  const [createJobMutation] = useCreateJobMutation()
  const [createRewardMutation] = useCreateRewardMutation()
  const [deleteChildProfileMutation] = useDeleteChildProfileMutation()
  const [dismissAllRewardNotificationsMutation] = useDismissAllRewardNotificationsMutation()
  const [dismissRewardNotificationMutation] = useDismissRewardNotificationMutation()
  const [fulfillRewardRequestMutation] = useFulfillRewardRequestMutation()
  const [markJobAsMissedMutation] = useMarkJobAsMissedMutation()
  const [resolveRewardRequestAsPoolMutation] = useResolveRewardRequestAsPoolMutation()
  const [reviewJobCheckRequestMutation] = useReviewJobCheckRequestMutation()
  const [reviewRewardRequestMutation] = useReviewRewardRequestMutation()
  const [reviewSavingsGoalRequestMutation] = useReviewSavingsGoalRequestMutation()
  const [setChildAllowSessionCodeMutation] = useSetChildAllowSessionCodeMutation()
  const [setChildSessionSecurityMutation] = useSetChildSessionSecurityMutation()
  const [setFamilyAnnouncementMutation] = useSetFamilyAnnouncementMutation()
  const [updateChildProfileMutation] = useUpdateChildProfileMutation()
  const [updateJobMutation] = useUpdateJobMutation()
  const [updateRewardMutation] = useUpdateRewardMutation()

  const context = {
    familyId,
    userId,
    userRole,
    userEmail,
  }
  const parentQueryContext = {
    familyId,
    userId,
    userRole,
    selectedChildId: null,
  }
  const shouldLoadHouseholdData = isParent && Boolean(familyId)
  const shouldLoadParentCommandCenterData = shouldLoadHouseholdData && parentControlsUnlocked
  const householdQuery = useGetHouseholdOnboardingDataQuery(parentQueryContext, {
    skip: !shouldLoadHouseholdData,
  })
  const parentCommandCenterQuery = useGetParentCommandCenterDataQuery(parentQueryContext, {
    skip: !shouldLoadParentCommandCenterData,
  })

  const refreshParentCommandCenterData = useCallback(async () => {
    if (!shouldLoadParentCommandCenterData) {
      throw new Error('Parent controls must be unlocked to load manager data.')
    }

    try {
      return await parentCommandCenterQuery.refetch().unwrap()
    } catch (caughtError) {
      throw new Error(
        getFamilyEconomyQueryErrorMessage(caughtError, 'Could not load manager data.'),
        { cause: caughtError },
      )
    }
  }, [parentCommandCenterQuery, shouldLoadParentCommandCenterData])

  const actions = {
    approveSavingsGoalCompletion: (goalId) => approveSavingsGoalCompletionMutation({
      goalId,
      context,
    }).unwrap(),
    clearChildSessionCode: (childId) => clearChildSessionCodeMutation({
      childId,
      context,
    }).unwrap(),
    createChildProfile: (childProfile) => createChildProfileMutation({
      childProfile,
      context,
    }).unwrap(),
    createFeedbackEntry: (feedbackPayload) => createFeedbackEntryMutation({
      feedbackPayload,
      context,
    }).unwrap(),
    createGoal: (goalPayload) => createGoalMutation({
      goalPayload,
      context,
    }).unwrap(),
    createHousehold: (household) => createHouseholdMutation({
      household,
      context,
    }).unwrap(),
    createJob: (jobPayload) => createJobMutation({
      jobPayload,
      context,
    }).unwrap(),
    createReward: (rewardPayload) => createRewardMutation({
      rewardPayload,
      context,
    }).unwrap(),
    deleteChildProfile: (childId) => deleteChildProfileMutation({
      childId,
      context,
    }).unwrap(),
    dismissAllRewardNotifications: () => dismissAllRewardNotificationsMutation({
      context,
    }).unwrap(),
    dismissRewardNotification: (requestId) => dismissRewardNotificationMutation({
      requestId,
      context,
    }).unwrap(),
    fulfillRewardRequest: (requestId) => fulfillRewardRequestMutation({
      requestId,
      context,
    }).unwrap(),
    markJobAsMissed: (jobId) => markJobAsMissedMutation({
      jobId,
      context,
    }).unwrap(),
    resolveRewardRequestAsPool: (requestId, rewardPayload, options = {}) => resolveRewardRequestAsPoolMutation({
      requestId,
      rewardPayload,
      context,
      options,
    }).unwrap(),
    reviewJobCheckRequest: (requestId, decision) => reviewJobCheckRequestMutation({
      requestId,
      decision,
      context,
    }).unwrap(),
    reviewRewardRequest: (requestId, decision, options = {}) => reviewRewardRequestMutation({
      requestId,
      decision,
      context,
      options,
    }).unwrap(),
    reviewSavingsGoalRequest: (goalId, decision, options = {}) => reviewSavingsGoalRequestMutation({
      goalId,
      decision,
      context,
      options,
    }).unwrap(),
    setChildAllowSessionCode: (childId, allowed) => setChildAllowSessionCodeMutation({
      childId,
      allowed,
      context,
    }).unwrap(),
    setChildSessionSecurity: (enabled) => setChildSessionSecurityMutation({
      enabled,
      context,
    }).unwrap(),
    setFamilyAnnouncement: (announcement) => setFamilyAnnouncementMutation({
      announcement,
      context,
    }).unwrap(),
    updateChildProfile: (childId, childProfile) => updateChildProfileMutation({
      childId,
      childProfile,
      context,
    }).unwrap(),
    updateJob: (jobId, jobPayload) => updateJobMutation({
      jobId,
      jobPayload,
      context,
    }).unwrap(),
    updateReward: (rewardId, rewardPayload) => updateRewardMutation({
      rewardId,
      rewardPayload,
      context,
    }).unwrap(),
  }

  return {
    actions,
    householdData: householdQuery.data || null,
    householdDataError: householdQuery.error || null,
    parentCommandCenterData: parentCommandCenterQuery.data || null,
    parentCommandCenterError: parentCommandCenterQuery.error || null,
    refreshParentCommandCenterData,
    shouldLoadHouseholdData,
    shouldLoadParentCommandCenterData,
  }
}
