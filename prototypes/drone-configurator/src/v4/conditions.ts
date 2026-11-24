// 登记条件写给人看的样子：任务卡、委托卡和导出都从这里取，保证三处说的是同一组数（4.4）。
// 以前委托卡把“真 X、W/L 1.00、对角轴距 250 mm”写死在文字里，和程序实际锁定的值没有联系。
import { study } from '../design/defaults';
import { frameRules } from '../design/design';
import { baseParameters } from './model';

export const conditionOf = (id?: string) => study.conditions.find(c => c.id === id);

/**
 * 一组登记条件固定了哪些值。登记的是机架三项（构型、横纵跨度比、对角轴距）；锁定时整个机架层一起锁，
 * 机臂宽和厚随之固定在起始值，也写出来，免得设计者以为还能改。
 */
export function fixedConditionLines(id?: string): string[] {
  const c = conditionOf(id);
  if (!c) return [];
  const f = c.frame as { frame_type?: string; span_ratio_wl?: number; wheelbase_mm?: number };
  const base = baseParameters('consumer_camera').frame;
  return [
    f.frame_type ? `构型：${frameRules[f.frame_type as keyof typeof frameRules]?.zh ?? f.frame_type}` : '',
    typeof f.span_ratio_wl === 'number' ? `横纵跨度比 W/L：${f.span_ratio_wl.toFixed(2)}` : '',
    typeof f.wheelbase_mm === 'number' ? `对角轴距：${f.wheelbase_mm} mm` : '',
    `机臂宽 ${parseInt(base.arm_width_mm, 10)} mm、厚 ${parseInt(base.arm_thickness_mm, 10)} mm（随机架一起固定在起始值）`,
  ].filter(Boolean);
}
