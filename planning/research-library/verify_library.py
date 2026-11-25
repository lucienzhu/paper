"""Check public inputs, relational integrity and one frozen semantic packet without ML dependencies."""

import hashlib
import json
from contextlib import closing
from types import SimpleNamespace

from library import DB, as_json, connect, description, packet, search
from sources import HERE, ROOT


# 检索包校验：原在 generate.py（本机小模型起草通路）里。2026-11-26 作者定文字模型统一用 MiniMax，
# 起草通路移进 archive，这段只校验检索包本身，原样移到这里。
def check_packet(conn, payload):
    recorded = payload.get("packet_sha256")
    content = {k: v for k, v in payload.items() if k != "packet_sha256"}
    if (
        not recorded
        or hashlib.sha256(as_json(content).encode()).hexdigest() != recorded
    ):
        raise ValueError("检索包摘要不符")
    if payload["source_digest"] != description(conn)["meta"]["source_digest"]:
        raise ValueError("检索包的资料版本与数据库不相符")
    for item in payload["evidence"]:
        record = conn.execute(
            "SELECT * FROM items WHERE id=?", (item["id"],)
        ).fetchone()
        if not record or any(
            record[k] != item[k]
            for k in ("kind", "claim", "limitation", "source", "locator", "status")
        ):
            raise ValueError("检索包中的证据与数据库不符")
    args = SimpleNamespace(
        **{
            k: payload[k]
            for k in (
                "question",
                "route",
                "task",
                "layout",
                "state",
                "topic",
                "component",
                "limit",
            )
        }
    )
    args.ranker = "lexical" if args.route == "semantic" else payload["ranker"]
    args.select = payload["selected"]
    if packet(conn, args) != payload:
        raise ValueError("当前证据路由或候选与保存的检索包不符")


def verify():
    with closing(connect(DB)) as db:
        assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        assert not list(db.execute("PRAGMA foreign_key_check"))
        for row in db.execute("SELECT * FROM files"):
            raw = (ROOT / row["path"]).read_bytes().replace(b"\r\n", b"\n")
            assert hashlib.sha256(raw).hexdigest() == row["sha256_lf"], row["path"]
        count = db.execute("SELECT count(*) FROM items").fetchone()[0]
        assert (
            db.execute(
                "SELECT count(*) FROM vectors WHERE length(data)=512*4"
            ).fetchone()[0]
            == count
        )
        assert db.execute("SELECT count(*) FROM search_index").fetchone()[0] == count
        assert (
            db.execute("SELECT count(*) FROM items WHERE kind='catalog'").fetchone()[0]
            == db.execute("SELECT count(*) FROM reading_routes").fetchone()[0]
        )
        catalog = {
            r[0] for r in db.execute("SELECT id FROM items WHERE kind='catalog'")
        }
        assert all(
            set(r[0].split("|")) <= catalog
            for r in db.execute("SELECT catalog_ids FROM crosswalk")
        )
        assert {
            r["id"] for r in search(db, "D-P-TASK", "protocol", layout="flat_hex")
        } == {"D-P-TASK"}
        sample = json.loads(
            (HERE / "qa/generation/folded-bag.packet.json").read_text(encoding="utf-8")
        )
        check_packet(db, sample)
        args = SimpleNamespace(
            route="semantic",
            question="农业六旋药箱展开",
            task="consumer_camera",
            layout="quad",
            topic="bag_fit",
            state="folded",
            component=None,
            limit=5,
            select=None,
        )
        mixed = packet(db, args)
        assert mixed["status"] == "clarify" and not mixed["evidence"]
        # Check two known project leads cannot enter the method-answer pool.
        for key in ("B01", "B02"):
            assert all(r["id"] != key for r in search(db, key, "method", evidence=True))
        return description(db)


if __name__ == "__main__":
    print(json.dumps(verify(), ensure_ascii=True, indent=2))
