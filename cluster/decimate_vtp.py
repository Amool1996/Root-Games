#!/usr/bin/env python3
"""
decimate_vtp.py - boil an OpenSimRoot roots*.vtp (ascii) down to a compact
JSON the CAFNR Root Architect game can animate.

Keeps, per root (polyline): points [x, y(depth), z], per-point birthday
(= simulation end time - rootSegmentAge), radius and root class.
Points are decimated (kept only every MIN_STEP cm along the root, endpoints
always kept) and coordinates rounded, so a ~100 MB vtp becomes a few hundred KB.

Usage:  python3 decimate_vtp.py input.vtp output.json [end_time=40]
Stdlib only - runs on the cluster login/compute nodes as-is.
"""
import sys, json, math, re

MIN_STEP = 0.6   # cm along the root between kept points
COORD_DP = 2     # decimals for coordinates (cm)
DAY_DP   = 1     # decimals for birthday (day)

def read_arrays(path, wanted):
    """Stream the ascii vtp and collect the numeric contents of the
    DataArray blocks whose Name= is in `wanted`."""
    data = {}
    current = None
    buf = []
    name_re = re.compile(r'Name="([^"]+)"')
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            if current is None:
                if "<DataArray" in line:
                    m = name_re.search(line)
                    if m and m.group(1) in wanted:
                        current = m.group(1)
                        buf = []
                        # values may start on the same line after the '>'
                        tail = line.split(">", 1)
                        if len(tail) == 2 and tail[1].strip():
                            buf.append(tail[1])
            else:
                if "</DataArray>" in line:
                    head = line.split("</DataArray>", 1)[0]
                    if head.strip():
                        buf.append(head)
                    data[current] = " ".join(buf)
                    current = None
                else:
                    buf.append(line)
    out = {}
    for k, s in data.items():
        out[k] = [float(v) for v in s.split()]
    return out

def main():
    if len(sys.argv) < 3:
        sys.exit("usage: decimate_vtp.py input.vtp output.json [end_time=40]")
    src, dst = sys.argv[1], sys.argv[2]
    end_time = float(sys.argv[3]) if len(sys.argv) > 3 else 40.0

    wanted = {"Position", "connectivity", "offsets",
              "rootSegmentAge", "rootRadius", "combinedRootClassID"}
    a = read_arrays(src, wanted)
    for k in wanted:
        if k not in a:
            sys.exit(f"ERROR: DataArray '{k}' not found in {src}")

    pos = a["Position"]
    npts = len(pos) // 3
    conn = [int(v) for v in a["connectivity"]]
    offs = [int(v) for v in a["offsets"]]
    age  = a["rootSegmentAge"]
    rad  = a["rootRadius"]
    cls  = [int(v) for v in a["combinedRootClassID"]]
    if not (len(age) == len(rad) == len(cls) == npts):
        sys.exit(f"ERROR: array length mismatch (npts={npts}, age={len(age)}, "
                 f"rad={len(rad)}, cls={len(cls)})")

    roots = []
    kept_pts = 0
    start = 0
    for end in offs:
        idx = conn[start:end]
        start = end
        if len(idx) < 2:
            continue
        # decimate: always keep first & last, else every MIN_STEP cm
        keep = [idx[0]]
        acc = 0.0
        for j in range(1, len(idx)):
            i0, i1 = idx[j-1], idx[j]
            dx = pos[3*i1]-pos[3*i0]; dy = pos[3*i1+1]-pos[3*i0+1]; dz = pos[3*i1+2]-pos[3*i0+2]
            acc += math.sqrt(dx*dx + dy*dy + dz*dz)
            if acc >= MIN_STEP or j == len(idx)-1:
                keep.append(i1)
                acc = 0.0
        pts = []
        for i in keep:
            birth = end_time - age[i]
            if birth < 0: birth = 0.0
            pts.append([round(pos[3*i], COORD_DP),
                        round(pos[3*i+1], COORD_DP),
                        round(pos[3*i+2], COORD_DP),
                        round(birth, DAY_DP),
                        round(rad[i], 3)])
        roots.append({"c": cls[keep[0]], "p": pts})
        kept_pts += len(pts)

    out = {"endTime": end_time, "nRoots": len(roots), "nPts": kept_pts,
           "roots": roots}
    with open(dst, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{src}: {npts} pts / {len(offs)} roots  ->  "
          f"{kept_pts} pts kept, wrote {dst}")

if __name__ == "__main__":
    main()
