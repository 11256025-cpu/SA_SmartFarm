// backend/e2e_test.js
// 簡單的端到端測試：註冊 -> simulator/update -> debug/history

const BASE = 'http://localhost:3000';

async function main() {
  try {
    const ts = Date.now();
    const account = `e2e_user_${ts}`;
    const password = 'password123';

    console.log('1) POST /api/register');
    const regResp = await fetch(`${BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: account, username: account, password, confirmPassword: password })
    });
    const regBodyText = await regResp.text();
    let regBody;
    try { regBody = JSON.parse(regBodyText); } catch (e) { console.error('註冊回傳非 JSON:', regBodyText); process.exit(1); }
    console.log('register status:', regResp.status, regBody);
    if (!regBody.success) {
      console.error('註冊失敗，停止測試');
      process.exit(2);
    }

    const userId = regBody.user?.id || regBody.user?.rowid || regBody.user?.user_id || regBody.user?.ID || null;
    console.log('註冊取得 userId =>', userId);
    if (!userId) {
      console.error('找不到 userId，停止測試');
      process.exit(3);
    }

    console.log('2) POST /api/simulator/update with userId');
    const updResp = await fetch(`${BASE}/api/simulator/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: String(userId), temperature: 30, humidity: 40 })
    });
    const updBody = await updResp.json().catch(() => null);
    console.log('simulator/update status:', updResp.status, updBody);

    console.log('3) GET /api/debug/history');
    const dbgResp = await fetch(`${BASE}/api/debug/history`);
    const dbgBody = await dbgResp.json().catch(() => null);
    console.log('debug/history status:', dbgResp.status);
    if (dbgBody) {
      const inMemory = dbgBody.total_states_in_memory || dbgBody.total_states_in_memory || dbgBody.currentFarmStates || null;
      console.log('total_states_in_memory keys:', inMemory ? Object.keys(inMemory) : 'none');
      if (inMemory && inMemory[String(userId)]) {
        console.log('✅ 測試成功：userId 已出現在 currentFarmStates！');
        console.log('對應資料：', inMemory[String(userId)]);
        process.exit(0);
      } else {
        console.error('❌ 測試失敗：userId 未出現在 currentFarmStates');
        console.log('完整 debug body:', dbgBody);
        process.exit(4);
      }
    } else {
      console.error('無法解析 debug/history 回傳');
      process.exit(5);
    }
  } catch (e) {
    console.error('測試執行錯誤:', e);
    process.exit(99);
  }
}

main();
