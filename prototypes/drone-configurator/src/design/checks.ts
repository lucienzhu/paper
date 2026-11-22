// 设计提示：把几条无人机设计常识算成当前方案的具体提醒。都是俯视下的二维近似，只作提示，不作结论。
import type { DroneParameters, ParameterGroup } from '../types/DroneParameters.ts';
import { usesConsumerReferences, topologyOf, type Layout } from './design.ts';
import { realRanges } from '../data/aircraft.ts';

/** 示意用的相机水平视角。24 mm 等效镜头约为这个量级（DJI Mini 4 Pro 标称 82.1°）。 */
export const CAMERA_FOV_DEG = 82;

export interface Hint {
  id: string;
  level: 'ok' | 'note' | 'warn';
  group: ParameterGroup;
  title: string;
  text: string;
}

const deg = (r: number) => (r * 180) / Math.PI;

/** 机头相机的视野扇形（俯视）：顶点在机身前缘中点，朝机头方向。返回进入视野的桨盘。 */
export function cameraView(p: DroneParameters, layout: Layout) {
  const apex = { x: 0, y: p.fuselage.fuselage_dimensions_mm.length / 2 };
  const half = CAMERA_FOV_DEG / 2;
  const r = layout.prop_diameter_mm / 2;
  const intrusions = layout.hubs.flatMap(h => {
    const vx = h.x_mm - apex.x, vy = h.y_mm - apex.y;
    const dist = Math.hypot(vx, vy);
    if (vy <= -r || dist <= r) return dist <= r ? [{ hub: h.id, deg: half }] : [];
    const edge = deg(Math.atan2(Math.abs(vx), vy)) - deg(Math.asin(Math.min(1, r / dist)));
    return edge < half ? [{ hub: h.id, deg: half - edge }] : [];
  });
  return { apex, half, intrusions };
}

/**
 * 机身在顶视示意里的角：流线舱是大圆角，方壳和多面体是倒角，不指定时是小圆角。示意图（Stage 的 bodyPath）和下面的间距核对共用这一份，
 * 核对量的就是画出来的那个形状。
 */
export function bodyCorner(style: DroneParameters['fuselage']['fuselage_style'], width: number, length: number): { kind: 'round' | 'chamfer'; size: number } {
  const m = Math.min(width, length);
  if (style === 'Aerodynamic Pod') return { kind: 'round', size: m * 0.48 };
  if (style === 'Boxy Enclosure') return { kind: 'chamfer', size: m * 0.1 };
  if (style === 'Faceted Compact') return { kind: 'chamfer', size: m * 0.28 };
  return { kind: 'round', size: m * 0.12 };
}

/** 点到线段的距离。 */
const toSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};

/** 桨盘到机身外形的最小距离（按示意图画出的圆角或倒角）；负值表示俯视下桨盘伸到了机身上方。 */
export function bodyClearance(p: DroneParameters, layout: Layout) {
  const { length, width } = p.fuselage.fuselage_dimensions_mm;
  const r = layout.prop_diameter_mm / 2, hw = width / 2, hl = length / 2;
  const corner = bodyCorner(p.fuselage.fuselage_style, width, length);
  return Math.min(...layout.hubs.map(h => {
    const x = Math.abs(h.x_mm), y = Math.abs(h.y_mm);
    // 轴心落在机身外形之内时直接算作重叠。
    if (x <= hw && y <= hl) return -r;
    let d: number;
    if (corner.kind === 'round') {
      const c = Math.min(corner.size, hw, hl), cx = hw - c, cy = hl - c;
      d = x > cx && y > cy ? Math.hypot(x - cx, y - cy) - c : Math.hypot(Math.max(x - hw, 0), Math.max(y - hl, 0));
    } else {
      const c = Math.min(corner.size, hw, hl);
      d = Math.min(toSegment(x, y, hw - c, hl, hw, hl - c), toSegment(x, y, 0, hl, hw - c, hl), toSegment(x, y, hw, 0, hw, hl - c));
    }
    return d - r;
  }));
}

/** 按矩形包络（不计圆角和倒角）量的距离：只用来说明“只在包络的直角上相交”这种情况。 */
export function envelopeClearance(p: DroneParameters, layout: Layout) {
  const { length, width } = p.fuselage.fuselage_dimensions_mm;
  const r = layout.prop_diameter_mm / 2;
  return Math.min(...layout.hubs.map(h => Math.hypot(Math.max(Math.abs(h.x_mm) - width / 2, 0), Math.max(Math.abs(h.y_mm) - length / 2, 0)) - r));
}

const within = (v: number, range: { min: number; max: number }) => v >= range.min - 0.005 && v <= range.max + 0.005;

export function designHints(p: DroneParameters, layout: Layout, task?: string): Hint[] {
  const hints: Hint[] = [];
  const gap = layout.disk_gap_mm;
  hints.push(gap >= 0
    ? { id: 'props', level: 'ok', group: 'propulsion', title: '相邻轴位桨盘留有间隙', text: `不同轴位的桨盘投影间距为 ${gap.toFixed(0)} mm。` }
    : { id: 'props', level: 'note', group: 'propulsion', title: `相邻桨盘重叠 ${(-gap).toFixed(0)} mm`, text: '不同轴位的桨盘在俯视图中相交。实际层高与间隙需另行确认。' });

  if (p.accessories.has_camera_gimbal) {
    const cam = cameraView(p, layout);
    const worst = Math.max(0, ...cam.intrusions.map(i => i.deg));
    hints.push(worst > 0.5
      ? { id: 'camera', level: 'warn', group: 'frame', title: `前桨进入相机视野约 ${worst.toFixed(0)}°`, text: `按 ${CAMERA_FOV_DEG}° 水平视角的俯视近似。可在画布上检查前缘和桨盘投影。` }
      : { id: 'camera', level: 'ok', group: 'frame', title: '前桨在相机视野之外', text: `按 ${CAMERA_FOV_DEG}° 水平视角的俯视近似。` });
  }

  const clear = bodyClearance(p, layout);
  if (clear < 0)
    hints.push({ id: 'body', level: 'warn', group: 'fuselage', title: `桨盘伸到机身上方 ${(-clear).toFixed(0)} mm`, text: '俯视下桨盘与机身包络重叠。可以缩小机身、减小桨径或加大轴距。' });

  if (!usesConsumerReferences(p.frame.frame_type, task)) {
    const topology = topologyOf(p.frame.frame_type);
    hints.push({ id: 'axis-scope', level: 'note', group: 'frame', title: `${topology.axis_count} 处顶视轴位`, text: topology.layer_visibility });
    return hints;
  }
  const wl = layout.W_over_L, dd = layout.d_over_reference_span;
  hints.push({
    id: 'wl', level: 'note', group: 'frame', title: `横纵比 ${wl.toFixed(2)}`,
    text: within(wl, realRanges.wl)
      ? `落在量过的 ${realRanges.wl.n} 款消费航拍机之间（${realRanges.wl.min.toFixed(2)}–${realRanges.wl.max.toFixed(2)}）。`
      : wl < realRanges.wl.min
        ? `比量过的 ${realRanges.wl.n} 款消费航拍机都更接近正方形（它们是 ${realRanges.wl.min.toFixed(2)}–${realRanges.wl.max.toFixed(2)}）。`
        : `比量过的 ${realRanges.wl.n} 款消费航拍机都更宽（它们是 ${realRanges.wl.min.toFixed(2)}–${realRanges.wl.max.toFixed(2)}）。`,
  });
  hints.push({
    id: 'dd', level: 'note', group: 'propulsion', title: `桨径 ÷ 轴距 ${dd.toFixed(2)}`,
    text: within(dd, realRanges.dd)
      ? `与 ${realRanges.dd.n} 款有公布数据的机型相近（${realRanges.dd.min.toFixed(2)}–${realRanges.dd.max.toFixed(2)}）。`
      : dd < realRanges.dd.min
        ? `桨相对轴距偏小；${realRanges.dd.n} 款有公布数据的机型是 ${realRanges.dd.min.toFixed(2)}–${realRanges.dd.max.toFixed(2)}。`
        : `桨相对轴距偏大；${realRanges.dd.n} 款有公布数据的机型是 ${realRanges.dd.min.toFixed(2)}–${realRanges.dd.max.toFixed(2)}。`,
  });
  return hints;
}
