// 使用 Node.js 全域 fetch（Node 18+）
(async () => {
  try {
    const tests = [
      { u: 'Test002', p: '123' },
      { u: '2', p: '123' }
    ];
    for (const t of tests) {
      console.log('\n--> trying login', t.u);
      const resp = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: t.u, password: t.p })
      });
      const text = await resp.text();
      console.log('status', resp.status);
      try { console.log('body', JSON.parse(text)); } catch(e) { console.log('body text', text); }
    }
  } catch (e) {
    console.error('request failed', e);
  }
})();
