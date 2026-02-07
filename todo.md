# App Review - Improvement Todo List

## Critical
- [x] **#1** Gemini API key exposed in URL query parameter (`lib/gemini.ts:20,70`) - Move to `x-goog-api-key` header
- [x] **#2** Zero accessibility attributes across entire app - Added to 5 core components (Button, Card, HuntCard, ErrorBoundary, OfflineIndicator)
- [x] **#3** No auth guards on most protected screens - Add `useRequireAuth` hook or wrapper component

## High Priority
- [x] **#4** Seven stores missing persist middleware - Add to `seriesStore`, `achievementStore`, `teamStore`
- [x] **#5** Race conditions in offline storage (`lib/offlineStorage.ts:108-126,171-198`) - Add mutex/lock for read-modify-write operations
- [x] **#6** Stale closure in `soloModeStore.finishSoloHunt` (`store/soloModeStore.ts:256`) - Snapshot state once at start of function
- [x] **#7** Social store like/unlike race condition (`store/socialStore.ts:225-295`) - Add in-flight tracking to prevent concurrent toggle
- [ ] **#8** Vulnerable transitive dependencies (tar, lodash, undici) - Run `npm audit fix`

## Medium Priority
- [x] **#9** Off-by-one in theme selection (`store/soloModeStore.ts:139-141`) - Fix random index range
- [ ] **#10** 87.5% of stores have no tests - Add tests for critical stores
- [x] **#11** Inconsistent error handling - Standardize across stores
- [ ] **#12** No internationalization support - Establish i18n pattern
- [x] **#13** Missing memoization in heavy components - Added `React.memo` and `useMemo` to BountyBoard, SpectatorOverlay, GlobalLeaderboard, TournamentBracket
- [x] **#14** Location subscription memory leak (`store/tagModeStore.ts:100`) - Guard against overwrite
- [x] **#15** Duplicate AuthStore implementations (`store/index.ts` vs `store/authStore.ts`) - Consolidate to single source
- [x] **#17** Incomplete difficulty filtering (`app/marketplace/index.tsx:66`, `app/discover.tsx:66`) - Wired filters to UI and data
- [x] **#18** No token expiration handling - Add refresh/expiration check flow

## New Issues Found During Implementation
- [x] **#21** Relative URLs in 4 stores (socialStore, eventsStore, liveMultiplayerStore, seriesStore) - All 64 URLs fixed
- [x] **#22** Dual token storage causing stale isAuthenticated on restart - Removed isAuthenticated from persist partialize
- [x] **#24** `error: any` bypassing strict mode in authStore - Replaced with `error: unknown` + proper narrowing

## Low Priority (Remaining)
- [ ] **#8** Vulnerable transitive dependencies (tar, lodash, undici) - Run `npm audit fix`
- [ ] **#10** 87.5% of stores have no tests - Add tests for critical stores
- [ ] **#12** No internationalization support - Establish i18n pattern
- [ ] **#16** Large components need decomposition (SpectatorOverlay, ReplayPlayer, GlobalLeaderboard, EventBanner)
- [ ] **#19** Theme contrast concerns (`constants/theme.ts` - `textTertiary` on `background`)
- [ ] **#20** Missing deep link configuration
- [ ] **#23** No request cancellation on navigation - AbortController for in-flight fetches
