/* Easing curves, entrance/exit animations, and looping emphasis animations.
 *
 * An entrance animation is a function f(p, ctx) with p in [0, 1]:
 *   p = 0  -> fully hidden / starting pose
 *   p = 1  -> resting pose (the layer as designed)
 * Exits reuse the same functions with p reversed, so every entrance can also be an exit.
 *
 * ctx = { index, count, rand(seed), size } describes the glyph group being animated.
 *
 * Returned state: { tx, ty, tz, rx, ry, rz, sx, sy, opacity, blur }
 *   translations are in "text heights" (1 = the font size), rotations in degrees,
 *   blur in "text heights" as well so it scales with the text.
 */
(function (global) {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  const Easing = {
    linear: (t) => t,
    easeOut: (t) => 1 - Math.pow(1 - t, 3),
    easeIn: (t) => t * t * t,
    easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    backOut: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    elasticOut: (t) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    bounceOut: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };

  const EASING_LABELS = {
    linear: 'Linear',
    easeOut: 'Ease out',
    easeIn: 'Ease in',
    easeInOut: 'Ease in-out',
    expoOut: 'Expo out',
    backOut: 'Overshoot',
    elasticOut: 'Elastic',
    bounceOut: 'Bounce',
  };

  function rest() {
    return { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, opacity: 1, blur: 0 };
  }

  /* Deterministic pseudo-random in [-1, 1] from a couple of integers. */
  function hashRand(a, b) {
    let h = (a * 374761393 + b * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    return ((h >>> 0) / 4294967295) * 2 - 1;
  }

  const inv = (p) => 1 - p;

  /* --- Entrance / exit animation library ------------------------------------ */
  const Animations = {
    none: {
      label: 'None',
      group: 'Simple',
      fn: () => rest(),
    },
    fade: {
      label: 'Fade',
      group: 'Simple',
      fn: (p) => Object.assign(rest(), { opacity: p }),
    },
    focus: {
      label: 'Focus (blur in)',
      group: 'Simple',
      fn: (p) => Object.assign(rest(), {
        opacity: clamp01(p * 1.6),
        blur: inv(p) * 0.35,
        sx: 1 + inv(p) * 0.18,
        sy: 1 + inv(p) * 0.18,
      }),
    },
    pop: {
      label: 'Pop',
      group: 'Simple',
      defaultEasing: 'backOut',
      fn: (p) => Object.assign(rest(), { sx: p, sy: p, opacity: clamp01(p * 3) }),
    },
    slideUp: {
      label: 'Slide up',
      group: 'Simple',
      fn: (p) => Object.assign(rest(), { ty: -inv(p) * 1.2, opacity: clamp01(p * 2) }),
    },
    slideDown: {
      label: 'Slide down',
      group: 'Simple',
      fn: (p) => Object.assign(rest(), { ty: inv(p) * 1.2, opacity: clamp01(p * 2) }),
    },
    slideLeft: {
      label: 'Slide from right',
      group: 'Simple',
      fn: (p) => Object.assign(rest(), { tx: inv(p) * 2.5, opacity: clamp01(p * 2) }),
    },
    slideRight: {
      label: 'Slide from left',
      group: 'Simple',
      fn: (p) => Object.assign(rest(), { tx: -inv(p) * 2.5, opacity: clamp01(p * 2) }),
    },
    rise: {
      label: 'Rise (soft)',
      group: 'Simple',
      fn: (p) => Object.assign(rest(), { ty: -inv(p) * 0.35, opacity: p, blur: inv(p) * 0.08 }),
    },
    typewriter: {
      label: 'Typewriter',
      group: 'Simple',
      forceSplit: 'char',
      forceEasing: 'linear',
      fn: (p) => Object.assign(rest(), { opacity: p > 0.001 ? 1 : 0 }),
    },
    stretch: {
      label: 'Stretch',
      group: 'Simple',
      fn: (p) => Object.assign(rest(), { sx: 1 + inv(p) * 2.5, opacity: p, blur: inv(p) * 0.2 }),
    },

    zoomThrough: {
      label: 'Fly from camera',
      group: 'Complex',
      defaultEasing: 'expoOut',
      fn: (p) => Object.assign(rest(), {
        tz: inv(p) * 3.5,
        opacity: clamp01(p * 2.2),
        blur: inv(p) * 0.18,
      }),
    },
    zoomAway: {
      label: 'Zoom from far',
      group: 'Complex',
      defaultEasing: 'expoOut',
      fn: (p) => Object.assign(rest(), {
        tz: -inv(p) * 6,
        opacity: clamp01(p * 2),
        blur: inv(p) * 0.15,
      }),
    },
    flipX: {
      label: 'Flip (horizontal axis)',
      group: 'Complex',
      fn: (p) => Object.assign(rest(), { rx: -inv(p) * 90, opacity: clamp01(p * 2) }),
    },
    flipY: {
      label: 'Flip (vertical axis)',
      group: 'Complex',
      fn: (p) => Object.assign(rest(), { ry: inv(p) * 90, opacity: clamp01(p * 2) }),
    },
    swing: {
      label: 'Swing in',
      group: 'Complex',
      defaultEasing: 'elasticOut',
      fn: (p) => Object.assign(rest(), { rz: -inv(p) * 25, ty: -inv(p) * 0.4, opacity: clamp01(p * 3) }),
    },
    spin: {
      label: 'Spin in',
      group: 'Complex',
      defaultEasing: 'expoOut',
      fn: (p) => Object.assign(rest(), { rz: inv(p) * 180, sx: 0.2 + p * 0.8, sy: 0.2 + p * 0.8, opacity: clamp01(p * 2) }),
    },
    drop: {
      label: 'Drop & bounce',
      group: 'Complex',
      defaultEasing: 'bounceOut',
      fn: (p) => Object.assign(rest(), { ty: inv(p) * 2.5, opacity: 1 }),
    },
    tumble: {
      label: 'Tumble',
      group: 'Complex',
      defaultEasing: 'expoOut',
      fn: (p, c) => Object.assign(rest(), {
        rx: inv(p) * 120 * hashRand(c.index, 1),
        ry: inv(p) * 120 * hashRand(c.index, 2),
        rz: inv(p) * 60 * hashRand(c.index, 3),
        tz: inv(p) * 1.5,
        opacity: clamp01(p * 2),
      }),
    },
    scatter: {
      label: 'Scatter & assemble',
      group: 'Complex',
      defaultEasing: 'expoOut',
      fn: (p, c) => Object.assign(rest(), {
        tx: inv(p) * 3 * hashRand(c.index, 11),
        ty: inv(p) * 2 * hashRand(c.index, 12),
        tz: inv(p) * 1.2 * (hashRand(c.index, 13) + 1),
        rz: inv(p) * 90 * hashRand(c.index, 14),
        opacity: clamp01(p * 2),
        blur: inv(p) * 0.15,
      }),
    },
    wave: {
      label: 'Wave',
      group: 'Complex',
      defaultEasing: 'backOut',
      fn: (p) => Object.assign(rest(), { ty: inv(p) * 0.8, rz: inv(p) * 15, opacity: clamp01(p * 2) }),
    },
    hinge: {
      label: 'Hinge (top edge)',
      group: 'Complex',
      defaultEasing: 'backOut',
      fn: (p) => Object.assign(rest(), { rx: inv(p) * 100, ty: 0, opacity: clamp01(p * 2), pivotY: 0.5 }),
    },
    glitch: {
      label: 'Glitch',
      group: 'Complex',
      forceEasing: 'linear',
      fn: (p, c) => {
        const s = rest();
        if (p >= 1) return s;
        const k = Math.floor(p * 12);
        const on = hashRand(c.index + k, 21) > -0.3;
        s.opacity = on ? 1 : 0;
        s.tx = hashRand(c.index + k, 22) * inv(p) * 0.4;
        s.sx = 1 + hashRand(c.index + k, 23) * inv(p) * 0.6;
        return s;
      },
    },
    wipeUp: {
      label: 'Push from below',
      group: 'Complex',
      defaultEasing: 'expoOut',
      fn: (p) => Object.assign(rest(), { ty: -inv(p) * 1, rx: inv(p) * 60, opacity: clamp01(p * 2.5) }),
    },
  };

  /* --- Looping emphasis animations (applied on top while visible) ------------ */
  const Loops = {
    none: { label: 'None', fn: () => rest() },
    float: {
      label: 'Float',
      fn: (t, c) => Object.assign(rest(), {
        ty: Math.sin(t * 1.4 + c.index * 0.7) * 0.06,
        tx: Math.cos(t * 0.9 + c.index) * 0.03,
      }),
    },
    pulse: {
      label: 'Pulse',
      fn: (t, c) => {
        const s = 1 + Math.sin(t * 3 + c.index * 0.4) * 0.04;
        return Object.assign(rest(), { sx: s, sy: s });
      },
    },
    wobble: {
      label: 'Wobble',
      fn: (t, c) => Object.assign(rest(), { rz: Math.sin(t * 2.2 + c.index) * 4 }),
    },
    sway3d: {
      label: 'Perspective sway',
      fn: (t) => Object.assign(rest(), { ry: Math.sin(t * 1.1) * 14, rx: Math.cos(t * 0.8) * 6 }),
    },
    spinY: {
      label: 'Spin (vertical axis)',
      fn: (t) => Object.assign(rest(), { ry: (t * 90) % 360 }),
    },
    shake: {
      label: 'Shake',
      fn: (t, c) => Object.assign(rest(), {
        tx: hashRand(Math.floor(t * 30), c.index) * 0.04,
        ty: hashRand(Math.floor(t * 30) + 7, c.index) * 0.04,
      }),
    },
    bounce: {
      label: 'Bounce',
      fn: (t, c) => Object.assign(rest(), { ty: Math.abs(Math.sin(t * 4 + c.index * 0.5)) * 0.15 }),
    },
    flicker: {
      label: 'Flicker',
      fn: (t, c) => Object.assign(rest(), { opacity: hashRand(Math.floor(t * 18), c.index) > -0.7 ? 1 : 0.35 }),
    },
    breatheBlur: {
      label: 'Breathing focus',
      fn: (t) => Object.assign(rest(), { blur: (Math.sin(t * 1.5) + 1) * 0.04 }),
    },
  };

  /* Combine a base state with an additive/multiplicative emphasis state. */
  function combine(a, b) {
    return {
      tx: a.tx + b.tx, ty: a.ty + b.ty, tz: a.tz + b.tz,
      rx: a.rx + b.rx, ry: a.ry + b.ry, rz: a.rz + b.rz,
      sx: a.sx * b.sx, sy: a.sy * b.sy,
      opacity: a.opacity * b.opacity,
      blur: a.blur + b.blur,
      pivotY: a.pivotY || b.pivotY || 0,
    };
  }

  /**
   * Compute the animation state of one glyph group at local time `t` (seconds since layer start).
   * layer.anim = { in: {type, duration, easing, stagger}, out: {type, duration, easing, stagger}, loop: {type, speed} }
   */
  function evaluate(layer, t, layerDuration, ctx) {
    const a = layer.anim;
    const inDef = Animations[a.in.type] || Animations.none;
    const outDef = Animations[a.out.type] || Animations.none;
    const n = Math.max(1, ctx.count);

    // Entrance
    const inStagger = a.in.stagger || 0;
    const inStart = ctx.index * inStagger;
    const inDur = Math.max(0.001, a.in.duration);
    let pIn = clamp01((t - inStart) / inDur);
    const inEase = Easing[inDef.forceEasing || a.in.easing || inDef.defaultEasing || 'easeOut'] || Easing.easeOut;
    pIn = inEase(pIn);

    // Exit: last group finishes exactly at layer end; stagger in the same order as the entrance.
    const outStagger = a.out.stagger || 0;
    const outDur = Math.max(0.001, a.out.duration);
    const outTotal = outDur + outStagger * (n - 1);
    const outStart = layerDuration - outTotal + ctx.index * outStagger;
    let pOut = clamp01((t - outStart) / outDur);
    const outEase = Easing[outDef.forceEasing || a.out.easing || outDef.defaultEasing || 'easeIn'] || Easing.easeIn;
    pOut = outEase(pOut);

    let state;
    if (a.in.type === 'none' && a.out.type === 'none') {
      state = rest();
    } else if (pOut > 0 && outDef !== Animations.none) {
      state = outDef.fn(1 - pOut, ctx);
    } else {
      state = inDef.fn(pIn, ctx);
    }

    const loopDef = Loops[a.loop && a.loop.type] || Loops.none;
    if (loopDef !== Loops.none) {
      const speed = (a.loop.speed || 1);
      state = combine(state, loopDef.fn(t * speed, ctx));
    }
    return state;
  }

  global.Anim = { Easing, EASING_LABELS, Animations, Loops, evaluate, rest, hashRand, combine };
})(window);
