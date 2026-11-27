"""给真人读者的读图页：在 pack_blind.py 封好的读者目录里加一个 index.html，读者双击打开，一张一张看图、点选、最后导出 reading.csv。

读者目录本来就有：匿名图（<图号>.png）、空白读数表 reading-blank.csv、读法 rules.txt。这一页只是把同一张表做成点选的界面：
图的顺序、图号、栏目和每一栏允许填的词，都与 reading-blank.csv 和登记的读法相同；导出的 reading.csv 与 AI 读者交回的同一格式，用同一个计分程序。
页面不联网、不上传，进度存在浏览器本机；不含请求号、档位、种子。

用法（仓库根目录）：
  python3 -B experiments/reading/reader_page.py --reader-dir <读者目录>/reader1 --fields <栏目说明.json> [--title 标题]
栏目说明：{"intro": [段落…], "fields": [{"column": 列名, "label": 中文名, "help": 说明, "options": [{"value": 词, "label": 中文, "help": 说明}], "group": 分组名}]}
"""
import argparse
import csv
import html
import json
from pathlib import Path

PAGE = r"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__TITLE__</title>
<style>
  :root { --bg:#f6f5f2; --panel:#ffffff; --ink:#1d1f23; --muted:#6a6f78; --line:#d9d6cf; --accent:#1f5fbf; --accent-ink:#ffffff; --warn:#b4541a; --ok:#1d7a46; }
  @media (prefers-color-scheme: dark) { :root { --bg:#17181b; --panel:#212327; --ink:#eceae5; --muted:#a0a4ab; --line:#3a3d43; --accent:#6ea3ff; --accent-ink:#10131a; --warn:#f0a36b; --ok:#6fd39b; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.55 -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif; }
  header { padding:14px 20px; border-bottom:1px solid var(--line); display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
  header h1 { font-size:18px; margin:0; font-weight:600; }
  .count { color:var(--muted); font-variant-numeric: tabular-nums; }
  .bar { flex:1; min-width:120px; height:6px; background:var(--line); border-radius:3px; overflow:hidden; }
  .bar i { display:block; height:100%; background:var(--accent); width:0; }
  main { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(320px,1fr); gap:20px; padding:20px; max-width:1500px; margin:0 auto; }
  @media (max-width: 900px) { main { grid-template-columns:1fr; padding:16px; } }
  .stage { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px; position:sticky; top:12px; align-self:start; }
  @media (max-width: 900px) { .stage { position:static; } }
  .view { overflow:auto; max-height:78vh; border-radius:4px; background:#fff; cursor:zoom-in; }
  .view.zoom { cursor:zoom-out; }
  .view img { display:block; width:100%; height:auto; }
  .view.zoom img { width:200%; max-width:none; }
  .hint { color:var(--muted); font-size:13px; margin:8px 2px 0; }
  form { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:6px 18px 18px; }
  fieldset { border:0; border-top:1px solid var(--line); margin:0; padding:14px 0 6px; }
  fieldset:first-of-type { border-top:0; }
  legend { font-weight:600; padding:0; float:left; width:100%; margin-bottom:4px; }
  .help { color:var(--muted); font-size:13px; margin:0 0 8px; clear:both; }
  .opts { display:flex; flex-wrap:wrap; gap:8px; clear:both; }
  .opts label { border:1px solid var(--line); border-radius:6px; padding:7px 12px; cursor:pointer; display:flex; flex-direction:column; min-width:88px; max-width:100%; }
  .opts label small { color:var(--muted); font-size:12px; line-height:1.35; margin-top:2px; }
  .opts input { position:absolute; opacity:0; pointer-events:none; }
  .opts label:has(input:checked) { border-color:var(--accent); background:color-mix(in srgb, var(--accent) 12%, transparent); box-shadow:inset 0 0 0 1px var(--accent); }
  .opts label:has(input:focus-visible) { outline:2px solid var(--accent); outline-offset:2px; }
  .group { font-size:13px; letter-spacing:.04em; color:var(--muted); margin:18px 0 0; }
  textarea { width:100%; min-height:56px; font:inherit; color:inherit; background:transparent; border:1px solid var(--line); border-radius:6px; padding:8px; }
  nav { display:flex; gap:10px; margin-top:16px; flex-wrap:wrap; }
  button { font:inherit; border-radius:6px; border:1px solid var(--line); background:transparent; color:var(--ink); padding:9px 16px; cursor:pointer; }
  button.primary { background:var(--accent); border-color:var(--accent); color:var(--accent-ink); }
  button:disabled { opacity:.45; cursor:default; }
  .status { margin-top:12px; font-size:14px; }
  .status.warn { color:var(--warn); } .status.ok { color:var(--ok); }
  details { margin:0 20px; max-width:1460px; }
  details summary { cursor:pointer; padding:10px 0; color:var(--muted); }
  details p { margin:6px 0; }
  .dots { display:flex; flex-wrap:wrap; gap:4px; margin-top:12px; }
  .dots button { width:26px; height:26px; padding:0; font-size:12px; border-radius:4px; }
  .dots button.done { background:color-mix(in srgb, var(--ok) 22%, transparent); border-color:var(--ok); }
  .dots button.here { outline:2px solid var(--accent); outline-offset:1px; }
</style>
</head>
<body>
<header>
  <h1>__TITLE__</h1>
  <span class="count" id="count"></span>
  <div class="bar"><i id="bar"></i></div>
  <button type="button" id="export" class="primary">导出读数</button>
</header>
<details id="intro" open>
  <summary>怎么读（先看这一段）</summary>
  __INTRO__
</details>
<main>
  <section class="stage">
    <div class="view" id="view"><img id="img" alt="待读的图"></div>
    <p class="hint">点图可以放大到两倍，再点一下还原。图的上方是机头方向。</p>
    <div class="dots" id="dots" aria-label="各张图的填写情况"></div>
  </section>
  <form id="form" autocomplete="off">
    <div id="fields"></div>
    <nav>
      <button type="button" id="prev">上一张</button>
      <button type="button" id="next" class="primary">下一张</button>
    </nav>
    <p class="status" id="status" role="status"></p>
  </form>
</main>
<script>
const SPEC = __SPEC__;
const IMAGES = __IMAGES__;
const COLUMNS = __COLUMNS__;
const KEY = 'reading:' + __PACK__;
let data = {};
try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { data = {}; }
let at = Math.min(Math.max(0, Number(data.__at || 0)), IMAGES.length - 1);
const $ = id => document.getElementById(id);
const save = () => { data.__at = at; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
const row = i => (data[IMAGES[i]] = data[IMAGES[i]] || {});
const complete = i => COLUMNS.every(c => (row(i)[c] || '') !== '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function buildFields() {
  let out = '', group = null;
  for (const f of SPEC.fields) {
    if (f.group && f.group !== group) { group = f.group; out += `<p class="group">${esc(group)}</p>`; }
    out += `<fieldset><legend>${esc(f.label)}</legend>` + (f.help ? `<p class="help">${esc(f.help)}</p>` : '') + '<div class="opts">' +
      f.options.map(o => `<label><input type="radio" name="${esc(f.column)}" value="${esc(o.value)}"><span>${esc(o.label)}</span>${o.help ? `<small>${esc(o.help)}</small>` : ''}</label>`).join('') +
      '</div></fieldset>';
  }
  out += '<fieldset><legend>备注（选填）</legend><p class="help">看不清的原因，或你认为值得记的异常，一句话。</p><textarea name="note" id="note"></textarea></fieldset>';
  $('fields').innerHTML = out;
}
function buildDots() {
  $('dots').innerHTML = IMAGES.map((_, i) => `<button type="button" data-i="${i}" title="第 ${i + 1} 张">${i + 1}</button>`).join('');
}
function show() {
  $('img').src = IMAGES[at] + '.png';
  $('view').classList.remove('zoom'); $('view').scrollTop = 0; $('view').scrollLeft = 0;
  const r = row(at);
  for (const f of SPEC.fields) for (const el of document.getElementsByName(f.column)) el.checked = (r[f.column] === el.value);
  $('note').value = r.note || '';
  const done = IMAGES.filter((_, i) => complete(i)).length;
  $('count').textContent = `第 ${at + 1} / ${IMAGES.length} 张 · 已填完 ${done} 张`;
  $('bar').style.width = (100 * done / IMAGES.length) + '%';
  $('prev').disabled = at === 0;
  $('next').textContent = at === IMAGES.length - 1 ? '到头了' : '下一张';
  $('next').disabled = at === IMAGES.length - 1;
  for (const b of $('dots').children) { const i = Number(b.dataset.i); b.className = (complete(i) ? 'done ' : '') + (i === at ? 'here' : ''); }
  const missing = COLUMNS.filter(c => (r[c] || '') === '').length;
  $('status').className = 'status ' + (missing ? '' : 'ok');
  $('status').textContent = missing ? `这一张还有 ${missing} 项没选。` : '这一张填完了。';
  save();
}
function go(i) { at = Math.min(Math.max(0, i), IMAGES.length - 1); show(); window.scrollTo({ top: 0 }); }
function csvCell(v) { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function exportCsv() {
  const left = IMAGES.map((_, i) => i).filter(i => !complete(i));
  if (left.length && !confirm(`还有 ${left.length} 张没填完（第 ${left.slice(0, 8).map(i => i + 1).join('、')}${left.length > 8 ? '…' : ''} 张）。没填的格子会是空的。仍要导出吗？`)) { go(left[0]); return; }
  const head = ['image', ...COLUMNS, 'note'];
  const lines = [head.join(',')].concat(IMAGES.map((id, i) => [id, ...COLUMNS.map(c => row(i)[c] || ''), row(i).note || ''].map(csvCell).join(',')));
  const blob = new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reading.csv'; document.body.appendChild(a); a.click(); a.remove();
  $('status').className = 'status ok'; $('status').textContent = '已导出 reading.csv（在浏览器的下载文件夹里）。请把这个文件发回给研究者。';
}
buildFields(); buildDots();
$('form').addEventListener('change', e => { if (e.target.name && e.target.type === 'radio') { row(at)[e.target.name] = e.target.value; show(); } });
$('note').addEventListener('input', e => { row(at).note = e.target.value; save(); });
$('prev').addEventListener('click', () => go(at - 1));
$('next').addEventListener('click', () => go(at + 1));
$('dots').addEventListener('click', e => { if (e.target.dataset.i !== undefined) go(Number(e.target.dataset.i)); });
$('view').addEventListener('click', () => $('view').classList.toggle('zoom'));
$('export').addEventListener('click', exportCsv);
document.addEventListener('keydown', e => { if (e.target.tagName === 'TEXTAREA') return; if (e.key === 'ArrowRight') go(at + 1); if (e.key === 'ArrowLeft') go(at - 1); });
if (Object.keys(data).length > 1) $('intro').open = false;
show();
</script>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reader-dir", required=True)
    ap.add_argument("--fields", required=True)
    ap.add_argument("--title", default="无人机顶视图判读")
    a = ap.parse_args()
    d = Path(a.reader_dir)
    spec = json.loads(Path(a.fields).read_text(encoding="utf-8"))
    with (d / "reading-blank.csv").open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
        header = list(rows[0].keys())
    columns = [c for c in header if c not in ("image", "note")]
    assert columns == [f["column"] for f in spec["fields"]], f"栏目说明与空白读数表的列不一致：{columns}"
    images = [r["image"] for r in rows]
    for token in images:
        assert (d / f"{token}.png").is_file(), token
    for f in spec["fields"]:
        assert all(o["value"] for o in f["options"]) and len({o["value"] for o in f["options"]}) == len(f["options"]), f["column"]
    intro = "".join(f"<p>{html.escape(p)}</p>" for p in spec.get("intro", []))
    page = (PAGE.replace("__TITLE__", html.escape(a.title)).replace("__INTRO__", intro)
            .replace("__SPEC__", json.dumps({"fields": spec["fields"]}, ensure_ascii=False))
            .replace("__IMAGES__", json.dumps(images)).replace("__COLUMNS__", json.dumps(columns))
            .replace("__PACK__", json.dumps(images[0] + ":" + str(len(images)))))
    (d / "index.html").write_text(page, encoding="utf-8")
    text = page.lower()
    assert "http://" not in text and "https://" not in text, "页面不应引用任何外部地址"
    print(f"写出 {d / 'index.html'}：{len(images)} 张，{len(columns)} 栏")


if __name__ == "__main__":
    main()
