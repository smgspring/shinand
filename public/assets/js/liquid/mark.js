// 신앤 F&B 브랜드 마크: 손잡이가 달린 머그 실루엣 + 가운데 반짝임(별) 컷아웃.
// three.js 의 Shape 와 SVG 경로 양쪽에서 같은 윤곽을 쓰도록 "펜" 인터페이스로 그립니다.
// pen: { moveTo(x, y), lineTo(x, y), quadraticCurveTo(cx, cy, x, y), absarc(x, y, r, a0, a1, clockwise) }
// 좌표계는 y 가 위쪽인 수학 좌표, 대략 -1.1 ~ 1.8 범위입니다.

export const MUG = {
  left: -1.05,
  right: 0.95,
  top: 1.05,
  bottom: -1.05,
  radiusTop: 0.36,
  radiusBottom: 0.62,
  // 손잡이 호의 위·아래 끝이 몸통 모서리 호의 끝과 정확히 만나도록 맞춘 값입니다
  // (위: top - radiusTop = cy + outer = 0.69, 아래: bottom + radiusBottom = cy - outer = -0.43)
  handle: { cx: 0.95, cy: 0.13, outer: 0.56, inner: 0.28, holeOffset: 0.03 },
  sparkle: { cx: -0.06, cy: 0.0, r: 0.6 }
};

export const drawMugOutline = (pen) => {
  const { left, right, top, bottom, radiusTop: rt, radiusBottom: rb, handle } = MUG;
  pen.moveTo(left + rt, top);
  pen.lineTo(right - rt, top);
  pen.absarc(right - rt, top - rt, rt, Math.PI / 2, 0, true);
  // 손잡이 바깥쪽 호
  const hTop = handle.cy + handle.outer;
  pen.lineTo(right, hTop);
  pen.absarc(handle.cx, handle.cy, handle.outer, Math.PI / 2, -Math.PI / 2, true);
  pen.lineTo(right, bottom + rb);
  pen.absarc(right - rb, bottom + rb, rb, 0, -Math.PI / 2, true);
  pen.lineTo(left + rb, bottom);
  pen.absarc(left + rb, bottom + rb, rb, -Math.PI / 2, -Math.PI, true);
  pen.lineTo(left, top - rt);
  pen.absarc(left + rt, top - rt, rt, Math.PI, Math.PI / 2, true);
};

export const drawHandleHole = (pen) => {
  const { handle } = MUG;
  const hx = handle.cx + handle.holeOffset;
  pen.moveTo(hx + handle.inner, handle.cy);
  pen.absarc(hx, handle.cy, handle.inner, 0, Math.PI * 2, false);
};

// 오목한 네 변을 가진 반짝임 별
export const drawSparkle = (pen, cx = MUG.sparkle.cx, cy = MUG.sparkle.cy, r = MUG.sparkle.r, pinch = 0.07) => {
  const k = r * pinch;
  pen.moveTo(cx, cy + r);
  pen.quadraticCurveTo(cx + k, cy + k, cx + r, cy);
  pen.quadraticCurveTo(cx + k, cy - k, cx, cy - r);
  pen.quadraticCurveTo(cx - k, cy - k, cx - r, cy);
  pen.quadraticCurveTo(cx - k, cy + k, cx, cy + r);
};

// SVG 경로 문자열을 만드는 펜 (y 를 뒤집어 화면 좌표로 변환)
export const svgPen = (scale = 1, ox = 0, oy = 0) => {
  let d = "";
  let cur = [0, 0];
  const X = (x) => +(ox + x * scale).toFixed(2);
  const Y = (y) => +(oy - y * scale).toFixed(2);
  return {
    moveTo(x, y) { d += `M${X(x)} ${Y(y)}`; cur = [x, y]; },
    lineTo(x, y) { d += `L${X(x)} ${Y(y)}`; cur = [x, y]; },
    quadraticCurveTo(cx, cy, x, y) { d += `Q${X(cx)} ${Y(cy)} ${X(x)} ${Y(y)}`; cur = [x, y]; },
    absarc(x, y, r, a0, a1, clockwise) {
      const sx = x + Math.cos(a0) * r;
      const sy = y + Math.sin(a0) * r;
      if (Math.hypot(sx - cur[0], sy - cur[1]) > 1e-6) d += `L${X(sx)} ${Y(sy)}`;
      let sweep = a1 - a0;
      if (clockwise && sweep > 0) sweep -= Math.PI * 2;
      if (!clockwise && sweep < 0) sweep += Math.PI * 2;
      // 전체 원은 두 개의 반원으로 나눠 그립니다
      const steps = Math.abs(sweep) > Math.PI * 1.5 ? 2 : 1;
      for (let i = 1; i <= steps; i += 1) {
        const a = a0 + (sweep * i) / steps;
        const ex = x + Math.cos(a) * r;
        const ey = y + Math.sin(a) * r;
        const large = Math.abs(sweep / steps) > Math.PI ? 1 : 0;
        // 수학 좌표의 반시계 = 화면 좌표의 시계 방향 (y 반전)
        const sweepFlag = sweep > 0 ? 0 : 1;
        d += `A${+(r * scale).toFixed(2)} ${+(r * scale).toFixed(2)} 0 ${large} ${sweepFlag} ${X(ex)} ${Y(ey)}`;
        cur = [ex, ey];
      }
    },
    close() { d += "Z"; },
    get d() { return d; }
  };
};
