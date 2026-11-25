// 4.4：场次设置收进了“主持人”面板（登记场次里打开要先确认），登记场次开场先看任务卡。走查脚本都经这里：
// 打开主持人面板、拿到场次设置那一块、关上面板、点任务卡上的“开始”。开场、换方式、结束本场、载入条件之后面板会自己关上。
const KEY = 'multirotor-studio/v4/project';

export async function openModerator(page) {
  if (await page.getByTestId('moderator-drawer').count()) return;
  await page.getByTestId('open-moderator').click();
  await page.waitForSelector('[data-testid=moderator-confirm], [data-testid=moderator-drawer]');
  if (await page.getByTestId('moderator-confirm').count()) await page.getByTestId('moderator-confirm-open').click();
  await page.getByTestId('moderator-drawer').waitFor();
}
export async function closeModerator(page) {
  if (!await page.getByTestId('moderator-drawer').count()) return;
  await page.getByTestId('close-moderator').click();
  await page.getByTestId('moderator-drawer').waitFor({ state: 'detached' });
}
/** 主持人面板里的场次设置（打开面板，展开这一块）。 */
export async function sessionBox(page) {
  await openModerator(page);
  const box = page.getByTestId('session-setup');
  if (!await box.evaluate(d => d.open)) await box.locator(':scope > summary').click();
  return box;
}
/** 登记场次开场的任务卡：这一场是登记场次、还没点过“开始”就点一下。返回是否点了。 */
export async function passTaskCard(page) {
  const need = await page.evaluate(key => {
    const s = JSON.parse(localStorage.getItem(key) || 'null');
    const cur = s?.sessions?.find(x => x.id === s.currentSessionId && !x.endedAt);
    return !!cur && cur.kind === 'registered' && !cur.taskStartedAt;
  }, KEY);
  if (!need) return false;
  await page.getByTestId('task-begin').click();
  await page.getByTestId('task-start').waitFor({ state: 'detached' });
  return true;
}
