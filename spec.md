# Heritage Monitor

## Current State
The app stores structures, damage entries, and image defects in stable variables with pre/postupgrade hooks. However, the `accessControlState` (userRoles map and adminAssigned flag) and `userProfiles` map are stored in regular heap memory -- NOT stable memory. This means every canister upgrade wipes all user role assignments and profiles, causing users to appear unregistered and the dashboard to load empty.

## Requested Changes (Diff)

### Add
- Stable variables for `userRoles` entries and `adminAssigned` flag in preupgrade/postupgrade
- Stable variable for `userProfiles` entries in preupgrade/postupgrade

### Modify
- `preupgrade` system hook: also save accessControlState.userRoles and adminAssigned, and userProfiles
- `postupgrade` system hook: also restore accessControlState.userRoles and adminAssigned, and userProfiles

### Remove
- Nothing removed

## Implementation Plan
1. Add `stable var stableUserRoles : [(Principal, UserRole)] = []` and `stable var stableAdminAssigned : Bool = false` and `stable var stableUserProfiles : [(Principal, UserProfile)] = []`
2. In `preupgrade`: save accessControlState.userRoles.entries().toArray() and adminAssigned and userProfiles.entries().toArray()
3. In `postupgrade`: restore all three maps from stable vars
