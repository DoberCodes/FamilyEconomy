import useFamilyActor from '../../hooks/useFamilyActor'
import StatusNote from './StatusNote'

export default function FamilyActorNotice({
  selectionMessage = 'Choose a child in Kids tab to view child-specific information.',
}) {
  const {
    activeChildProfile,
    isParentViewingChild,
    needsChildSelection,
  } = useFamilyActor()

  if (isParentViewingChild) {
    return (
      <StatusNote>
        Kid-friendly view child: {activeChildProfile.avatar} {activeChildProfile.displayName}
      </StatusNote>
    )
  }

  if (needsChildSelection) {
    return <StatusNote>{selectionMessage}</StatusNote>
  }

  return null
}
