"""把从工作台取出的请求（capture.mjs 的输出）盖上登记的种子和请求号，写成各批的请求文件。

各批的 build.py 只做三件事：列出登记的状态和种子，调用这里的 stamp，写清单。文字、条件图、执行图和负向词都不在 build.py 里写，
它们出自工作台自己的编译（capture.mjs 逐项核对过：发给出图服务的就是工作台冻结的那一段文字和那一张条件图，执行图就是工作台的 comfyGraph）。
"""
import copy
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
APPROVED = ROOT / "experiments/approved-inputs.json"


def sha(b):
    return hashlib.sha256(b).hexdigest()


def load(capture_dir, name):
    """读一个状态的记录，并核对条件图文件。"""
    capture_dir = Path(capture_dir)
    rec = json.loads((capture_dir / f"{name}.json").read_bytes())
    guide = capture_dir / "guides" / rec["guide"]["file"]
    assert sha(guide.read_bytes()) == rec["guide"]["sha256"], f"{name} 的条件图与记录不符"
    assert sha(rec["prompt"].encode("utf-8")) == rec["prompt_sha256"], f"{name} 的文字与记录不符"
    g = rec["graph"]
    assert g["4"]["inputs"]["prompt"] == rec["prompt"] and g["4"]["inputs"]["negative_prompt"] == rec["negative_prompt"]
    assert g["10"]["inputs"]["seed"] is None and g["12"]["inputs"]["filename_prefix"] is None
    rec["_guide_path"] = guide
    return rec


def stamp(rec, rid, seed, negative_swap=None):
    """一份请求：工作台的执行图，只填种子和保存前缀。返回要写进文件的字节。

    negative_swap＝(工作台的词, 这批的词)：事先登记的偏离，负向词里换一个词；check.mjs 要用 --swap 写明同一处才放行。
    """
    g = copy.deepcopy(rec["graph"])
    g["10"]["inputs"]["seed"] = int(seed)
    g["12"]["inputs"]["filename_prefix"] = rid
    if negative_swap:
        old, new = negative_swap
        terms = g["4"]["inputs"]["negative_prompt"].split(", ")
        assert terms.count(old) == 1, f"负向词里没有唯一的“{old}”"
        g["4"]["inputs"]["negative_prompt"] = ", ".join(new if t == old else t for t in terms)
    return json.dumps({"prompt": g}, ensure_ascii=False, indent=2).encode("utf-8")


def copy_guides(recs, inputs_dir):
    """把用到的条件图放进本批的输入目录，返回清单里的 inputs 一栏。"""
    inputs_dir = Path(inputs_dir)
    inputs_dir.mkdir(parents=True, exist_ok=True)
    out = {}
    for rec in recs:
        data = rec["_guide_path"].read_bytes()
        (inputs_dir / rec["guide"]["file"]).write_bytes(data)
        out[rec["guide"]["file"]] = rec["guide"]["sha256"]
    return [{"input": k, "sha256": v} for k, v in sorted(out.items())]


def register_guides(recs, role):
    """把条件图登记进输入白名单（出图前检查按它核对）。已登记且摘要相同的不动；同名不同摘要就停。"""
    approved = json.loads(APPROVED.read_text(encoding="utf-8"))
    changed = False
    for rec in recs:
        name, digest = rec["guide"]["file"], rec["guide"]["sha256"]
        old = approved["guides"].get(name)
        if old:
            assert old["sha256"] == digest, f"白名单里已有同名不同内容的 {name}"
            continue
        approved["guides"][name] = {"sha256": digest, "role": role, "nose_at": "upper edge",
                                    "source": f"工作台 {rec['workbench']['version']} 画的布局条件图（experiments/workbench-graph/capture.mjs 取出）"}
        changed = True
    if changed:
        APPROVED.write_text(json.dumps(approved, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def workbench_of(recs):
    """这批请求出自哪一版工作台。各状态必须是同一版。"""
    seen = {json.dumps(r["workbench"], sort_keys=True) for r in recs}
    assert len(seen) == 1, "这批的状态不是同一版工作台取出的"
    return recs[0]["workbench"]
