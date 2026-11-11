"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { frameSourceRect, SHOT_COUNT } from "@/lib/photo-booth";
import { redirectIfUnauthorized } from "@/lib/unauthorized";

type BoothPhase =
  | { kind: "opening" }
  | { kind: "live" }
  | { kind: "count"; shot: number; n: number }
  | { kind: "flash"; shot: number }
  | { kind: "saving" }
  | { kind: "error"; message: string };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function filledShots(phase: BoothPhase): number {
  if (phase.kind === "count") return phase.shot - 1;
  if (phase.kind === "flash") return phase.shot;
  if (phase.kind === "saving") return SHOT_COUNT;
  return 0;
}

async function grabFrame(video: HTMLVideoElement, frame: HTMLDivElement): Promise<Blob | null> {
  if (video.videoWidth < 2 || video.videoHeight < 2) return null;
  const videoBox = video.getBoundingClientRect();
  const frameBox = frame.getBoundingClientRect();
  const source = frameSourceRect({
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    elementWidth: videoBox.width,
    elementHeight: videoBox.height,
    frameX: frameBox.left - videoBox.left,
    frameY: frameBox.top - videoBox.top,
    frameWidth: frameBox.width,
    frameHeight: frameBox.height,
    mirrored: true,
  });
  if (!source) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 960;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, source.sx, source.sy, source.sw, source.sh, 0, 0, canvas.width, canvas.height);
  context.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.86);
  });
}

export function PhotoBooth({
  clientId,
  onClose,
  onSaved,
}: {
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(false);
  const runningRef = useRef(false);
  const [held, setHeld] = useState<Blob[] | null>(null);
  const [phase, setPhase] = useState<BoothPhase>({ kind: "opening" });

  useEffect(() => {
    cancelRef.current = false;
    let stream: MediaStream | null = null;
    let stopped = false;
    const video = videoRef.current;

    async function openCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase({ kind: "error", message: copy.cameraBlocked });
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        });
        if (stopped || !video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        if (!stopped) setPhase({ kind: "live" });
      } catch {
        if (!stopped) setPhase({ kind: "error", message: copy.cameraBlocked });
      }
    }

    void openCamera();
    return () => {
      stopped = true;
      cancelRef.current = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, []);

  async function upload(shots: Blob[]): Promise<boolean> {
    const body = new FormData();
    shots.forEach((shot, index) => {
      body.append("shot", shot, `${index + 1}.jpg`);
    });
    try {
      const response = await fetch(`/api/clienti/${clientId}/foto`, { method: "POST", body });
      if (redirectIfUnauthorized(response.status)) return false;
      return response.ok;
    } catch {
      return false;
    }
  }

  async function run() {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || phase.kind !== "live" || runningRef.current) return;
    runningRef.current = true;
    setHeld(null);
    const taken: Blob[] = [];
    for (let shot = 1; shot <= SHOT_COUNT; shot += 1) {
      for (let n = 3; n >= 1; n -= 1) {
        if (cancelRef.current) return;
        setPhase({ kind: "count", shot, n });
        await wait(1000);
      }
      if (cancelRef.current) return;
      const blob = await grabFrame(video, frame);
      if (!blob) {
        runningRef.current = false;
        setPhase({ kind: "error", message: copy.photoFailed });
        return;
      }
      taken.push(blob);
      setPhase({ kind: "flash", shot });
      await wait(280);
    }
    if (cancelRef.current) return;
    setHeld(taken);
    setPhase({ kind: "saving" });
    const saved = await upload(taken);
    if (cancelRef.current) return;
    if (!saved) {
      runningRef.current = false;
      setPhase({ kind: "error", message: copy.photoFailed });
      return;
    }
    onSaved();
  }

  async function retry() {
    if (!held || held.length !== SHOT_COUNT || runningRef.current) return;
    runningRef.current = true;
    setPhase({ kind: "saving" });
    const saved = await upload(held);
    if (cancelRef.current) return;
    if (!saved) {
      runningRef.current = false;
      setPhase({ kind: "error", message: copy.photoFailed });
      return;
    }
    onSaved();
  }

  const count = phase.kind === "count" ? phase.n : null;
  const filled = filledShots(phase);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#14110e] text-[#f3efe6]" role="dialog" aria-modal="true" aria-label={copy.reference}>
      <div className="relative min-h-0 flex-1">
        <video ref={videoRef} className="absolute inset-0 h-full w-full scale-x-[-1] object-cover" playsInline muted autoPlay />
        <div
          ref={frameRef}
          className="booth-frame pointer-events-none absolute top-[46%] left-1/2 aspect-[3/4] w-[min(78%,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-[#e7d7b1]"
        />
        {count !== null ? (
          <p key={`${phase.kind === "count" ? phase.shot : 0}-${count}`} className="booth-pop pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[7rem] leading-none text-white" aria-hidden="true">
            {count}
          </p>
        ) : null}
        <p className="sr-only" aria-live="assertive">
          {count !== null ? String(count) : phase.kind === "saving" ? copy.save : ""}
        </p>
        {phase.kind === "flash" ? <div className="pointer-events-none absolute inset-0 bg-white/80" /> : null}
      </div>
      <div className="flex flex-col gap-3 px-4 pt-3 pb-5">
        <div className="flex justify-center gap-2" aria-hidden="true">
          {Array.from({ length: SHOT_COUNT }, (_, index) => (
            <span key={index} className={index < filled ? "h-2.5 w-2.5 rounded-full bg-[#e7d7b1]" : "h-2.5 w-2.5 rounded-full bg-[#f3efe6]/30"} />
          ))}
        </div>
        {phase.kind === "live" || phase.kind === "opening" ? (
          <p className="text-center text-lg">{copy.frameHint}</p>
        ) : null}
        {phase.kind === "error" ? (
          <p className="text-center text-lg text-[#f0b7a4]" role="alert">
            {phase.message}
          </p>
        ) : null}
        {phase.kind === "saving" ? <p className="text-center text-lg">{copy.save}</p> : null}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={phase.kind === "saving"} className="min-h-14 flex-1 rounded-2xl border border-[#e7d7b1]/50 text-lg">
            {copy.close}
          </button>
          {phase.kind === "live" ? (
            <button type="button" onClick={() => void run()} className="min-h-14 flex-[2] rounded-2xl bg-[#f3efe6] text-lg text-[#1e1a16]">
              {copy.shootStart}
            </button>
          ) : null}
          {phase.kind === "error" && held?.length === SHOT_COUNT ? (
            <button type="button" onClick={() => void retry()} className="min-h-14 flex-[2] rounded-2xl bg-[#f3efe6] text-lg text-[#1e1a16]">
              {copy.save}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
