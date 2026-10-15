import { test } from "@playwright/test";

// Result entry and absence + substitute need a live group. The 15 Oct backup has none
// (edition 25 ended 13 Oct) and the v2 flows land with S4 (src/features/results).
// Enabled once S4's pages are on v2/integration; the steps are the acceptance list.
test.fixme("result entry: a signed-in player enters 6-4 and the standings update", async () => {
  // 1 seed: a live Clássica group (via POST /api/v2/competitions or a fixture SQL) on the e2e db
  // 2 login as a member, open /groups/:id, open the match, enter 6-4, save
  // 3 expect the match shows 6-4 and the member's standing row gains the points (rule: v2 standings)
});

test.fixme("absence + substitute: marking a player absent with a substitute shows on the match", async () => {
  // 1 login, open the round, mark member absent with substitute X
  // 2 expect the match participants show X as substitute and the absence is listed
  // 3 delete the absence; expect the original member back
});
