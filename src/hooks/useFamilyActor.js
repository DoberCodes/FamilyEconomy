import { useAuth } from '../context/AuthContext'

const LOCAL_CHILD_SESSION_USER_ID = 'kid-device'
const LOCAL_CHILD_SESSION_ROLE = 'kid'

export default function useFamilyActor() {
  const auth = useAuth()
  const effectiveRole = auth.userRole || LOCAL_CHILD_SESSION_ROLE
  const effectiveUserId = auth.userId || LOCAL_CHILD_SESSION_USER_ID
  const selectedChildId = auth.activeChildProfile?.id || null

  return {
    ...auth,
    effectiveRole,
    effectiveUserId,
    selectedChildId,
    isParent: effectiveRole === 'parent',
    isKidSession: effectiveRole !== 'parent',
    isParentViewingChild: effectiveRole === 'parent' && Boolean(selectedChildId),
    needsChildSelection: effectiveRole === 'parent' && !selectedChildId,
  }
}
