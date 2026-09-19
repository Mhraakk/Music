"use client";

/**
 * Shared WebGL surface for every Neuform shader skill.
 *
 * One fullscreen quad, one draw call per frame. The canvas only renders while
 * it is visible and the tab is focused, caps device pixel ratio, and falls back
 * to a static gradient when the user prefers reduced motion or WebGL is absent.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "../hooks";
import { VERTEX_SHADER, getFragmentShader } from "./shaders";

export type ShaderCanvasProps = {
  variant: string;
  className?: string;
  style?: CSSProperties;
  /** Overall brightness multiplier. */
  intensity?: number;
  /** Track the pointer and feed it to the shader (globes, dispersion). */
  interactive?: boolean;
  /** Upper bound for devicePixelRatio; lowered automatically on small screens. */
  maxDpr?: number;
  /** Accessible description; omitted means decorative. */
  label?: string;
};

/**
 * Browsers cap simultaneous WebGL contexts (Chrome drops the oldest at ~16).
 * Exceeding it silently breaks every canvas on the page, so the library keeps
 * its own budget and falls back to a static gradient beyond it.
 */
const MAX_LIVE_CONTEXTS = 8;
let liveContexts = 0;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[neuform] shader compile failed:", gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ShaderCanvas({
  variant,
  className = "",
  style,
  intensity = 1,
  interactive = false,
  maxDpr = 1.5,
  label,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (liveContexts >= MAX_LIVE_CONTEXTS) {
      setFailed(true);
      return;
    }

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      setFailed(true);
      return;
    }
    liveContexts += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      liveContexts -= 1;
    };

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, getFragmentShader(variant));
    const program = gl.createProgram();
    if (!vs || !fs || !program) {
      release();
      setFailed(true);
      return;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[neuform] program link failed:", gl.getProgramInfoLog(program));
      }
      release();
      setFailed(true);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uPointer = gl.getUniformLocation(program, "u_pointer");
    const uDir = gl.getUniformLocation(program, "u_dir");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");

    const pointer = { x: 0.5, y: 0.5 };
    const direction = document.documentElement.getAttribute("dir") === "rtl" ? -1 : 1;

    const dpr = () => {
      const base = Math.min(window.devicePixelRatio || 1, maxDpr);
      return window.innerWidth < 768 ? Math.min(base, 1.25) : base;
    };

    const resize = () => {
      const ratio = dpr();
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    const draw = (timeSeconds: number) => {
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, timeSeconds);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.uniform1f(uDir, direction);
      gl.uniform1f(uIntensity, intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // Reduced motion: render one representative frame and stop.
    if (reduced) {
      draw(12);
      return () => {
        gl.deleteProgram(program);
        gl.deleteBuffer(buffer);
        release();
      };
    }

    let raf = 0;
    let running = false;
    const start = performance.now();

    const loop = () => {
      draw((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting && !document.hidden ? play() : pause()),
      { threshold: 0 }
    );
    observer.observe(canvas);

    const onVisibility = () => (document.hidden ? pause() : undefined);
    document.addEventListener("visibilitychange", onVisibility);

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / Math.max(1, rect.width);
      pointer.y = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
    };
    if (interactive) canvas.addEventListener("pointermove", onPointerMove);

    const onResize = () => resize();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      pause();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      if (interactive) canvas.removeEventListener("pointermove", onPointerMove);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
      // Deliberately not calling WEBGL_lose_context here: a canvas can only ever
      // hand out one context, so losing it would poison the element if React
      // remounts this effect on the same canvas (StrictMode does exactly that).
      release();
    };
  }, [variant, intensity, interactive, maxDpr, reduced]);

  if (failed) {
    return (
      <div
        className={className}
        aria-hidden={label ? undefined : true}
        role={label ? "img" : undefined}
        aria-label={label}
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, rgba(232,160,106,0.22), transparent 62%), #0b0806",
          ...style,
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}

export default ShaderCanvas;
