#!/usr/bin/env bash
# GitHub 整理（2026-11-24）：先核对，再打同名标签，逐个验标签，最后才删分支。
# 只能用对 Freeloop993/paper 有写权限的账号运行。默认只读，删分支必须加 --yes。
#
#   bash planning/2026-11-24-github-cleanup.sh check          只读：每个分支的末提交、同名标签的状态
#   bash planning/2026-11-24-github-cleanup.sh tag            只给末提交与清单一致的分支打同名标签；已有的标签只核对
#   bash planning/2026-11-24-github-cleanup.sh verify         逐个核对 41 个同名标签都指向清单里的原末提交，并核对两件只在分支上的原件
#   bash planning/2026-11-24-github-cleanup.sh delete         先跑 verify；只列出会删哪些分支
#   bash planning/2026-11-24-github-cleanup.sh delete --yes   真删：每删一个之前再核一次它的标签
#
# 不在清单里的分支一律不碰：main、reference-fulltexts-20261109。codex/semantic-tools 打标签但不删（等 #57 有结果）。
set -euo pipefail
REPO=Freeloop993/paper
KEEP="codex/semantic-tools"

# 分支名  原末提交  是否已在 main 的历史里（unmerged 的 16+1 个只有靠标签才留得住）
LIST=$(cat <<'END'
claude/ch03-3.2-3.3 fd0aa425c9a1db10eeb3542b530b5046395452c3 unmerged
claude/direction-todo-20261117 9afe6903b0368cd86ced367c3675bb4a7adc98e2 unmerged
claude/e3-quad-qwen e96d41946ea84237da506bb76c2f713a3f3b9275 unmerged
claude/extra-readings-20261117 e19a706fa3b91af651444cd680b0351e15516a55 unmerged
claude/gpu-tasks-20261117 ca4b5349dbfdda162357e0c676c085345bd46b60 unmerged
claude/r1-r3-design e2dc0e6f0fe24e8bc66ee2573b719f96ae1f5ef8 unmerged
claude/thesis-docx 677f8bf0a9159b09c2efbf26e0e452dbe5f4b4ea unmerged
claude/word-pairs-v1 dad19783e8e798f3974f896ccb95e4a298685162 unmerged
codex/advisor-study-system-20261118 a98b3ecdce0330902d9f5dd99336ce41e7fc993e unmerged
codex/e2r-human-review-20261115 5b1e4c6526011a94b078f1474dc24479285b600b unmerged
codex/multirotor-studio-20261118 f308b7e5630fd67f6ede84874084755e208bd22a unmerged
codex/r1-render-freeze 370363c9deafc7aaaac3cb8e6dc2c49a85602d8f unmerged
codex/semantic-tools 62a00b13c4e6e637481befe4d6f2c3f372b1c93d unmerged
codex/thesis-source-e2r-20261115 5f92248dd353075d83134c99c7d52383b96a6a48 unmerged
sync/missing-zips-20261120 7a265063caab4f3745e224afd9bf474bc094f72d unmerged
tools/a8-html-download-20261120 ca9d71021ba7e0545c365ef847e5fb151e361f60 unmerged
tools/workbench-360-preview-20261121 6887f07e2068490c6c0849617842608de6210048 unmerged
claude/c01-1111 310abbf60463a5736b1739578e7e2efe29812bac merged
claude/c01-review-1110 d6bbdc0b095e22652a475cad13e89be11a132bf9 merged
claude/c01-review-1110b a5291ff4c0c4c382eb6b23f1c47f40ac0755556f merged
claude/d2-addendum f1b238b9e6aa8e1d63959fdfc0111c65848c4e4e merged
claude/d2-tuning 8170410dfa7b7ce01beabd66b7903f5f6e9a7788 merged
claude/e3-spec-cards 5bbab1fcbb00a8f5efcd03bb1a60af84c410ac17 merged
claude/foundation-v1 223513b95cab9acb3c40988cb9ab9abd5a027c5e merged
claude/freeze-v1-sec2 d3290ebbaccb1319ec1ee48365630a6e4cd1427f merged
claude/guide-prompt-spec 9781eff6468f5621d2f98cb0ef05a04e6c57804c merged
claude/l1-layout 4ffdd95206d6a724bd91d98159e1fef354144350 merged
claude/method-freeze-v1 638db88bc08b1b828da88436d598061f3afe1ae4 merged
claude/p1-param-prompt 2996f6bb25b0fcdc342685c3939a49a4dbc9db58 merged
claude/roadmap-ch34 6d36c27b87740421d5c3179c1aa15dae79f6c1df merged
claude/semantic-to-e3 48e586f3dbaaf37b60f5377574d1030a8a1593b5 merged
codex/e0-image26-blind-read b4d46deb34634bfa32964a5b6e7cf178e3da93ed merged
codex/e1-actuals eb575d44fec7b4d53f7766a3f5e8629dcbdf7a5a merged
codex/e1-design-audit a53653b83d31bc2917b2d0fa26cd6cf903b627b4 merged
codex/foundation-section8 0e732e0030096b347bada49b9a7f000a1e503bb9 merged
codex/minimax-camera-roots d147f61ab8ccbbf96e1987f8831f7b230f8c93c7 merged
codex/pdf-library-20261119 d283025b67fb1bce93493ddc1dafa27de7f2ed58 merged
codex/r0-e0-e1-freeze b17fc126bcde75ac74012a7d69213e913457f1d5 merged
codex/semantic-card-delivery b720048d7316bee30ae77abc8cfdf474101fae43 merged
sync/paper-reading-room-20261120 445c603e85a045832c8914c1723a9537c4521438 merged
sync/paper-reading-room-full-20261120 f89b580384128cf3f3ee85a68c5392f21bebb7b7 merged
END
)

head_of() { local o; o=$(gh api "repos/$REPO/git/ref/heads/$1" --jq .object.sha 2>/dev/null) || o=""; echo "$o"; }
tag_of() {
  local t; t=$(gh api "repos/$REPO/git/ref/tags/$1" --jq '.object.type+" "+.object.sha' 2>/dev/null) || t=""
  case "$t" in
    "commit "*) echo "${t#commit }" ;;
    "tag "*) gh api "repos/$REPO/git/tags/${t#tag }" --jq .object.sha 2>/dev/null || echo "" ;;
    *) echo "" ;;
  esac
}

check_artifacts() {
  local ok=1 s n
  # E2R 评阅稿 Word：只在 codex/e2r-human-review-20261115 上（#3 第 23 题定为打标签后删分支）
  s=$(gh api "repos/$REPO/contents/manuscript/thesis/review/2026-11-15-codex-e2r-human-reading.docx?ref=refs/tags/codex/e2r-human-review-20261115" --jq .sha 2>/dev/null) || s=""
  if [ "$s" = "03050e0a1b32371ecebbd80ae7565c03728283a6" ]; then echo "原件 ok    E2R 评阅稿 Word 在标签 codex/e2r-human-review-20261115 里，blob 一致"
  else echo "原件 FAIL  E2R 评阅稿 Word 在标签里找不到或 blob 不对：'$s'"; ok=0; fi
  # R1 冻结请求包：只在 codex/r1-render-freeze 上（清单定为只打标签存档）
  s=$(gh api "repos/$REPO/contents/experiments/r1-render/manifest.json?ref=refs/tags/codex/r1-render-freeze" --jq .sha 2>/dev/null) || s=""
  n=$(gh api "repos/$REPO/contents/experiments/r1-render/requests?ref=refs/tags/codex/r1-render-freeze" --jq length 2>/dev/null) || n=0
  if [ "$s" = "70058d41f8d7334cdcdb65a2c4bc1210c3008351" ] && [ "$n" = "24" ]; then echo "原件 ok    R1 请求包在标签 codex/r1-render-freeze 里：manifest blob 一致，requests 24 份"
  else echo "原件 FAIL  R1 请求包：manifest '$s'，requests $n 份（应为 24）"; ok=0; fi
  [ $ok = 1 ]
}

cmd=${1:-}
case "$cmd" in
  check)
    while read -r b sha st; do
      h=$(head_of "$b"); t=$(tag_of "$b")
      hs="分支不存在"; [ -n "$h" ] && { [ "$h" = "$sha" ] && hs="分支末提交一致" || hs="分支末提交变了：$h"; }
      ts="无标签"; [ -n "$t" ] && { [ "$t" = "$sha" ] && ts="标签一致" || ts="标签指错：$t"; }
      printf '%-40s %-9s %s | %s\n' "$b" "$st" "$hs" "$ts"
    done <<< "$LIST" ;;
  tag)
    while read -r b sha st; do
      t=$(tag_of "$b")
      if [ -n "$t" ]; then [ "$t" = "$sha" ] && echo "已有  $b" || echo "标签指错，不动：$b → $t（应为 $sha）"; continue; fi
      h=$(head_of "$b")
      if [ "$h" != "$sha" ]; then echo "跳过  $b：分支末提交 '$h' 与清单 $sha 不一致，报告作者"; continue; fi
      gh api -X POST "repos/$REPO/git/refs" -f ref="refs/tags/$b" -f sha="$sha" >/dev/null && echo "已打  $b → $sha"
    done <<< "$LIST" ;;
  verify)
    bad=0; good=0
    while read -r b sha st; do
      t=$(tag_of "$b")
      if [ "$t" = "$sha" ]; then good=$((good+1)); else echo "FAIL  $b：标签 '$t'，应为 $sha"; bad=$((bad+1)); fi
    done <<< "$LIST"
    echo "同名标签：$good 个一致，$bad 个不一致或缺失（应为 41 个一致）"
    check_artifacts || bad=$((bad+1))
    [ $bad = 0 ] ;;
  delete)
    if ! bash "$0" verify; then echo "verify 没通过，一个分支也不删。"; exit 1; fi
    while read -r b sha st; do
      [ "$b" = "$KEEP" ] && { echo "保留  $b（等 #57）"; continue; }
      h=$(head_of "$b"); [ -z "$h" ] && { echo "已不存在  $b"; continue; }
      t=$(tag_of "$b")
      if [ "$t" != "$sha" ]; then echo "不删  $b：标签 '$t' 与原末提交 $sha 不一致"; continue; fi
      if [ "$h" != "$sha" ]; then echo "不删  $b：分支末提交变成了 $h，与清单不一致"; continue; fi
      if [ "${2:-}" = "--yes" ]; then gh api -X DELETE "repos/$REPO/git/refs/heads/$b" && echo "已删  $b（标签 $sha 留着）"
      else echo "会删  $b（标签已核：$sha）"; fi
    done <<< "$LIST" ;;
  *) sed -n '2,12p' "$0"; exit 2 ;;
esac
