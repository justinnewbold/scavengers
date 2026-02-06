# App Review - Improvement Todo List

## Critical
- [x] **#1** Gemini API key exposed in URL query parameter (`lib/gemini.ts:20,70`) - Move to `x-goog-api-key` header
- [ ] **#2** Zero accessibility attributes across entire app - Add `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` to all interactive elements
- [x] **#3** No auth guards on most protected screens - Add `useRequireAuth` hook or wrapper component

## High Priority
- [x] **#4** Seven stores missing persist middleware - Add to `seriesStore`, `achievementStore`, `teamStore`, `socialStore`, `discoveryStore`, `eventsStore`
- [x] **#5** Race conditions in offline storage (`lib/offlineStorage.ts:108-126,171-198`) - Add mutex/lock for read-modify-write operations
- [ ] **#6** Stale closure in `soloModeStore.finishSoloHunt` (`store/soloModeStore.ts:256`) - Snapshot state once at start of function
- [x] **#7** Social store like/unlike race condition (`store/socialStore.ts:225-295`) - Add in-flight tracking to prevent concurrent toggle
- [ ] **#8** Vulnerable transitive dependencies (tar, lodash, undici) - Run `npm audit fix`

## Medium Priority
- [x] **#9** Off-by-one in theme selection (`store/soloModeStore.ts:139-141`) - Fix random index range
- [ ] **#10** 87.5% of stores have no tests - Add tests for critical stores
- [x] **#11** Inconsistent error handling - Standardize across stores
- [ ] **#12** No internationalization support - Establish i18n pattern
- [ ] **#13** Missing memoization in heavy components - Add `React.memo` and `useMemo`
- [x] **#14** Location subscription memory leak (`store/tagModeStore.ts:100`) - Guard against overwrite
- [x] **#15** Duplicate AuthStore implementations (`store/index.ts` vs `store/authStore.ts`) - Consolidate to single source
- [ ] **#17** Incomplete difficulty filtering (`app/marketplace/index.tsx:66`, `app/discover.tsx:66`)
- [x] **#18** No token expiration handling - Add refresh/expiration check flow

## Low Priority
- [ ] **#16** Large components need decomposition (SpectatorOverlay, ReplayPlayer, GlobalLeaderboard, EventBanner)
- [ ] **#19** Theme contrast concerns (`constants/theme.ts` - `textTertiary` on `background`)
- [ ] **#20** Missing deep link configuration
