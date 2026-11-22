// 节点上的小顶视图：画出到这一层为止的累积造型。机架是骨架，动力加上桨盘，机身加上机身，细节加上臂根和相机，色材上色。
// 几何取自 computeLayout()，与条件图、导出坐标是同一组数。
import { useMemo } from 'react';
import type { DroneParameters } from '../../types/DroneParameters';
import { computeLayout } from '../../design/design';
import { layers, type Layer } from '../model';

const MATERIAL: Record<string, string> = { 'Carbon Fiber': '#2f3236', Aluminum: '#a3a9b0', 'ABS Plastic': '#5c6168', 'PLA Plastic': '#6d737a' };

function bodyShape(style: string, w: number, l: number) {
  const hw = w / 2, hl = l / 2, m = Math.min(w, l);
  if (style === 'Faceted Compact' || style === 'Boxy Enclosure') {
    const c = style === 'Faceted Compact' ? m * 0.28 : m * 0.1;
    return `M${-hw + c},${-hl} H${hw - c} L${hw},${-hl + c} V${hl - c} L${hw - c},${hl} H${-hw + c} L${-hw},${hl - c} V${-hl + c} Z`;
  }
  const r = style === 'Aerodynamic Pod' ? m * 0.48 : m * 0.16;
  return `M${-hw + r},${-hl} H${hw - r} A${r},${r} 0 0 1 ${hw},${-hl + r} V${hl - r} A${r},${r} 0 0 1 ${hw - r},${hl} H${-hw + r} A${r},${r} 0 0 1 ${-hw},${hl - r} V${-hl + r} A${r},${r} 0 0 1 ${-hw + r},${-hl} Z`;
}

export default function MiniTop({ parameters, upto, height = 92, highlight }: { parameters: DroneParameters; upto: Layer; height?: number; highlight?: boolean }) {
  const stage = layers.indexOf(upto);
  const g = useMemo(() => {
    const layout = computeLayout(parameters);
    const r = layout.prop_diameter_mm / 2;
    const size = parameters.fuselage.fuselage_dimensions_mm;
    const xs = layout.hubs.map(h => Math.abs(h.x_mm)), ys = layout.hubs.map(h => Math.abs(h.y_mm));
    const ex = Math.max(...xs) + (stage >= 1 ? r + 6 : 14), ey = Math.max(...ys) + (stage >= 1 ? r + 6 : 14);
    const half = Math.max(ex, ey, stage >= 2 ? size.length / 2 + 10 : 0, stage >= 2 ? size.width / 2 + 10 : 0);
    return { layout, r, size, half };
  }, [parameters, stage]);
  const { layout, r, size, half } = g;
  const p = parameters;
  const armW = parseInt(p.frame.arm_width_mm, 10) || 15;
  const colour = stage >= 4 && p.accessories.drone_primary_color ? p.accessories.drone_primary_color : null;
  const armColour = stage >= 4 && p.frame.material_visual ? MATERIAL[p.frame.material_visual] : '#5c6168';
  const bodyFill = colour ?? '#f4f5f7';
  const w = 132, h = height, aspect = w / h;
  const vbW = half * 2 * Math.max(1, aspect), vbH = half * 2 * Math.max(1, 1 / aspect);
  return <svg className="mini" viewBox={`${-vbW / 2} ${-vbH / 2} ${vbW} ${vbH}`} width={w} height={h} aria-hidden="true">
    {stage >= 1 && layout.hubs.map(hub => <g key={'p' + hub.id}>
      <circle cx={hub.x_mm} cy={-hub.y_mm} r={r} fill="rgba(132,138,147,.10)" stroke="#b9bec6" strokeWidth={half * 0.012} />
      {p.propulsion.prop_guard === 'ring' && <circle cx={hub.x_mm} cy={-hub.y_mm} r={r + half * 0.025} fill="none" stroke="#4a5058" strokeWidth={half * 0.022} />}
      <line x1={hub.x_mm - r * 0.92} y1={-hub.y_mm} x2={hub.x_mm + r * 0.92} y2={-hub.y_mm} stroke="#4a5058" strokeOpacity=".55" strokeWidth={half * 0.02} strokeLinecap="round" />
    </g>)}
    {layout.links_mm.map(([x1, y1, x2, y2], i) => <line key={'a' + i} x1={x1} y1={-y1} x2={x2} y2={-y2} stroke={armColour} strokeWidth={armW * 0.9} strokeLinecap="round" />)}
    {stage >= 2 && <path d={bodyShape(p.fuselage.fuselage_style, size.width, size.length)} fill={bodyFill} stroke={highlight ? '#16181b' : '#4a5058'} strokeWidth={half * (highlight ? 0.022 : 0.016)} />}
    {stage >= 2 && p.fuselage.top_cover === 'two' && <line x1={-size.width / 2} y1={-size.length * 0.22} x2={size.width / 2} y2={-size.length * 0.22} stroke="#4a5058" strokeOpacity=".6" strokeWidth={half * 0.012} />}
    {stage >= 2 && p.fuselage.top_cover === 'multi' && [-0.22, 0.12].map(f => <line key={f} x1={-size.width / 2} y1={size.length * f} x2={size.width / 2} y2={size.length * f} stroke="#4a5058" strokeOpacity=".6" strokeWidth={half * 0.012} />)}
    {stage >= 3 && p.accessories.has_camera_gimbal && <rect x={-size.width * 0.22} y={-size.length / 2 - (p.accessories.camera_mount === 'underslung' ? half * 0.05 : -half * 0.01)}
      width={size.width * 0.44} height={half * 0.07} rx={half * 0.02} fill="#2f3236" opacity={p.accessories.camera_mount ? 1 : 0.35} />}
    {stage >= 3 && p.frame.arm_root && layout.hubs.map(hub => {
      const len = Math.hypot(hub.x_mm, hub.y_mm), ux = hub.x_mm / len, uy = hub.y_mm / len;
      const edge = Math.min(size.width / 2 / Math.max(Math.abs(ux), 1e-6), size.length / 2 / Math.max(Math.abs(uy), 1e-6));
      const x = ux * (edge + armW * 0.6), y = -uy * (edge + armW * 0.6);
      return p.frame.arm_root === 'hinge' ? <circle key={'r' + hub.id} cx={x} cy={y} r={armW * 0.55} fill="#fff" stroke="#2f3236" strokeWidth={half * 0.012} />
        : p.frame.arm_root === 'socket' ? <rect key={'r' + hub.id} x={x - armW * 0.7} y={y - armW * 0.7} width={armW * 1.4} height={armW * 1.4} rx={armW * 0.2} fill="#2f3236" />
          : <circle key={'r' + hub.id} cx={ux * edge} cy={-uy * edge} r={armW * 0.85} fill={bodyFill} />;
    })}
    {layout.hubs.map(hub => <circle key={'h' + hub.id} cx={hub.x_mm} cy={-hub.y_mm} r={half * 0.035} fill="#e8590c" stroke="#fff" strokeWidth={half * 0.01} />)}
  </svg>;
}
