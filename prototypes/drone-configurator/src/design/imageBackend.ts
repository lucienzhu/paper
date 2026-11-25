// 图像后端：只接本机 ComfyUI 上的 Qwen-Image 2.1（4.5：作者 2026-11-26 定研究控制变量，文字模型 MiniMax、出图模型 Qwen；
// 原先开发用的托管出图后端已去掉）。本机服务告知标签，软件夹具会写明不出真图。
import { useEffect, useState } from 'react';

export type ImageModel = 'Qwen-Image-2.1';
export interface ImageBackend { provider: 'qwen-comfy'; model: ImageModel; endpoint: string; label: string; /** 软件夹具冒充后端接口，不出真图。 */ fixture?: boolean }
export const qwenBackend: ImageBackend = { provider: 'qwen-comfy', model: 'Qwen-Image-2.1', endpoint: '/prompt', label: 'Qwen-Image 2.1（本机 ComfyUI）' };
/**
 * 一轮记录冻结时登记的模型决定了它该由哪个后端应答。4.5 起新轮次都是 Qwen；4.5 以前留在本机的非 Qwen 旧记录照实标出，
 * 服务不再取回，也不计入研究数据。
 */
export const backendOf = (model?: string): ImageBackend =>
  model === undefined || model === qwenBackend.model ? qwenBackend : { ...qwenBackend, label: `非 Qwen 的旧记录（${model}），不计入研究数据` };
export const modelLabel = (model?: string) => backendOf(model).label;

let current: Promise<ImageBackend> | undefined;
export function imageBackend(): Promise<ImageBackend> {
  current ??= (async () => {
    if (!['http:', 'https:'].includes(location.protocol)) return qwenBackend;
    try {
      // 路由名里的 h3 是早期版本留下的内部名字，现在这个接口只接 Qwen。
      const response = await fetch('/api/h3/backend', { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000) });
      const info = response.ok ? await response.json() : null;
      // 走查用的软件夹具：标签照服务说的写（“软件夹具……不出真图”），别让截图看起来像真实回图。
      return info?.fixture === true && typeof info.label === 'string' ? { ...qwenBackend, label: info.label, fixture: true } : qwenBackend;
    } catch { return qwenBackend; }
  })();
  return current;
}
export function useImageBackend() {
  const [backend, setBackend] = useState<ImageBackend>(qwenBackend);
  useEffect(() => { let live = true; void imageBackend().then(value => { if (live) setBackend(value); }); return () => { live = false; }; }, []);
  return backend;
}
