// 入口：默认打开 4.0 工作台；地址栏 #v=3，或带旧版的复核参数（step、cfg、board 等）时打开 3.6 版。
import { useEffect, useState } from 'react';
import App from './App';
import Studio4 from './v4/ui/Studio4';

const legacyKeys = ['step', 'cfg', 'pin', 'board', 'node', 'layer', 'set', 'tab', 'q'];

function isLegacy(hash = window.location.hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (params.get('v') === '3') return true;
  if (params.get('v') === '4') return false;
  return legacyKeys.some(key => params.has(key));
}

export default function Root() {
  const [legacy, setLegacy] = useState(() => isLegacy());
  useEffect(() => {
    const sync = () => setLegacy(isLegacy());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); };
  }, []);
  useEffect(() => { document.documentElement.dataset.workbench = legacy ? '3' : '4'; }, [legacy]);
  return legacy ? <App /> : <Studio4 />;
}
