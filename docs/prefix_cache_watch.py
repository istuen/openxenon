# 本地前缀缓存观测：oMLX server.log 逐请求算"有效 prefill 速度"
# 用法: python3 prefix_cache_watch.py
# 原理: oMLX 每请求打印 "Chat completion: <out> tokens in <sec>s, prompt: <N>"
#       有效 prefill = N / (耗时 − out/decode)  ; decode≈25 tok/s(9B)
#       >~250 tok/s=冷(全量)  >>250 tok/s(尤其 >1000)=命中缓存
import re, os, time

LOG = os.path.expanduser("~/.omlx/logs/server.log")
DECODE = 25.0  # 9B-8bit 实测 ~24-26 tok/s

pat = re.compile(r"Chat completion: (\d+) tokens in ([\d.]+)s \([\d.]+ tok/s\), prompt: (\d+)")

def follow():
    # 读全量后跟随新增行
    with open(LOG, "r", errors="ignore") as f:
        f.seek(0, os.SEEK_END)
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.5); continue
            m = pat.search(line)
            if not m: continue
            out, sec, prompt = int(m.group(1)), float(m.group(2)), int(m.group(3))
            prefill_sec = max(sec - out / DECODE, 0.01)
            eff = prompt / prefill_sec
            flag = "🔥命中" if eff > 600 else ("冷" if eff < 300 else "温")
            print(f"prompt={prompt:6d} 耗时={sec:6.1f}s 有效prefill={eff:7.0f} tok/s [{flag}]")

if __name__ == "__main__":
    print(f"监听 {LOG} (decode≈{DECODE} tok/s) ... Ctrl+C 退出")
    try:
        follow()
    except KeyboardInterrupt:
        pass
