// 导出这次的工作区：方向和各层节点、意图、AI 建议及其处理、对话、比较与取舍、事件。
// 生成轮次的原件另在“研究记录与导出”里导出，AI 调用的原始记录在本机服务的日志目录里；三者用轮次编号和调用编号对上。
import { download, fileStamp } from '../design/exporters';
import { registryVersion } from '../design/evidence/registry.mjs';
import { imageBackend } from '../design/imageBackend';
import { useStudio } from './store';
import { describeAi } from './ai';

export const STUDIO_VERSION = '4.0.0';

export async function exportWorkspace() {
  const s = useStudio.getState();
  const [ai, backend] = await Promise.all([describeAi(), imageBackend().catch(() => null)]);
  const record = {
    schema: 'workbench/v4-export', exportedAt: new Date().toISOString(),
    app: { name: '多旋翼造型工作台', version: STUDIO_VERSION },
    textModel: { mode: ai.mode, provider: ai.provider, model: ai.model, label: ai.label },
    imageBackend: backend, evidenceRegistry: registryVersion,
    session: s.session, project: s.project, suggestions: s.suggestions, directions: s.directions,
    turns: s.turns, compares: s.compares, events: s.events,
  };
  download(`workbench4-${fileStamp()}.json`, JSON.stringify(record, null, 2), 'application/json');
}
