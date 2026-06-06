import { AudioMenuBody } from "@/components/player/audio-menu";
import type { TrackInfo } from "@/lib/player/bridge";

export type AudioModalState = {
  tracks: TrackInfo[];
  selectedId: string | null;
  delaySec: number;
  engine: "html5" | "mpv";
};

type Props = {
  state: AudioModalState;
  onSelect: (id: string) => void;
  onDelay: (sec: number) => void;
  onClose: () => void;
};

export function AudioModal({ state, onSelect, onDelay, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 flex items-end justify-end"
      style={{ background: "transparent" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="m-3 mb-[110px] mr-[160px] flex max-h-[480px] w-[340px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/97 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-xl [--color-edge:rgba(255,255,255,0.18)] [--color-edge-soft:rgba(255,255,255,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <AudioMenuBody
          tracks={state.tracks}
          selectedId={state.selectedId}
          delaySec={state.delaySec}
          engine={state.engine}
          onSelect={onSelect}
          onDelay={onDelay}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
